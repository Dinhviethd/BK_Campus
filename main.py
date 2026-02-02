import threading
import queue
import os
import time
from playwright.sync_api import sync_playwright
from dotenv import load_dotenv
from underthesea import word_tokenize

# Import modules
from LinkCollector import LinkCollector
from PostScraper import PostScraper
from SaveSupaBase import SaveSupaBase
from PostFilter import PostFilter  # <--- Import thêm cái này
from proxy import proxy
from FacebookSession import FacebookSession
# Load Config
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
PROXY_API_KEY = os.getenv("PROXY_API_KEY")
EMAIL = os.getenv("FB_EMAIL")
PASSWORD = os.getenv("FB_PASS")
USER_AGENT = "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1"
NUM_POSTS_TO_SCRAPE = 1200
TIME_LIMIT = "6 tháng"
BASE_URL = "https://www.facebook.com/groups/834179584828702"
STATE = "fb_state_mbasic.json"
MODEL_PATH = 'ml_model_svc.joblib' 


def vietnamese_tokenizer(text):
    # word_tokenize trả về list: ['Học máy', 'là', ...]
    tokens = word_tokenize(text)
    return tokens


if __name__ == "__main__":
    link_queue = queue.Queue()
    stop_event = threading.Event()
    ready_to_scrape_next = threading.Event()
    ready_to_scrape_next.set()
    proxy_client = proxy(PROXY_API_KEY)
    proxy_config = proxy_client.get_proxy_config()
    print("Giai đoạn 1: Đăng nhập để tạo Session...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, channel="chrome",proxy=proxy_config, args=["--disable-notifications"])
        context = browser.new_context(
            storage_state=STATE if os.path.exists(STATE) else None,
            user_agent=USER_AGENT, 
            viewport={'width': 375, 'height': 812}
            )
        page = context.new_page()
        
        fb_session = FacebookSession(STATE, EMAIL, PASSWORD)
        if fb_session.login(page, context):
            print("Đăng nhập thành công! Đã lưu Cookie.")
            browser.close() 
        else:
            print("Đăng nhập thất bại. Dừng chương trình.")
            exit(1)

    # 3. Khởi tạo các Object hỗ trợ
    print("Giai đoạn 2: Khởi tạo các module...")
    
    supabase_saver = SaveSupaBase(SUPABASE_URL, SUPABASE_KEY)
    
    ai_filter = PostFilter(MODEL_PATH)

    collector = LinkCollector(USER_AGENT, link_queue, stop_event, ready_to_scrape_next)
    scraper = PostScraper(USER_AGENT, link_queue, stop_event, ready_to_scrape_next, TIME_LIMIT)
    time.sleep(40)  # Đợi một chút để chắc chắn session đã được lưu
    proxy_config = proxy_client.get_proxy_config()

    t1 = threading.Thread(
        target=collector.collect_links_worker,
        args=(STATE,BASE_URL, NUM_POSTS_TO_SCRAPE, proxy_config), 
        daemon=True
    )

    # Thread 2: Cào bài viết
    t2 = threading.Thread(
        target=scraper.scrape_feed_hook,
        args=(STATE, ai_filter, supabase_saver, proxy_config), 
        daemon=True
    )

    print("Bắt đầu chạy đa luồng...")
    t1.start()
    t2.start()

    try:
        while t1.is_alive() or t2.is_alive():
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[!] Đang dừng chương trình...")
        stop_event.set()
        link_queue.put(None)
    
    print("Hoàn tất chương trình.")