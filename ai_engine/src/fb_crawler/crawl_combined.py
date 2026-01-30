from playwright.sync_api import sync_playwright
import os
import time
import csv
from bs4 import BeautifulSoup
import re
import random
import threading
import queue
import joblib  # Thêm thư viện này
import pandas as pd # Thêm thư viện này để xử lý input cho model nếu cần
from underthesea import word_tokenize
def vietnamese_tokenizer(text):
    # word_tokenize trả về list: ['Học máy', 'là', ...]
    tokens = word_tokenize(text)
    return tokens

# --- IMPORT LOGIC TỪ CÁC FILE KHÁC (Hoặc copy hàm vào đây nếu muốn gộp 1 file) ---
# Giả sử bạn để các file data_preprocessing.py và ml_model_svc.joblib cùng thư mục
try:
    from data_preprocessing import rule_based_filtering, preprocess_text
except ImportError:
    # Fallback nếu không import được, copy hàm vào đây để chạy độc lập
    def preprocess_text(text):
        text = text.lower()
        text = re.sub(r'[^\w\s]', ' ', text)
        return text

    def rule_based_filtering(text):
        # (Copy logic từ file data_preprocessing.py của bạn vào đây để đảm bảo chạy)
        # Tạm thời return 1 để test luồng
        return 1 

# --- CONFIG ---
FB_EMAIL = "huy11072k6@gmail.com"
FB_PASS = "huy12012005"
GROUP_ID = "udnvku"
BASE_URL = f"https://m.facebook.com/groups/{GROUP_ID}"
STATE = "fb_state_mbasic.json"
OUTPUT_FILE = "daihocviethan_CLEAN.csv" # File kết quả sạch
TRASH_FILE = "daihocviethan_TRASH.csv"   # File rác (để kiểm tra xem model có lọc nhầm không)
MODEL_PATH = 'ml_model_svc.joblib'
NUM_POSTS_TO_SCRAPE = 1200
USER_AGENT = "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1"

LINK_QUEUE = queue.Queue()
ready_to_scrape_next = threading.Event()
ready_to_scrape_next.set() 
STOP_EVENT = threading.Event()

# --- LOAD MODEL (Global) ---
print(">>> Đang load AI Model...")
try:
    AI_MODEL = joblib.load(MODEL_PATH)
    print(">>> Load Model thành công!")
except Exception as e:
    print(f"!!! Lỗi load model: {e}. Sẽ chạy chế độ chỉ cào (không lọc ML).")
    AI_MODEL = None

# ... [GIỮ NGUYÊN CÁC HÀM: perform_login, perform_jiggle_scroll, switch_to_newest_mode, setup_clipboard_hook, collect_links_worker, extract_post_data, process_post_page] ...
# (Để tiết kiệm không gian, tôi không paste lại các hàm cào (crawl) ở trên vì chúng không thay đổi logic, 
# CHỈ CẦN THAY ĐỔI HÀM scrape_feed_hook BÊN DƯỚI)
def perform_login(page, context):
    """Đăng nhập và lưu trạng thái"""
    print(">>>Đang kiểm tra trạng thái đăng nhập...")
    try:
        page.goto("https://m.facebook.com/", wait_until="domcontentloaded")
        time.sleep(10)
        
        if "m_timeline" in page.content() or "Tạo tin" in page.content() or "Bảng tin" in page.title():
            print(">>>Đã có session đăng nhập cũ!")
            return True
        
        print("--- Tiến hành đăng nhập mới ---")
        if page.locator("input[name='email']").is_visible():
            page.fill("input[name='email']", FB_EMAIL)
            page.fill("input[name='pass']", FB_PASS)
            page.click("button[name='login']")
            page.wait_for_timeout(8000)
        context.storage_state(path=STATE)
        return True
    except Exception as e:
        print(f"Lỗi đăng nhập: {e}")
        return False
    
def perform_jiggle_scroll(page):
    print("      >>> 🔄 Đang dao động (Lên -> Xuống) để mồi bài viết mới...")
    scroll_up = random.randint(400, 700)
    page.mouse.wheel(0, -scroll_up) 
    time.sleep(random.uniform(2.0, 3.0)) # Đợi như đang đọc lại tin cũ
    scroll_down = scroll_up + random.randint(400, 600)
    page.mouse.wheel(0, scroll_down)
    time.sleep(random.uniform(2.5, 4.0)) # Đợi loading xoay xoay

def switch_to_newest_mode(page):    
    try:
        sort_btn = page.locator('span:has-text("SẮP XẾP")').first 
        if sort_btn.is_visible():
            print(">>> Đã thấy nút 'SẮP XẾP'. Đang click...")
            sort_btn.click(force=True) 
            time.sleep(2) 
            newest_option = page.locator('span:has-text("Gần đây nhất"), span:has-text("Bài viết mới"), span:has-text("Mới nhất")').first
            
            if newest_option.is_visible():
                print(f">>> Tìm thấy tùy chọn: {newest_option.inner_text()}")
                newest_option.click()
                print(">>> Đã chọn 'Mới nhất'. Đang chờ tải lại trang...")
                time.sleep(5) 
                return True
            else:
                print(">>> Menu đã mở nhưng không thấy tùy chọn 'Gần đây nhất'.")
                page.keyboard.press("Escape")
        else:

            if page.locator('span:has-text("Bài viết mới"), span:has-text("Gần đây nhất")').is_visible():
                print(">>> Đã ở sẵn chế độ Mới nhất.")
                return True
            
            print(">>> ⚠️ Không tìm thấy nút 'SẮP XẾP'.")
            
    except Exception as e:
        print(f"⚠️ Lỗi khi chuyển chế độ sắp xếp: {e}")
    
    return False
def setup_clipboard_hook(page):
    """Ghi đè hàm clipboard để bắt link từ nút Share"""
    page.evaluate("""
        window.captured_link_from_fb = "N/A";
        if (!navigator.clipboard) { navigator.clipboard = {}; }
        navigator.clipboard.writeText = function(text) {
            window.captured_link_from_fb = text;
            return Promise.resolve();
        };
    """)
def collect_links_worker():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=False, 
            channel="chrome",
            args=["--disable-notifications"]
        )
        context = browser.new_context(
            storage_state=STATE if os.path.exists(STATE) else None,
            user_agent=USER_AGENT,
            viewport={'width': 375, 'height': 812},
            locale='vi-VN'
        )
        page = context.new_page()
        print(f"\n=== GIAI ĐOẠN 1: THU THẬP {NUM_POSTS_TO_SCRAPE} LINKS ===")
        page.goto(BASE_URL, wait_until="domcontentloaded")
        time.sleep(3)
        seen_links = set()
        scroll_attempts = 0
        switch_to_newest_mode(page) 
        
        while len(seen_links) < NUM_POSTS_TO_SCRAPE: # Chỉ dừng khi đủ link
            if STOP_EVENT.is_set(): break # Thoát nếu người dùng nhấn Ctrl+C
            ready_to_scrape_next.wait() # Chờ đèn xanh
            
            share_button = page.locator(
                'div[role="button"][aria-label*="share"]:not([data-processed]), '
                'div[role="button"][aria-label*="Chia sẻ"]:not([data-processed])'
            ).first 
            
            try:
                if not share_button.is_visible(timeout=2000):
                    raise Exception("Không thấy nút")
            except:
                print(f">>> Không thấy bài mới... Đang thử gỡ kẹt ({len(seen_links)}/{NUM_POSTS_TO_SCRAPE})")
                perform_jiggle_scroll(page)
                scroll_attempts += 1
                
                # --- PHẦN THAY ĐỔI: LƯU DEBUG VÀ TẠM DỪNG ---
                if scroll_attempts > 15: 
                    print("\n!!! PHÁT HIỆN KẸT: Đã thử cuộn 15 lần nhưng không thấy bài mới.")
                    
                    # 1. Tạo thư mục debug
                    if not os.path.exists("debug"):
                        os.makedirs("debug")
                    
                    timestamp = int(time.time())
                    
                    # 2. Lưu Ảnh màn hình
                    try:
                        screenshot_path = f"debug/stuck_{timestamp}.png"
                        page.screenshot(path=screenshot_path)
                        print(f"   [DEBUG] Đã lưu ảnh: {screenshot_path}")
                    except Exception as e:
                        print(f"   [DEBUG] Lỗi lưu ảnh: {e}")

                    # 3. Lưu HTML
                    try:
                        html_path = f"debug/stuck_{timestamp}.html"
                        with open(html_path, "w", encoding="utf-8") as f:
                            f.write(page.content())
                        print(f"   [DEBUG] Đã lưu HTML: {html_path}")
                    except Exception as e:
                        print(f"   [DEBUG] Lỗi lưu HTML: {e}")

                    # 4. Tạm dừng chờ người dùng
                    print(">>> 🛑 ĐANG TẠM DỪNG: Hãy mở trình duyệt, cuộn tay hoặc gỡ lỗi (captcha/popup).")
                    input(">>> 👉 Sau khi xử lý xong, hãy quay lại đây và nhấn ENTER để tiếp tục...")
                    
                    # 5. Reset bộ đếm để chạy tiếp
                    scroll_attempts = 0
                    print(">>> 🚀 Tiếp tục chạy...")
                # --------------------------------------------
                
                continue

            scroll_attempts = 0
            try:
                share_button.scroll_into_view_if_needed()
                time.sleep(0.5)
                page.evaluate("window.captured_link_from_fb = 'N/A'")
                share_button.click(timeout=3000)
                time.sleep(1.5)
                
                copy_btn = page.locator(
                    'div[aria-label="Sao chép liên kết"], '
                    'div[aria-label="Copy link"], '
                    'span:has-text("Sao chép liên kết")'
                ).first
                
                if copy_btn.is_visible(timeout=2000):
                    setup_clipboard_hook(page)
                    copy_btn.click()
                    time.sleep(3)
                    link = page.evaluate("window.captured_link_from_fb")
                    
                    if link != "N/A" and link not in seen_links:
                        clean_link = link.split('?')[0]
                        LINK_QUEUE.put(clean_link)
                        seen_links.add(clean_link)
                        print(f"Link {len(seen_links)}: {clean_link}")
                        ready_to_scrape_next.clear() 
                    else:
                        print(f" Click copy rồi nhưng không bắt được link (Link={link})")
                    
                    page.keyboard.press("Escape")
                else:
                    print("Không thấy nút 'Sao chép liên kết', bỏ qua.")
                    page.mouse.click(10, 10)
                
                share_button.evaluate("el => el.setAttribute('data-processed', 'true')")
            
            except Exception as e:
                try:
                    share_button.evaluate("el => el.setAttribute('data-processed', 'true')")
                except:
                    pass 
                continue
                
        LINK_QUEUE.put(None) 
        browser.close()
def clean_fb_text(text):
    """Làm sạch text từ Facebook"""
    if not text:
        return ""
    # Xóa emoji/icon unicode private use area
    text = re.sub(r'[\uE000-\uF8FF]|[\U000F0000-\U0010FFFF]', '', text)
    # Xóa invisible chars
    text = re.sub(r'[\u200e\u200f\u202a-\u202e\u200b-\u200d\ufeff]', '', text)
    # Normalize whitespace
    text = re.sub(r'\s+', ' ', text)
    return text.strip()
def save_debug_html(page, index):
    """Lưu source HTML để debug nếu cào sai"""
    if not os.path.exists(DEBUG_FOLDER):
        os.makedirs(DEBUG_FOLDER)
    filename = f"{DEBUG_FOLDER}/post_{index}.html"
    with open(filename, "w", encoding="utf-8") as f:
        f.write(page.content())
def extract_post_data(html_content, url):
    """
    Trích xuất dữ liệu bài post từ HTML
    
    Args:
        html_content: Nội dung HTML của trang
        url: URL bài post (dùng làm link)
    
    Returns:
        dict: {link, content, image_url, time}
    """
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # ==================================================
    # BƯỚC 1: LẤY TẤT CẢ NATIVE-TEXT BLOCKS
    # ==================================================
    native_texts = soup.find_all('div', class_='native-text')
    
    if len(native_texts) < 7:
        return {
            "link": url,
            "content": "Error: HTML structure invalid",
            "image_url": "N/A",
            "time": "N/A"
        }
    
    # ==================================================
    # BƯỚC 2: XÁC ĐỊNH THỜI GIAN POST (index 4)
    # ==================================================
    # Pattern thời gian: "X giờ", "Y ngày", "Z tuần", "11 tháng 1"
    time_pattern = re.compile(
        r'(\d{1,2})\s+(giờ|phút|ngày|tuần|tháng|năm)'
        r'|'  # HOẶC
        r'(\d{1,2}\s+tháng\s+\d{1,2})'  # "11 tháng 1"
    )
    
    post_time = "N/A"
    author_block = clean_fb_text(native_texts[4].get_text())
    
    # Tìm thời gian trong author block
    time_match = time_pattern.search(author_block)
    if time_match:
        # Lấy toàn bộ match (bao gồm cả "11 tháng 1")
        post_time = time_match.group(0)
    
    # ==================================================
    # BƯỚC 3: LẤY CONTENT (bắt đầu từ index 6)
    # ==================================================
    # Content luôn bắt đầu tại index 6
    # Kết thúc khi gặp:
    # - "Phù hợp nhất"
    # - "Chưa có bình luận nào"
    # - "Thích" + "Bình luận" (reaction buttons)
    
    stop_keywords = {
        "Phù hợp nhất",
        "Chưa có bình luận nào", 
        "Hãy là người đầu tiên bình luận",
        "Thích",
        "Bình luận",
        "Chia sẻ"
    }
    
    content_parts = []
    
    # Bắt đầu từ index 6
    for idx in range(6, len(native_texts)):
        text = clean_fb_text(native_texts[idx].get_text())
        
        # Skip empty
        if not text:
            continue
        
        # STOP nếu gặp keyword
        if text in stop_keywords:
            break
        
        # Skip số đếm reaction (chỉ 1-2 chữ số)
        if re.match(r'^\d{1,2}$', text):
            continue
        
        # Skip "Xem thêm" / "Ẩn bớt"
        if text in ["Xem thêm", "Ẩn bớt"]:
            continue
        
        # Thêm vào content
        content_parts.append(text)
    
    # Ghép content
    full_content = " ".join(content_parts) if content_parts else "Không có nội dung"
    
    # ==================================================
    # BƯỚC 4: LẤY ẢNH (ảnh đầu tiên TRƯỚC comment section)
    # ==================================================
    post_image = "N/A"
    
    # Tìm index của comment section (đã tìm ở bước 3)
    comment_start_idx = None
    for idx in range(6, len(native_texts)):
        text = clean_fb_text(native_texts[idx].get_text())
        if text in stop_keywords:
            comment_start_idx = idx
            break
    
    if comment_start_idx is None:
        comment_start_idx = 999999  # Rất lớn nếu không tìm thấy
    
    # Tìm ảnh
    imgs = soup.find_all('img', src=re.compile(r'scontent'))
    
    for img in imgs:
        src = img.get('src', '')
        
        # Bỏ qua avatar/icon nhỏ
        is_small = any(size in src for size in [
            'p48x48', 'p50x50', 'p75x75', 
            'p130x130', 'p29x29', 'p30x30', 'p38x38'
        ])
        if is_small:
            continue
        
        # Bỏ qua static icons
        is_static = any(marker in src for marker in ['static_c', 'rsrc.php'])
        if is_static:
            continue
        
        # Kiểm tra xem ảnh có nằm TRƯỚC comment section không
        # Bằng cách tính số native-text blocks trước ảnh
        parent = img
        native_before_img = 0
        
        for _ in range(20):
            parent = parent.parent if parent and hasattr(parent, 'parent') else None
            if not parent:
                break
            prev_siblings = parent.find_all_previous('div', class_='native-text')
            if prev_siblings:
                native_before_img = len(prev_siblings)
                break
        
        # Chỉ lấy ảnh TRƯỚC comment section
        if native_before_img < comment_start_idx:
            post_image = src
            break
    
    # ==================================================
    # RETURN KẾT QUẢ
    # ==================================================
    return {
        "link": url,
        "content": full_content,
        "image_url": post_image,
        "time": post_time
    }


def process_post_page(page, url):
    """
    Wrapper để tương thích với code cũ (dùng playwright page)
    
    Args:
        page: Playwright page object
        url: URL bài post
    
    Returns:
        dict: {link, content, image_url, time}
    """
    import time
    import random
    
    print(f"\n=== CÀO BÀI VIẾT V2 (BẤT BIẾN) ===")
    post_id = url.split('/')[-2] if '/' in url else None
    print(f"Đang xử lý: {post_id}...", end=" ")
    #save_debug_html(page,post_id)

    
    try:
        # Load trang
        page.goto(url, wait_until="networkidle")
        time.sleep(3)  # Giảm thời gian chờ (tối ưu)
        
        # Lấy HTML
        html_content = page.content()
        
        # Trích xuất dữ liệu
        result = extract_post_data(html_content, url)
        
        # Log kết quả
        print(f"[{result['time']}] {result['content'][:40]}... | Ảnh: {'✅' if result['image_url'] != 'N/A' else '❌'}")
        
        # Delay random
        time.sleep(random.uniform(2, 4))
        
        return result
        
    except Exception as e:
        print(f"Lỗi: {e}")
        return {
            "link": url,
            "content": "Error",
            "image_url": "N/A",
            "time": "N/A"
        }

def check_post_quality(content):
    """
    Pipeline lọc bài viết:
    Input: content raw
    Output: True (Giữ lại), False (Loại bỏ)
    """
    if not content or len(content.strip()) < 10: # Lọc bài quá ngắn hoặc rỗng
        return False, "Too short/Empty"

    # Bước 1: Rule-based Filtering
    # Lưu ý: rule_based_filtering trả về 1 (Giữ) hoặc 0 (Bỏ)
    is_pass_rule = rule_based_filtering(content)
    if is_pass_rule == 0:
        return False, "Rule-based Filtered"

    # Bước 2: AI Model Filtering
    if AI_MODEL:
        try:
            # Preprocess trước khi đưa vào model
            clean_content = preprocess_text(content)
            
            # Model predict thường nhận vào List/Iterable
            # Dự đoán: Trả về array, lấy phần tử đầu tiên
            prediction = AI_MODEL.predict([clean_content])[0]
            
            # Giả định Label model: 1 (Valid/Lost-Found), 0 (Trash)
            # Trong file inference.py bạn có đoạn replace(2, 1), nên output mong đợi là 1.
            if prediction == 1:
                return True, "AI Accepted"
            else:
                return False, "AI Rejected"
        except Exception as e:
            print(f"Lỗi khi predict AI: {e}")
            # Nếu lỗi model, tạm thời giữ lại bài để check tay sau
            return True, "Model Error (Kept)"
    
    return True, "No Model (Kept)"

def scrape_feed_hook():
    """Luồng xử lý: Lấy link -> Cào content -> Lọc AI -> Lưu file"""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, channel="chrome", args=["--disable-notifications"])
        context = browser.new_context(
            storage_state=STATE if os.path.exists(STATE) else None,
            user_agent=USER_AGENT,
            viewport={'width': 375, 'height': 812},
            locale='vi-VN'
        )
        page = context.new_page()
        
        # Mở 2 file: 1 file sạch, 1 file rác (để debug giai đoạn đầu)
        f_clean = open(OUTPUT_FILE, 'a', encoding='utf-8-sig', newline='')
        f_trash = open(TRASH_FILE, 'a', encoding='utf-8-sig', newline='')
        
        fieldnames = ["link", "content", "image_url", "time", "filter_reason"]
        writer_clean = csv.DictWriter(f_clean, fieldnames=fieldnames)
        writer_trash = csv.DictWriter(f_trash, fieldnames=fieldnames)
        
        # Write header nếu file mới
        if os.stat(OUTPUT_FILE).st_size == 0: writer_clean.writeheader()
        if os.stat(TRASH_FILE).st_size == 0: writer_trash.writeheader()

        while not STOP_EVENT.is_set():
            url = LINK_QUEUE.get()
            if url is None:
                print("\nĐã xử lý hết link. Đóng luồng cào...")
                break
            
            # 1. Cào dữ liệu
            data = process_post_page(page, url)
            
            # 2. Pipeline Lọc (New Logic)
            is_valid, reason = check_post_quality(data['content'])
            data['filter_reason'] = reason
            
            # 3. Phân loại lưu trữ
            if is_valid:
                print(f"   >>> ✅ GIỮ BÀI: {reason}")
                writer_clean.writerow(data)
                f_clean.flush()
            else:
                print(f"   >>> 🗑️ LOẠI BỎ: {reason}")
                writer_trash.writerow(data) # Lưu vào thùng rác để kiểm tra lại sau
                f_trash.flush()
            
            LINK_QUEUE.task_done()
            ready_to_scrape_next.set() # Bật đèn xanh cho luồng lấy link chạy tiếp
        
        f_clean.close()
        f_trash.close()
        browser.close()
        print(f"\n>>> Done! Valid Data: {OUTPUT_FILE} | Trash Data: {TRASH_FILE}")

# ... [GIỮ NGUYÊN PHẦN if __name__ == "__main__": ...]
if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=False,
            channel="chrome",
            args=["--disable-notifications"]
        )
        
        context = browser.new_context(
            storage_state="fb_state_mbasic.json" if os.path.exists("fb_state_mbasic.json") else None,
            user_agent=USER_AGENT,  # ← FAKE USER AGENT
            viewport={'width': 375, 'height': 812},
            locale='vi-VN'
        )
        page = context.new_page()
        if perform_login(page, context): 
            time.sleep(5)
            browser.close()
            t1 = threading.Thread(target=collect_links_worker, daemon=True)
            t2 = threading.Thread(target=scrape_feed_hook, daemon=True)

            t1.start()
            t2.start()

            try:
                while t1.is_alive() or t2.is_alive():
                    time.sleep(0.5) # Giữ luồng chính sống để bắt Ctrl+C
            except KeyboardInterrupt:
                print("\n[!] Đang dừng chương trình (Vui lòng đợi giây lát)...")
                STOP_EVENT.set() # Phát tín hiệu dừng cho các luồng phụ
                # Gửi None vào queue để luồng t2 thoát khỏi lệnh .get() đang bị kẹt
                LINK_QUEUE.put(None) 
                time.sleep(2)