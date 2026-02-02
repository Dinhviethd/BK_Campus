from fastapi import FastAPI, BackgroundTasks, HTTPException
from pydantic import BaseModel
import uvicorn
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
from underthesea import word_tokenize
from dotenv import load_dotenv
from supabase import create_client, Client

# --- SETUP APP ---
app = FastAPI()
load_dotenv()

# --- CẤU HÌNH ---
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
FB_EMAIL = os.getenv("FB_EMAIL") # Nên lấy từ env
FB_PASS = os.getenv("FB_PASS")   # Nên lấy từ env
GROUP_ID = "ued.confessions" # Hoặc lấy từ env
BASE_URL = f"https://m.facebook.com/groups/{GROUP_ID}"
MODEL_PATH = 'ml_model_svc.joblib'
TIME_LIMIT = "30 phút" # Chạy mỗi 30p thì chỉ cần check bài trong 30p đổ lại
NUM_POSTS_TO_SCRAPE = 50 # Giới hạn số lượng để tránh timeout
USER_AGENT = "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1"

# Global Model
AI_MODEL = None
try:
    AI_MODEL = joblib.load(MODEL_PATH)
    print(">>> Load Model thành công!")
except:
    print("!!! Không tìm thấy model hoặc lỗi load.")

# Supabase Client
supabase_client = None
if SUPABASE_URL and SUPABASE_KEY:
    supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)

# --- CÁC HÀM HỖ TRỢ (GIỮ NGUYÊN LOGIC CŨ, RÚT GỌN CHO GỌN) ---
def clean_fb_text(text):
    if not text: return ""
    text = re.sub(r'(\d)([\U0000E000-\U0010FFFF\u200e\u200f\u202a-\u202e\u200b-\u200d\ufeff]+)(\d)', r'\1 \3', text)
    text = re.sub(r'[\U0000E000-\U0010FFFF]', '', text)
    text = re.sub(r'[\u200e\u200f\u202a-\u202e\u200b-\u200d\ufeff]', '', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def preprocess_text(text):
    text = text.lower()
    text = re.sub(r'[^\w\s]', ' ', text)
    return text

def parse_time_to_minutes(time_str):
    if not time_str or time_str == "N/A": return 0
    s = time_str.lower().strip()
    if "vừa xong" in s or "giây" in s: return 0
    multipliers = {"phút": 1, "giờ": 60, "ngày": 1440, "tuần": 10080, "tháng": 43200, "năm": 525600}
    match = re.search(r"(\d+)\s*(phút|giờ|ngày|tuần|tháng|năm)", s)
    if match: return int(match.group(1)) * multipliers.get(match.group(2), 0)
    return 0

def check_is_older_than_limit(time_str, limit_str=TIME_LIMIT):
    post_minutes = parse_time_to_minutes(time_str)
    limit_minutes = parse_time_to_minutes(limit_str)
    if post_minutes == 0: return False
    return post_minutes > limit_minutes

def extract_post_data(html_content, url):
    # ... (Copy nguyên hàm extract_post_data từ code cũ của bạn vào đây) ...
    # Để tiết kiệm không gian tôi không paste lại, hãy dùng hàm cũ
    soup = BeautifulSoup(html_content, 'html.parser')
    # ... logic xử lý soup ...
    # Return dictionary kết quả
    pass 

def process_post_page(page, url):
    try:
        page.goto(url, wait_until="networkidle")
        # time.sleep(2) # Giảm sleep trên server
        html_content = page.content()
        # Lưu ý: Cần paste hàm extract_post_data vào file này để chạy
        result = extract_post_data(html_content, url) 
        
        if check_is_older_than_limit(result['time'], TIME_LIMIT):
            return "STOP_LIMIT_REACHED"
        return result
    except Exception as e:
        print(f"Lỗi trang {url}: {e}")
        return None

def save_to_supabase(data, post_type):
    if not supabase_client: return
    try:
        post_payload = {
            "source": "FACEBOOK_CRAWL", 
            "original_url": data['link'],
            "content": data['content'],
            "status": "PROCESSING",
            "type": post_type
        }
        res = supabase_client.table("posts").insert(post_payload).execute()
        if res.data and data['image_url'] != "N/A":
            supabase_client.table("post_images").insert({
                "post_id": res.data[0]['id'], "url": data['image_url']
            }).execute()
        print(f">>> Đã lưu ID: {res.data[0]['id']}")
    except Exception as e:
        print(f"Lỗi Supabase: {e}")

# --- LOGIC CRAWL CHÍNH (ĐƯỢC GỌI BỞI API) ---
def run_crawler_task():
    print(">>> BẮT ĐẦU JOB CRAWL (Headless)...")
    
    with sync_playwright() as p:
        # QUAN TRỌNG: Server không có màn hình -> headless=True
        browser = p.chromium.launch(headless=True, args=["--disable-notifications", "--no-sandbox"])
        context = browser.new_context(
            user_agent=USER_AGENT,
            viewport={'width': 375, 'height': 812},
            locale='vi-VN'
        )
        page = context.new_page()

        # 1. Đăng nhập
        try:
            page.goto("https://m.facebook.com/", wait_until="domcontentloaded")
            if page.locator("input[name='email']").is_visible():
                print(">>> Đang đăng nhập...")
                page.fill("input[name='email']", FB_EMAIL)
                page.fill("input[name='pass']", FB_PASS)
                page.click("button[name='login']")
                page.wait_for_timeout(5000)
        except Exception as e:
            print(f"Lỗi login: {e}")
            return

        # 2. Vào Group lấy link
        print(">>> Vào group lấy link...")
        page.goto(BASE_URL, wait_until="domcontentloaded")
        # Logic click Sắp xếp -> Mới nhất (Giữ nguyên logic cũ của bạn ở đây)
        # ... (Tóm tắt: scroll và lấy link vào list `links`) ...
        
        # Code đơn giản hóa để demo logic flow:
        links = []
        # Giả lập lấy link (Bạn paste logic collect_links_worker vào đây, nhưng bỏ while true)
        # Thay vào đó, scroll khoảng 5-10 lần để lấy 20-30 bài mới nhất
        for _ in range(5):
            page.mouse.wheel(0, 1000)
            time.sleep(1)
            # Logic extract link (copy từ code cũ)...
            # links.append(found_link)
        
        print(f">>> Tìm thấy {len(links)} link tiềm năng.")

        # 3. Duyệt từng link
        for link in links:
            print(f">>> Xử lý: {link}")
            data = process_post_page(page, link)
            
            if data == "STOP_LIMIT_REACHED":
                print(">>> Gặp bài cũ -> DỪNG JOB.")
                break
            
            if data and isinstance(data, dict):
                # Predict
                pred_type = "N/A"
                if AI_MODEL:
                    clean = preprocess_text(data['content'])
                    pred = AI_MODEL.predict([clean])[0]
                    if pred == 1: pred_type = "FOUND"
                    elif pred == 2: pred_type = "LOST"
                
                # Filter & Save
                if pred_type in ["LOST", "FOUND"]: # Chỉ lưu bài có nghĩa
                    save_to_supabase(data, pred_type)

        browser.close()
    print(">>> KẾT THÚC JOB.")

# --- API ENDPOINTS ---

@app.get("/")
def health_check():
    return {"status": "ok", "service": "FB Crawler"}

@app.post("/trigger-crawl")
def trigger_crawl(background_tasks: BackgroundTasks, secret_key: str):
    # Bảo mật đơn giản để người lạ không kích hoạt bừa
    if secret_key != os.getenv("API_SECRET_KEY", "default_secret"):
        raise HTTPException(status_code=403, detail="Invalid Secret")
    
    # Chạy ngầm để API trả về ngay lập tức (tránh timeout 60s của HTTP)
    background_tasks.add_task(run_crawler_task)
    return {"message": "Crawl job started in background"}