from playwright.sync_api import sync_playwright
import os
import time
import csv
import random
import re

TARGET_URL = "https://www.facebook.com/groups/dut.confessions"
STATE = "fb_state.json"
OUTPUT_FILE = "ued_confessions_data_final_1.csv"
NUM_SCROLLS = 1000

FB_EMAIL = "huy11072k6@gmail.com" 
FB_PASS = "huy12012005"

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

def clean_text(text):
    """Làm sạch text: xóa thẻ HTML và khoảng trắng thừa"""
    if not text: return "N/A"
    # Xóa tất cả các thẻ tag <...>
    text = re.sub(r'<[^>]+>', '', text)
    return text.strip()

def add_stealth_scripts(page):
    """Tiêm script để che giấu dấu vết Automation"""
    try:
        page.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
            Object.defineProperty(navigator, 'languages', { get: () => ['vi-VN', 'vi', 'en-US', 'en'] });
        """)
    except:
        pass

def check_login_required(page):
    try:
        page.wait_for_timeout(2000)
        url = page.url
        if "login" in url or "checkpoint" in url or "challenge" in url:
            return True
        if page.locator("input[name='email']").count() > 0:
            return True
        return False
    except:
        return False

def perform_login(page, context):
    print(">>> 🔒 Đang thực hiện đăng nhập...")
    try:
        page.goto("https://www.facebook.com/login", wait_until="domcontentloaded")
        time.sleep(random.uniform(2, 4))
        page.fill("input[name='email']", FB_EMAIL)
        time.sleep(random.uniform(1, 2))
        page.fill("input[name='pass']", FB_PASS)
        time.sleep(random.uniform(1, 2))
        
        if page.locator("button[name='login']").count() > 0:
            page.click("button[name='login']")
        elif page.locator("#loginbutton").count() > 0:
            page.click("#loginbutton")
        else:
            page.keyboard.press('Enter')
            
        print(">>> ⏳ Đã bấm nút đăng nhập. Đang chờ phản hồi...")
        
        max_retries = 120 
        for i in range(max_retries):
            time.sleep(5)
            curr_url = page.url
            
            if "checkpoint" in curr_url or "challenge" in curr_url or "consent" in curr_url:
                print(f"[{i*5}s] ⚠️ PHÁT HIỆN CHECKPOINT! Vui lòng giải tay...")
                continue
            
            if "/two_step_verification/" in curr_url:
                print(f"[{i*5}s] ⚠️ CẦN MÃ 2 LỚP!...")
                continue
            
            if "facebook.com" in curr_url and "login" not in curr_url and "checkpoint" not in curr_url:
                if page.locator('div[role="feed"]').count() > 0 or page.locator('div[aria-label="Facebook"]').count() > 0:
                    print(">>> ✅ ĐĂNG NHẬP THÀNH CÔNG!")
                    break
        else:
            print("!!! Quá thời gian chờ (10 phút).")
            return False

        context.storage_state(path=STATE)
        return True

    except Exception as e:
        print(f"Lỗi quá trình login: {e}")
        return False

def collect_post_links(page):
    post_links = set()
    print(f"\n=== BƯỚC 1: Thu thập link bài post ===")
    
    for i in range(NUM_SCROLLS):
        print(f"--- Cuộn lần {i+1}/{NUM_SCROLLS} ---")
        page.mouse.wheel(0, random.randint(800, 1200))
        time.sleep(random.uniform(2, 4)) 
        
        if random.choice([True, False]):
            page.mouse.wheel(0, -random.randint(100, 300))
            time.sleep(1)

        try:
            close_btn = page.locator('div[role="dialog"] div[aria-label="Đóng"], div[role="dialog"] div[aria-label="Close"]').first
            if close_btn.is_visible(): close_btn.click()
        except: pass

        posts = page.locator('div[role="article"]').all()
        for post in posts:
            try:
                # Cập nhật selector lấy link chính xác hơn cho Confessions
                link_el = post.locator('span a[role="link"][href*="/posts/"], span a[role="link"][href*="permalink"], span[id] a[role="link"]').first
                if link_el.count() > 0:
                    raw = link_el.get_attribute("href")
                    if raw:
                        link = raw.split("?")[0]
                        if "facebook.com" not in link: link = "https://www.facebook.com" + link
                        if "/groups/" in link and "/user/" not in link:
                            post_links.add(link)
            except: continue
        print(f"    -> Tổng hiện tại: {len(post_links)} link.")
    
    return list(post_links)

def extract_post_content(context, post_url):
    """Bước 2: Xử lý bài viết (Giữ nguyên Time & Image, chỉ sửa logic Content theo 'message')"""
    page = None
    try:
        page = context.new_page()
        add_stealth_scripts(page)
        
        # Giữ nguyên logic tối ưu tốc độ của cậu
        # page.route("**/*.{png,jpg,jpeg,woff,woff2}", lambda route: route.abort())
        
        page.goto(post_url, wait_until="domcontentloaded", timeout=60000)
        page.wait_for_timeout(random.uniform(2000, 4000))
        
        root_element = None
        dialog = page.locator('div[role="dialog"]').first
        if dialog.is_visible():
            root_element = dialog
        else:
            root_element = page.locator('div[role="main"] div[role="article"]').first
            if not root_element.count():
                 root_element = page.locator('div[role="article"]').first

        content = ""
        image_url = "N/A"
        post_time = "N/A"

        if root_element and root_element.count() > 0:
            # === A. LẤY TEXT (SỬA LẠI: Dùng selector 'message' chuẩn) ===
            try:
                # Click "Xem thêm" trước nếu có
                try:
                    see_more = root_element.locator('div[role="button"]:has-text("Xem thêm"), div[role="button"]:has-text("See more")').first
                    if see_more.is_visible():
                        see_more.click()
                        time.sleep(1)
                except: pass

                # 1. ƯU TIÊN TUYỆT ĐỐI: Lấy theo data-ad-comet-preview="message"
                # Đây là định danh chuẩn của FB cho nội dung bài viết, KHÔNG bao gồm comment
                message_el = root_element.locator('div[data-ad-comet-preview="message"], div[data-ad-preview="message"]').first
                
                if message_el.count() > 0:
                    content = message_el.inner_text().strip()
                
                # 2. Fallback cho bài viết dạng Background (chữ trên nền màu)
                # Dạng này không có thẻ message, mà nằm trong thẻ style background-image
                elif root_element.locator('div[style*="background-image"]').count() > 0:
                    bg_text = root_element.locator('div[style*="background-image"] div[dir="auto"]').first
                    if bg_text.count() > 0:
                        content = bg_text.inner_text().strip()
                
                # LƯU Ý: Tôi đã XÓA đoạn Fallback quét "div[dir='auto']" cũ
                # Vì đoạn đó chính là nguyên nhân khiến code quét trúng nội dung comment bên dưới.
                # Nếu không tìm thấy message hoặc background text, thà để trống hoặc lấy Title còn hơn lấy nhầm comment.

            except Exception as e:
                print(f"Lỗi lấy content: {e}")

            # === B. LẤY ẢNH (GIỮ NGUYÊN CODE CỦA CẬU) ===
            try:
                imgs = root_element.locator('img').all()
                for img in imgs:
                    src = img.get_attribute("src")
                    w = float(img.get_attribute("width") or 0)
                    if src and "scontent" in src and w > 100: 
                        image_url = src
                        break
            except: pass

            # === C. THỜI GIAN (GIỮ NGUYÊN LOGIC SUPER PRECISE CỦA CẬU) ===
            try:
                post_id_match = re.search(r'/(?:posts|permalink|groups[^/]+)/(\d+)', post_url)
                post_id = post_id_match.group(1) if post_id_match else None

                target_link = None
                links = root_element.locator('span a[role="link"]').all()
                
                for link in links:
                    href = link.get_attribute("href") or ""
                    if post_id and post_id in href:
                        target_link = link
                        break
                    if "/posts/" in href or "/permalink/" in href:
                        txt = clean_text(link.inner_text())
                        if 0 < len(txt) < 30 and any(c.isdigit() for c in txt):
                            target_link = link
                            break

                if target_link:
                    aria = target_link.get_attribute("aria-label")
                    text_val = clean_text(target_link.inner_text())
                    if aria and len(aria) > 5:
                        post_time = aria
                    else:
                        post_time = text_val
                
                if post_time == "N/A":
                    for link in links[:5]:
                        txt = clean_text(link.inner_text())
                        if re.match(r'^(\d+\s*[hmgy]|\d+\s*(giờ|phút|năm)|Vừa xong|Hôm qua|Hôm nay)', txt, re.IGNORECASE):
                            post_time = txt
                            break
            except Exception as e:
                print(f"Lỗi lấy time: {e}")

        # Fallback Title (Dự phòng cuối cùng)
        if not content or len(content) < 2:
            try:
                clean_title = re.sub(r'^\(\d+\)\s*', '', page.title()).replace(' | Facebook', '')
                parts = clean_title.split(' | ')
                content = parts[-1].strip() if len(parts) > 1 else clean_title
            except: pass

        return { "content": content, "image_url": image_url, "link": post_url, "time": post_time }

    except Exception as e:
        print(f"    [!] Lỗi xử lý bài: {e}")
        return None
    finally:
        if page: page.close()

# --- MAIN ---
if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=False,
            channel="chrome",  
            args=[
                "--disable-blink-features=AutomationControlled",
                "--disable-notifications",
                "--start-maximized",
                "--no-sandbox",
                "--disable-infobars",
                "--disable-dev-shm-usage",
                f"--user-agent={USER_AGENT}" # Fake User Agent

            ]
        )

        
        try:
            context_options = {
                'viewport': {'width': 1366, 'height': 768},
                'locale': 'vi-VN',
                'timezone_id': 'Asia/Ho_Chi_Minh',
                'user_agent': USER_AGENT
            }

            if os.path.exists(STATE):
                print(">>> 📂 Tìm thấy file cookie, đang load...")
                context = browser.new_context(storage_state=STATE, **context_options)
            else:
                context = browser.new_context(**context_options)

            main_page = context.new_page()
            add_stealth_scripts(main_page)
            
            print(">>> 🌐 Đang truy cập trang chủ Facebook để kiểm tra...")
            try:
                main_page.goto("https://www.facebook.com", wait_until="domcontentloaded")
            except: pass

            if check_login_required(main_page):
                success = perform_login(main_page, context)
                if not success:
                    print("!!! Đăng nhập thất bại. Thoát.")
                    browser.close()
                    exit()
                main_page.close()
                time.sleep(2)
                main_page = context.new_page()
                add_stealth_scripts(main_page)

            print(f">>> 🚀 Đang truy cập nhóm: {TARGET_URL}")
            main_page.goto(TARGET_URL, wait_until="domcontentloaded")
            
            post_links = collect_post_links(main_page)
            main_page.close()

            if post_links:
                print(f"=== BƯỚC 2: Lấy nội dung ({len(post_links)} bài) ===")
                with open(OUTPUT_FILE, 'w', encoding='utf-8-sig', newline='') as f:
                    writer = csv.DictWriter(f, fieldnames=["content", "image_url", "link", "time"])
                    writer.writeheader()

                for idx, link in enumerate(post_links, 1):
                    print(f"[{idx}/{len(post_links)}]", end=" ")
                    data = extract_post_content(context, link)
                    
                    if data and len(data["content"]) > 2:
                        print(f"✓ OK (Time: {data['time']}): {data['content'][:30].replace(chr(10), ' ')}...")
                        with open(OUTPUT_FILE, 'a', encoding='utf-8-sig', newline='') as f:
                            writer = csv.DictWriter(f, fieldnames=["content", "image_url", "link", "time"])
                            writer.writerow(data)
                    else:
                        print(f"✗ Skip")
                    
                    time.sleep(random.uniform(2, 5))
                
                print(f">>> ✅ Xong! Dữ liệu đã lưu tại: {OUTPUT_FILE}")
            
        except Exception as e:
            print(f"❌ Lỗi Fatal: {e}")
        finally:
            try: browser.close()
            except: pass