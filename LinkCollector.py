import random
import time
import os 
from playwright.sync_api import sync_playwright
class LinkCollector:
    def __init__(self,user_agent, queue, stop_event,ready_to_scrape_next):
        self.queue = queue
        self.stop_event = stop_event
        self.ready_to_scrape_next = ready_to_scrape_next
        self.user_agent = user_agent
    def perform_jiggle_scroll(self,page):
        print("Đang dao động (Lên -> Xuống) để mồi bài viết mới...")
        scroll_up = random.randint(400, 700)
        page.mouse.wheel(0, -scroll_up) 
        time.sleep(random.uniform(2.0, 3.0)) 
        scroll_down = scroll_up + random.randint(400, 600)
        page.mouse.wheel(0, scroll_down)
        time.sleep(random.uniform(2.5, 4.0)) 
    def setup_clipboard_hook(self, page ):
        """Ghi đè hàm clipboard để bắt link từ nút Share"""
        page.evaluate("""
            window.captured_link_from_fb = "N/A";
            if (!navigator.clipboard) { navigator.clipboard = {}; }
            navigator.clipboard.writeText = function(text) {
                window.captured_link_from_fb = text;
                return Promise.resolve();
            };
        """)
    def switch_to_newest_mode(self, page):    
        try:
            sort_btn = page.locator('span:has-text("SẮP XẾP")').first 
            if sort_btn.is_visible():
                print(">>> Đã thấy nút 'SẮP XẾP'. Đang click...")
                sort_btn.click(force=True) 
                time.sleep(2) 
                newest_option = page.locator('span:has-text("Gần đây nhất"), span:has-text("Bài viết mới"), span:has-text("Mới nhất")').first
                
                if newest_option.is_visible():
                    print(f"Tìm thấy tùy chọn: {newest_option.inner_text()}")
                    newest_option.click()
                    print("Đã chọn 'Mới nhất'. Đang chờ tải lại trang...")
                    time.sleep(5) 
                    return True
                else:
                    print("Menu đã mở nhưng không thấy tùy chọn 'Gần đây nhất'.")
                    page.keyboard.press("Escape")
            else:

                if page.locator('span:has-text("Bài viết mới"), span:has-text("Gần đây nhất")').is_visible():
                    print("Đã ở sẵn chế độ Mới nhất.")
                    return True
                
                print("Không tìm thấy nút 'SẮP XẾP'.")
                
        except Exception as e:
            print(f"Lỗi khi chuyển chế độ sắp xếp: {e}")
        
        return False
    def collect_links_worker(self,STATE,BASE_URL,NUM_POSTS_TO_SCRAPE,PROXY_CONFIG):
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=False, channel="chrome",proxy=PROXY_CONFIG, args=["--disable-notifications"])
            context = browser.new_context(
                storage_state=STATE if os.path.exists(STATE) else None,
                user_agent=self.user_agent, 
                viewport={'width': 375, 'height': 812}
                )
            page = context.new_page()
            print(f"\n=== GIAI ĐOẠN 1: THU THẬP {NUM_POSTS_TO_SCRAPE} LINKS ===")
            page.goto(BASE_URL, wait_until="domcontentloaded")
            self.setup_clipboard_hook(page)
            time.sleep(10)
            seen_links = set()
            scroll_attempts = 0
            self.switch_to_newest_mode(page) 
            while len(seen_links) < NUM_POSTS_TO_SCRAPE: 
                if self.stop_event.is_set(): break 
                self.ready_to_scrape_next.wait() 
                
                share_button = page.locator(
                    'div[role="button"][aria-label*="share"]:not([data-processed]), '
                    'div[role="button"][aria-label*="Chia sẻ"]:not([data-processed])'
                ).first 
                
                try:
                    if not share_button.is_visible(timeout=2000):
                        raise Exception("Không thấy nút")
                except:
                    print(f">>> Không thấy bài mới... Đang thử gỡ kẹt ({len(seen_links)}/{NUM_POSTS_TO_SCRAPE})")
                    self.perform_jiggle_scroll(page)
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

                        print("ĐANG TẠM DỪNG: Hãy mở trình duyệt, cuộn tay hoặc gỡ lỗi (captcha/popup).")
                        input("Sau khi xử lý xong, hãy quay lại đây và nhấn ENTER để tiếp tục...")
                        scroll_attempts = 0
                        print("Tiếp tục chạy...")
                    
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
                        copy_btn.click()
                        time.sleep(3)
                        link = page.evaluate("window.captured_link_from_fb")
                        
                        if link != "N/A" and link not in seen_links:
                            clean_link = link.split('?')[0]
                            self.queue.put(clean_link)
                            seen_links.add(clean_link)
                            print(f"Link {len(seen_links)}: {clean_link}")
                            self.ready_to_scrape_next.clear() 
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
                    
            self.queue.put(None) 
