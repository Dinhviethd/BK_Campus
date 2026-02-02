from playwright.sync_api import sync_playwright
import os
import time
import csv
from bs4 import BeautifulSoup
import re
import random
import threading
import queue
import joblib
import pandas as pd
from underthesea import word_tokenize
from dotenv import load_dotenv
from supabase import create_client, Client
# --- CẤU HÌNH SUPABASE ---
load_dotenv() # Load biến môi trường từ file .env
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Khởi tạo Supabase Client
supabase_client: Client = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print(">>> ✅ Kết nối Supabase thành công!")
    except Exception as e:
        print(f"!!! ❌ Lỗi kết nối Supabase: {e}")
else:
    print("!!! ⚠️ Không tìm thấy cấu hình SUPABASE_URL hoặc SUPABASE_KEY trong .env")

def vietnamese_tokenizer(text):
    # word_tokenize trả về list: ['Học máy', 'là', ...]
    tokens = word_tokenize(text)
    return tokens

# --- IMPORT LOGIC TỪ CÁC FILE KHÁC (Hoặc copy hàm vào đây nếu muốn gộp 1 file) ---
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
        return 1 

# --- CONFIG ---
FB_EMAIL = "huy11072k6@gmail.com"
FB_PASS = "huy12012005"
# GROUP_ID = "udnvku"
GROUP_ID = "daihocbachkhoadanang2021"
BASE_URL = f"https://m.facebook.com/groups/{GROUP_ID}"
STATE = "fb_state_mbasic.json"
OUTPUT_FILE = "daihocngoaingudn_CLEAN.csv" # File kết quả sạch
TRASH_FILE = "daihocngoaingudn_TRASH.csv"   # File rác (để kiểm tra xem model có lọc nhầm không)
MODEL_PATH = 'ml_model_svc.joblib'
NUM_POSTS_TO_SCRAPE = 1200
USER_AGENT = "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1"
TIME_LIMIT="3 ngày"
LINK_QUEUE = queue.Queue()
ready_to_scrape_next = threading.Event()
ready_to_scrape_next.set() 
STOP_EVENT = threading.Event()
DEBUG_FOLDER = "debug_html"
# --- LOAD MODEL (Global) ---
print(">>> Đang load AI Model...")
try:
    AI_MODEL = joblib.load(MODEL_PATH)
    print(">>> Load Model thành công!")
except Exception as e:
    print(f"!!! Lỗi load model: {e}. Sẽ chạy chế độ chỉ cào (không lọc ML).")
    AI_MODEL = None

def perform_login(page, context):
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
    time.sleep(random.uniform(2.0, 3.0)) 
    scroll_down = scroll_up + random.randint(400, 600)
    page.mouse.wheel(0, scroll_down)
    time.sleep(random.uniform(2.5, 4.0)) 

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
        time.sleep(10)
        seen_links = set()
        scroll_attempts = 0
        switch_to_newest_mode(page) 
        
        while len(seen_links) < NUM_POSTS_TO_SCRAPE: 
            if STOP_EVENT.is_set(): break 
            ready_to_scrape_next.wait() 
            
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
                
                if scroll_attempts > 15: 
                    print("\n!!! PHÁT HIỆN KẸT: Đã thử cuộn 15 lần nhưng không thấy bài mới.")
                    if not os.path.exists("debug"):
                        os.makedirs("debug")
                    timestamp = int(time.time())
                    try:
                        screenshot_path = f"debug/stuck_{timestamp}.png"
                        page.screenshot(path=screenshot_path)
                    except Exception as e:
                        print(f"   [DEBUG] Lỗi lưu ảnh: {e}")
                    try:
                        html_path = f"debug/stuck_{timestamp}.html"
                        with open(html_path, "w", encoding="utf-8") as f:
                            f.write(page.content())
                    except Exception as e:
                        print(f"   [DEBUG] Lỗi lưu HTML: {e}")

                    print(">>> 🛑 ĐANG TẠM DỪNG: Hãy mở trình duyệt, cuộn tay hoặc gỡ lỗi (captcha/popup).")
                    input(">>> 👉 Sau khi xử lý xong, hãy quay lại đây và nhấn ENTER để tiếp tục...")
                    scroll_attempts = 0
                    print(">>> 🚀 Tiếp tục chạy...")
                
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
    """
    Clean Facebook text - CHỈNH SỬA ĐỂ XỬ LÝ ICON GIỮA HAI SỐ
    """
    if not text:
        return ""
    text = re.sub(r'(\d)([\U0000E000-\U0010FFFF\u200e\u200f\u202a-\u202e\u200b-\u200d\ufeff]+)(\d)', 
                  r'\1 \3', text)
    
    text = re.sub(r'[\U0000E000-\U0010FFFF]', '', text)
    text = re.sub(r'[\u200e\u200f\u202a-\u202e\u200b-\u200d\ufeff]', '', text)
    
    # Bước 3: Normalize spaces
    text = re.sub(r'\s+', ' ', text)
    return text.strip()
import re

def parse_time_to_minutes(time_str):
    if not time_str or time_str == "N/A":
        return 0
    
    s = time_str.lower().strip()
    
    if "vừa xong" in s or "giây" in s:
        return 0

    multipliers = {
        "phút": 1,
        "giờ": 60,
        "ngày": 1440,       
        "tuần": 10080,      
        "tháng": 43200,     
        "năm": 525600      
    }

    match = re.search(r"(\d+)\s*(phút|giờ|ngày|tuần|tháng|năm)", s)
    if match:
        value = int(match.group(1))
        unit = match.group(2)
        # Nhân giá trị với hệ số tương ứng
        return value * multipliers.get(unit, 0)
    
    return 0

def check_is_older_than_limit(time_str, limit_str=TIME_LIMIT):

    post_minutes = parse_time_to_minutes(time_str)
    
    limit_minutes = parse_time_to_minutes(limit_str)

    if post_minutes == 0:
        return False
        
    return post_minutes > limit_minutes
def save_debug_html(page, index):
    """Lưu source HTML để debug nếu cào sai"""
    if not os.path.exists(DEBUG_FOLDER):
        os.makedirs(DEBUG_FOLDER)
    filename = f"{DEBUG_FOLDER}/post_{index}.html"
    with open(filename, "w", encoding="utf-8") as f:
        f.write(page.content())

def extract_post_data(html_content, url):
    soup = BeautifulSoup(html_content, 'html.parser')
    native_texts = soup.find_all('div', class_='native-text')
    
    if len(native_texts) < 7:
        return {
            "link": url,
            "content": "Error: HTML structure invalid",
            "image_url": "N/A",
            "time": "N/A"
        }
    
    # Pattern để tìm thời gian: tránh match số từ giữa username
    time_pattern = re.compile(
        r'(?:^|[^\d])(\d{1,2})\s+(giờ|phút|ngày|tuần|tháng|năm)',
        re.UNICODE
    )
    
    post_time = "N/A"
    
    # Kiểm tra trong author block (native_texts[4])
    if len(native_texts) > 4:
        author_block_raw = native_texts[4].get_text()
        author_block = clean_fb_text(author_block_raw)
        
        time_match = time_pattern.search(author_block)
        if time_match:
            post_time = f"{time_match.group(1)} {time_match.group(2)}"
    
    # Nếu không tìm thấy, thử các div xung quanh
    if post_time == "N/A":
        for idx in range(max(0, 3), min(len(native_texts), 7)):
            text_raw = native_texts[idx].get_text()
            text = clean_fb_text(text_raw)
            time_match = time_pattern.search(text)
            if time_match:
                post_time = f"{time_match.group(1)} {time_match.group(2)}"
                break
    
    stop_keywords = {
        "Phù hợp nhất", "Chưa có bình luận nào", 
        "Hãy là người đầu tiên bình luận", "Thích", "Bình luận", "Chia sẻ"
    }
    
    content_parts = []
    comment_start_idx = None

    for idx in range(6, len(native_texts)):
        text = clean_fb_text(native_texts[idx].get_text())
        if not text: 
            continue
        if text in stop_keywords:
            comment_start_idx = idx
            break
        if re.match(r'^\d{1,2}$', text): 
            continue
        if text in ["Xem thêm", "Ẩn bớt"]: 
            continue
        content_parts.append(text)
    
    full_content = " ".join(content_parts) if content_parts else "Không có nội dung"
    
    post_image = "N/A"
    if comment_start_idx is None: 
        comment_start_idx = 999999
    
    imgs = soup.find_all('img', src=re.compile(r'scontent'))
    for img in imgs:
        src = img.get('src', '')
        is_small = any(size in src for size in ['p48x48', 'p50x50', 'p75x75', 'p130x130', 'p29x29', 'p30x30', 'p38x38'])
        if is_small: 
            continue
        is_static = any(marker in src for marker in ['static_c', 'rsrc.php'])
        if is_static: 
            continue
        
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
        
        if native_before_img < comment_start_idx:
            post_image = src
            break
    
    return {
        "link": url,
        "content": full_content,
        "image_url": post_image,
        "time": post_time
    }

def process_post_page(page, url):
    print(f"\n=== CÀO BÀI VIẾT V2 (BẤT BIẾN) ===")
    post_id = url.split('/')[-2] if '/' in url else None
    print(f"Đang xử lý: {post_id}...", end=" ")
    
    try:
        page.goto(url, wait_until="networkidle")
        time.sleep(3) 
        #save_debug_html(page, post_id)
        html_content = page.content()
        result = extract_post_data(html_content, url)
        print(f"[{result['time']}] {result['content'][:40]}... | Ảnh: {'✅' if result['image_url'] != 'N/A' else '❌'}")
        time.sleep(random.uniform(2, 4))
        if check_is_older_than_limit(result['time'],TIME_LIMIT):
            return f"Đã quá {TIME_LIMIT} phút"
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
    if not content or len(content.strip()) < 10:
        return False, "Too short/Empty"

    is_pass_rule = rule_based_filtering(content)
    if is_pass_rule == 0:
        return False, "Rule-based Filtered"

    if AI_MODEL:
        try:
            clean_content = preprocess_text(content)
            prediction = AI_MODEL.predict([clean_content])[0]
            if prediction == 1:
                return True, "AI Accepted"
            else:
                return False, "AI Rejected"
        except Exception as e:
            print(f"Lỗi khi predict AI: {e}")
            return True, "Model Error (Kept)"
    
    return True, "No Model (Kept)"

# --- HÀM TƯƠNG TÁC SUPABASE MỚI ---
def save_to_supabase(data):
    """
    Đẩy dữ liệu bài viết hợp lệ lên Supabase.
    Bảng: posts (thông tin bài) và post_images (ảnh).
    """
    if not supabase_client:
        return

    try:
        # 1. Chuẩn bị payload cho bảng POSTS [cite: 7]
        # source='FACEBOOK_CRAWL' [cite: 3]
        # status='PROCESSING' (Chờ Core1 phân loại LOST/FOUND) [cite: 4]
        # type: Để NULL vì chưa chạy Core1 (hoặc Default DB sẽ xử lý)
        post_payload = {
            "source": "FACEBOOK_CRAWL", 
            "original_url": data['link'],
            "content": data['content'],
            "status": "PROCESSING"
            # created_at sẽ tự sinh bởi default: now() của Postgres
        }

        # Thực hiện Insert vào bảng posts và lấy về dữ liệu (để lấy ID)
        response = supabase_client.table("posts").insert(post_payload).execute()
        
        if not response.data:
            print("   >>> ⚠️ Warning: Insert bài viết không trả về data.")
            return

        new_post_id = response.data[0]['id'] # Lấy UUID vừa tạo [cite: 7]

        # 2. Chuẩn bị payload cho bảng POST_IMAGES (nếu có ảnh) 
        if data['image_url'] and data['image_url'] != "N/A":
            image_payload = {
                "post_id": new_post_id,
                "url": data['image_url']
                # embedding và nsfwScore sẽ được xử lý sau bởi AI Core
            }
            supabase_client.table("post_images").insert(image_payload).execute()
        
        print(f"   >>> ☁️ Đã đẩy lên Supabase thành công! (ID: {new_post_id})")

    except Exception as e:
        print(f"   >>> ❌ Lỗi khi lưu vào Supabase: {e}")

def scrape_feed_hook():
    """Luồng xử lý: Lấy link -> Cào content -> Lọc AI -> Lưu file & Supabase"""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, channel="chrome", args=["--disable-notifications"])
        context = browser.new_context(
            storage_state=STATE if os.path.exists(STATE) else None,
            user_agent=USER_AGENT,
            viewport={'width': 375, 'height': 812},
            locale='vi-VN'
        )
        page = context.new_page()
        
        f_clean = open(OUTPUT_FILE, 'a', encoding='utf-8-sig', newline='')
        f_trash = open(TRASH_FILE, 'a', encoding='utf-8-sig', newline='')
        
        fieldnames = ["link", "content", "image_url", "time", "filter_reason"]
        writer_clean = csv.DictWriter(f_clean, fieldnames=fieldnames)
        writer_trash = csv.DictWriter(f_trash, fieldnames=fieldnames)
        
        if os.stat(OUTPUT_FILE).st_size == 0: writer_clean.writeheader()
        if os.stat(TRASH_FILE).st_size == 0: writer_trash.writeheader()

        while not STOP_EVENT.is_set():
            url = LINK_QUEUE.get()
            if url is None:
                print("\nĐã xử lý hết link. Đóng luồng cào...")
                break
            
            # 1. Cào dữ liệu
            data = process_post_page(page, url)
            # check nếu bài viết quá 30 phút
            if isinstance(data, str) and data == "Đã quá 30 phút":
                print("  GẶP BÀI QUÁ 30 PHÚT → DỪNG TOÀN BỘ PIPELINE")

                STOP_EVENT.set()          
                LINK_QUEUE.task_done()

                LINK_QUEUE.put(None)
                ready_to_scrape_next.set()
                break 
            # 2. Pipeline Lọc
            is_valid, reason = check_post_quality(data['content'])
            data['filter_reason'] = reason
            
            # 3. Phân loại lưu trữ
            if is_valid:
                print(f"   >>> ✅ GIỮ BÀI: {reason}")
                writer_clean.writerow(data)
                f_clean.flush()
                
                # --- SUPABASE INTEGRATION ---
                # Chỉ đẩy lên DB những bài hợp lệ (đã qua lọc rác)
                #save_to_supabase(data) 
                # ----------------------------

            else:
                print(f"   >>> 🗑️ LOẠI BỎ: {reason}")
                writer_trash.writerow(data)
                f_trash.flush()
            
            LINK_QUEUE.task_done()
            ready_to_scrape_next.set()
        
        f_clean.close()
        f_trash.close()
        browser.close()
        print(f"\n>>> Done! Valid Data: {OUTPUT_FILE} | Trash Data: {TRASH_FILE}")

# ... [GIỮ NGUYÊN PHẦN MAIN] ...
if __name__ == "__main__":
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
        if perform_login(page, context): 
            time.sleep(5)
            browser.close()
            t1 = threading.Thread(target=collect_links_worker, daemon=True)
            t2 = threading.Thread(target=scrape_feed_hook, daemon=True)

            t1.start()
            t2.start()

            try:
                while t1.is_alive() or t2.is_alive():
                    time.sleep(0.5) 
            except KeyboardInterrupt:
                print("\n[!] Đang dừng chương trình (Vui lòng đợi giây lát)...")
                STOP_EVENT.set() 
                LINK_QUEUE.put(None) 
                time.sleep(2)