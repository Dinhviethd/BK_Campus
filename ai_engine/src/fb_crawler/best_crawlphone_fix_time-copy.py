from playwright.sync_api import sync_playwright
import os
import time
import csv
from bs4 import BeautifulSoup
import re
import random

# === CẤU HÌNH ===
FB_EMAIL = "huy11072k6@gmail.com"
FB_PASS = "huy12012005"
GROUP_ID = "316664894696615"
BASE_URL = f"https://m.facebook.com/groups/{GROUP_ID}"
STATE = "fb_state_mbasic.json"
OUTPUT_FILE = "daihockientruc.csv"
DEBUG_FOLDER = "debug_html"
NUM_POSTS_TO_SCRAPE = 300

USER_AGENT = "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1"


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
def perform_smart_scroll(page, attempt_count):
    last_height = page.evaluate("document.body.scrollHeight")
    
    if attempt_count < 2:
        # Chiến thuật 1: Cuộn xuống bình thường (khoảng 1 màn hình)
        print(f"   >>> ⬇️ Đang cuộn xuống tìm bài mới... (Lần {attempt_count + 1})")
        page.evaluate("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(random.uniform(2, 4)) # Nghỉ ngẫu nhiên
    else:
        # Chiến thuật 2: Kích hoạt 'Rung lắc' vì có vẻ đang bị kẹt
        print(f"   >>> ⚠️ Có vẻ bị kẹt. Đang thực hiện 'Rung lắc' để tải lại...")
        
        # Kéo ngược lên khoảng 600px
        page.evaluate("window.scrollBy(0, -600);")
        time.sleep(random.uniform(1.5, 3))
        
        # Kéo mạnh xuống đáy lại
        page.evaluate("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(random.uniform(3, 5)) # Đợi lâu hơn chút để FB load
        
    new_height = page.evaluate("document.body.scrollHeight")
    return new_height > last_height

def switch_to_newest_mode(page):    
    try:
        # 1. Tìm nút "SẮP XẾP" (Dựa trên HTML bạn gửi: thẻ span chứa chữ SẮP XẾP)
        # Dùng wait_for để đảm bảo nút đã hiện ra
        sort_btn = page.locator('span:has-text("SẮP XẾP")').first
        
        if sort_btn.is_visible():
            print(">>> Đã thấy nút 'SẮP XẾP'. Đang click...")
            sort_btn.click(force=True) # force=True giúp click bất chấp bị che khuất nhẹ
            time.sleep(2) # Chờ menu bung lên từ dưới đáy

            # 2. Chọn "Gần đây nhất" trong menu vừa hiện ra
            # Menu của Facebook Mobile thường hiện ở dưới đáy (Bottom Sheet)
            # Ta tìm các từ khóa phổ biến: "Gần đây nhất", "Mới nhất", "Newest"
            newest_option = page.locator('span:has-text("Gần đây nhất"), span:has-text("Bài viết mới"), span:has-text("Mới nhất")').first
            
            if newest_option.is_visible():
                print(f">>> Tìm thấy tùy chọn: {newest_option.inner_text()}")
                newest_option.click()
                print(">>> ✅ Đã chọn 'Mới nhất'. Đang chờ tải lại trang...")
                
                # Chờ loading spinner biến mất hoặc chờ một lúc
                time.sleep(5) 
                return True
            else:
                print(">>> ⚠️ Menu đã mở nhưng không thấy tùy chọn 'Gần đây nhất'.")
                # Thử in ra nội dung menu để debug lần sau nếu cần
                # page.screenshot(path="debug_menu_open.png") 
                page.keyboard.press("Escape") # Đóng menu
        else:
            # Trường hợp không có nút SẮP XẾP, kiểm tra xem có phải đã ở chế độ Mới nhất chưa
            # Đôi khi giao diện FB hiện chữ "Bài viết mới" thay vì "Sắp xếp"
            if page.locator('span:has-text("Bài viết mới"), span:has-text("Gần đây nhất")').is_visible():
                print(">>> ✅ Đã ở sẵn chế độ Mới nhất.")
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
def save_debug_html(page, index):
    """Lưu source HTML để debug nếu cào sai"""
    if not os.path.exists(DEBUG_FOLDER):
        os.makedirs(DEBUG_FOLDER)
    filename = f"{DEBUG_FOLDER}/post_{index}.html"
    with open(filename, "w", encoding="utf-8") as f:
        f.write(page.content())

def perform_jiggle_scroll(page):
    """
    Hàm thực hiện động tác dao động: Lướt lên rồi lướt xuống
    Dùng để đánh lừa Facebook khi bị chặn tải hoặc đơ.
    """
    print("      >>> 🔄 Đang dao động (Lên -> Xuống) để mồi bài viết mới...")
    
    # 1. Cuộn ngược lên (Scroll Up) một đoạn ngẫu nhiên
    scroll_up = random.randint(400, 700)
    page.mouse.wheel(0, -scroll_up) 
    time.sleep(random.uniform(2.0, 3.0)) # Đợi như đang đọc lại tin cũ
    
    # 2. Cuộn xuống lại (Scroll Down) sâu hơn đoạn vừa lên
    scroll_down = scroll_up + random.randint(400, 600)
    page.mouse.wheel(0, scroll_down)
    time.sleep(random.uniform(2.5, 4.0)) # Đợi loading xoay xoay

# --- HÀM CHÍNH ĐÃ SỬA PHẦN SCROLL ---
def step_1_collect_links(page):
    print(f"\n=== GIAI ĐOẠN 1: THU THẬP {NUM_POSTS_TO_SCRAPE} LINKS ===")
    page.goto(BASE_URL, wait_until="domcontentloaded")
    time.sleep(3)
    
    collected_links = set()
    scroll_attempts = 0
    
    switch_to_newest_mode(page) # Giữ nguyên hàm của bạn nếu có
    
    while len(collected_links) < NUM_POSTS_TO_SCRAPE:
        # === TÌM VÀ XỬ LÝ NGAY 1 NÚT ===
        share_button = page.locator(
            'div[role="button"][aria-label*="share"]:not([data-processed]), '
            'div[role="button"][aria-label*="Chia sẻ"]:not([data-processed])'
        ).first  # CHỈ LẤY NÚT ĐẦU TIÊN
        
        # Kiểm tra có nút không
        try:
            if not share_button.is_visible(timeout=2000):
                raise Exception("Không thấy nút")
        except:
            print(f">>> Không thấy bài mới... Đang thử gỡ kẹt ({len(collected_links)}/{NUM_POSTS_TO_SCRAPE})")
            perform_jiggle_scroll(page)
            scroll_attempts += 1
            
            if scroll_attempts > 15: 
                print("!!! Đã thử cuộn nhiều lần nhưng hết bài hoặc bị chặn hẳn.")
                break
            continue
        
        # Reset biến đếm vì đã thấy nút
        scroll_attempts = 0
        
        # === XỬ LÝ NÚT NGAY ===
        try:
            share_button.scroll_into_view_if_needed()
            time.sleep(0.5)
            
            # Reset biến hứng link
            page.evaluate("window.captured_link_from_fb = 'N/A'")
            
            # Click nút Share
            share_button.click(timeout=3000)
            time.sleep(1.5)
            
            # Tìm nút Sao chép
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
                
                if link != "N/A" and link not in collected_links:
                    clean_link = link.split('?')[0]
                    collected_links.add(clean_link)
                    print(f"✅ Link {len(collected_links)}: {clean_link}")
                else:
                    print(f"   ⚠️ Click copy rồi nhưng không bắt được link (Link={link})")
                
                page.keyboard.press("Escape")
            else:
                print("   ⚠️ Không thấy nút 'Sao chép liên kết', bỏ qua.")
                page.mouse.click(10, 10)
            
            # Đánh dấu đã xử lý
            share_button.evaluate("el => el.setAttribute('data-processed', 'true')")
            
        except Exception as e:
            # print(f"Lỗi: {e}")
            try:
                share_button.evaluate("el => el.setAttribute('data-processed', 'true')")
            except:
                pass  # Nút đã mất thì thôi
            continue

    return list(collected_links)
def clean_fb_text(text):
    """
    Xóa TRIỆT ĐỂ ký tự đặc biệt của Facebook và chuẩn hóa text
    
    Args:
        text: Text cần làm sạch
        
    Returns:
        Text đã được làm sạch
    """
    if not text:
        return ""
    
    # 1. Xóa các ký tự Private Use Area (U+E000 đến U+F8FF)
    # Bao gồm cả các ký tự extended như 󲄭, 󳆗
    text = re.sub(r'[\uE000-\uF8FF]|[\U000F0000-\U0010FFFF]', '', text)
    
    # 2. Xóa các ký tự điều hướng Unicode
    text = re.sub(r'[\u200e\u200f\u202a-\u202e]', '', text)
    
    # 3. Xóa Zero-Width characters
    text = re.sub(r'[\u200b-\u200d\ufeff]', '', text)
    
    # 4. Thay nhiều dấu xuống dòng thành khoảng trắng
    text = re.sub(r'\n+', ' ', text)
    
    # 5. Xóa nhiều khoảng trắng liên tiếp
    text = re.sub(r'\s+', ' ', text)
    
    return text.strip()


def scrape_feed_hook(page, links):
    """
    Cào nội dung từ danh sách links Facebook
    
    ĐIỂM CẢI TIẾN:
    - Lấy đúng thời gian bài post từ header (không phải thời gian comment)
    - Giữ nguyên logic cào content, link, image_url đã hoạt động tốt
    
    Args:
        page: Playwright page object
        links: List các URL cần cào
        
    Returns:
        List of dict chứa: link, content, image_url, time
    """
    print(f"\n=== BẮT ĐẦU CÀO {len(links)} BÀI VIẾT (VERSION HOÀN THIỆN) ===")
    
    # Tạo thư mục debug HTML
    if not os.path.exists("debug_html"):
        os.makedirs("debug_html")
    
    data_results = []
    
    for i, url in enumerate(links):
        post_id = url.split('/')[-2] if '/' in url else f"post_{i}"
        print(f"[{i+1}/{len(links)}] Đang xử lý: {post_id}...", end=" ")
        
        try:
            # Load trang
            page.goto(url, wait_until="networkidle")
            time.sleep(5)  # Chờ load đầy đủ
            
            html_content = page.content()
            
            # 1. LƯU HTML DEBUG
            debug_path = os.path.join("debug_html", f"{post_id}.html")
            with open(debug_path, "w", encoding="utf-8") as f:
                f.write(html_content)
            
            # 2. PARSE HTML
            soup = BeautifulSoup(html_content, 'html.parser')
            all_divs = soup.find_all('div', class_='native-text')
            
            # ==========================================
            # 3. LẤY THỜI GIAN BÀI POST (LOGIC MỚI)
            # ==========================================
            post_time = "N/A"
            time_pattern = re.compile(r'(\d{1,2})\s+(ngày|giờ|phút|giây|năm|tháng|tuần)')
            
            # PHƯƠNG PHÁP 1: Tìm trong header bài post
            # Header thường có:
            # - span màu xám (class f5 hoặc f6) với style color:#65686c
            # - nằm trong div có data-actual-height ~78px (chứa avatar + username + thời gian)
            
            all_spans = soup.find_all('span', class_=lambda x: x and ('f5' in x or 'f6' in x))
            
            for span in all_spans:
                style = span.get('style', '')
                
                # Phải là span màu xám (thời gian)
                if 'color:#65686c' not in style:
                    continue
                
                raw_text = span.get_text()
                clean_text = clean_fb_text(raw_text)
                match = time_pattern.search(clean_text)
                
                if not match:
                    continue
                
                # Kiểm tra xem span này có nằm trong header bài post không
                # Bằng cách đi lên parent hierarchy và tìm div có height ~78px
                parent = span
                is_in_header = False
                
                for _ in range(10):  # Đi lên tối đa 10 level
                    parent = parent.parent if parent else None
                    if not parent or not hasattr(parent, 'get'):
                        break
                    
                    # Header container thường có height trong khoảng 70-90px
                    data_height = parent.get('data-actual-height', '')
                    if data_height in ['78', '70', '75', '80', '85', '90']:
                        is_in_header = True
                        break
                
                if is_in_header:
                    post_time = match.group()
                    break
            
            # PHƯƠNG PHÁP 2: Fallback - tìm thời gian đơn giản đầu tiên
            # Nếu không tìm thấy bằng phương pháp 1
            if post_time == "N/A":
                for div in all_divs:
                    text = clean_fb_text(div.get_text())
                    
                    # Chỉ kiểm tra text ngắn để tránh lấy nhầm content
                    if len(text) > 50:
                        continue
                    
                    match = time_pattern.search(text)
                    if not match:
                        continue
                    
                    # Chỉ lấy nếu text chủ yếu là thời gian (ít từ)
                    # VD: "49 phút", "1 giờ", "2 ngày"
                    text_parts = text.split()
                    if len(text_parts) <= 3:
                        post_time = match.group()
                        break
            content_parts = []
            found_content = False
            stop_collecting = False
            
            # Các từ khóa để DỪNG việc lấy content
            stop_keywords = [
                "Thích", "Bình luận", "Chia sẻ", "Trả lời", 
                "Phù hợp nhất", "Viết bình luận", "Nhóm liên quan",
                "Xem thêm", "Ẩn bớt", "Chưa có bình luận nào"
            ]
            
            # Từ khóa bỏ qua HOÀN TOÀN
            skip_keywords = [
                "Người tham gia ẩn danh", 
                "DUT Confessions",
                "UED Confessions",
                "Bài viết của",
                "Người đóng góp nhiều nhất", 
                "DUT - Đại Học Bách Khoa Đà Nẵng 2024",
                "UED - Đại học Sư phạm Đà Nẵng",
                "DAU - Đại Học Kiến Trúc Đà Nẵng 2025"
            ]
            
            # Pattern để phát hiện username dính với thời gian 
            username_time_pattern = re.compile(r'\d+\s+(giờ|phút|ngày|tuần|tháng|năm)\b')
            
            for div in all_divs:
                text = clean_fb_text(div.get_text())
                
                if not text or stop_collecting:
                    continue
                
                # Bỏ qua các phần không phải content
                if any(skip in text for skip in skip_keywords):
                    continue
                
                # Bỏ qua nếu là username dính thời gian
                if len(text) < 30 and username_time_pattern.search(text):
                    continue
                    
                # Bỏ qua nếu là thời gian bài post
                if text == post_time:
                    continue
                # Nếu gặp từ khóa dừng -> DỪNG ngay
                if any(keyword == text for keyword in stop_keywords):
                    if found_content:
                        stop_collecting = True
                    continue
                parent = div.parent
                if parent:
                    parent_classes = parent.get('class', [])
                    is_content_container = (
                        ('fl' in parent_classes and 'ac' in parent_classes) or
                        (['m'] == parent_classes and len(text) > 10)
                    )
                    
                    if is_content_container:
                        # Loại bỏ ký tự icon
                        if len(text) <= 5 and all(ord(c) > 127000 for c in text if c.strip()):
                            continue
                        
                        # Bỏ qua text ngắn chỉ chứa số/emoji
                        if len(text) <= 10 and re.match(r'^[\d\s]+$', text):
                            continue
                        
                        # Kiểm tra lại lần cuối
                        if any(skip in text for skip in skip_keywords):
                            continue
                        
                        if text not in content_parts:
                            content_parts.append(text)
                            found_content = True
            
            full_content = " ".join(content_parts) if content_parts else "Không có nội dung"
            full_content = clean_fb_text(full_content)
            post_image = "N/A"
            imgs = soup.find_all('img')
            
            for img in imgs:
                src = img.get('src', '')
                
                # Phải có scontent (ảnh thật, không phải icon)
                if 'scontent' not in src:
                    continue
                
                # Bỏ qua ảnh nhỏ (avatar/icon)
                is_small = (
                    re.search(r'p\d{2}x\d{2}', src) or 
                    any(x in src for x in ["/cp0/", "static.xx", "rsrc.php"])
                )
                if is_small:
                    continue
                
                # LOGIC MỚI: Kiểm tra data-comp-id để phân biệt ảnh bài post và ảnh comment
                # Pattern:
                # - Ảnh/Video BÀI POST: 
                #   + comp-id gần nhất >= 30000 (30001...), HOẶC
                #   + có data-type="video" (video thumbnail), HOẶC
                #   + có data-type="image" (ảnh bài post)
                # - Ảnh COMMENT: comp-id gần nhất trong khoảng 50-29999 (69, 71, 74...)
                
                parent = img
                is_post_image = False
                nearest_comp_id = None
                has_media_type = False
                
                # Tìm comp-id GẦN NHẤT và data-type
                for _ in range(12):
                    parent = parent.parent if parent else None
                    if not parent or not hasattr(parent, 'get'):
                        break
                    
                    # Kiểm tra data-type
                    data_type = parent.get('data-type', '')
                    if data_type in ['video', 'image']:
                        has_media_type = True
                    
                    # Lấy comp-id đầu tiên
                    if not nearest_comp_id:
                        comp_id = parent.get('data-comp-id', '')
                        if comp_id:
                            try:
                                nearest_comp_id = int(comp_id)
                            except ValueError:
                                pass
                
                # Kiểm tra điều kiện
                if nearest_comp_id:
                    # Ảnh/video bài post: comp-id >= 30000 hoặc có media type
                    if nearest_comp_id >= 30000:
                        is_post_image = True
                    elif has_media_type and nearest_comp_id < 100:
                        # Video/image với comp-id nhỏ (< 100) cũng là media bài post
                        is_post_image = True
                    # Ảnh comment: comp-id trong khoảng 100-29999 và không có media type
                    elif nearest_comp_id >= 100 and not has_media_type:
                        is_post_image = False
                elif has_media_type:
                    # Nếu có media type nhưng không có comp-id → cũng coi là bài post
                    is_post_image = True
                
                # Chỉ lấy ảnh của bài post
                if is_post_image:
                    post_image = src
                    break
            
            print(f"✅ [{post_time}] {full_content[:40]}...")
            
            data_results.append({
                "link": url,
                "content": full_content,
                "image_url": post_image,
                "time": post_time
            })
            
            time.sleep(random.uniform(2, 4))
            
        except Exception as e:
            print(f"❌ Lỗi: {e}")
            data_results.append({
                "link": url,
                "content": "Error",
                "image_url": "N/A",
                "time": "N/A"
            })
    
    print(f"\n=== HOÀN THÀNH CÀO {len(data_results)} BÀI VIẾT ===")
    return data_results
if __name__ == "__main__":
    # Tạo thư mục debug nếu chưa có
    if not os.path.exists(DEBUG_FOLDER):
        os.makedirs(DEBUG_FOLDER)

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
            links = step_1_collect_links(page)
            if links:
                data = scrape_feed_hook(page, links)
                
                with open(OUTPUT_FILE, 'w', encoding='utf-8-sig', newline='') as f:
                    writer = csv.DictWriter(f, fieldnames=["link", "content", "image_url", "time"])
                    writer.writeheader()
                    writer.writerows(data)
                    
                print(f"\nXONG! Kiểm tra file CSV: {OUTPUT_FILE}")
            else:
                print("Không lấy được link nào.")
        
        browser.close()