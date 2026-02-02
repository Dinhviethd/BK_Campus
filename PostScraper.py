import re
from bs4 import BeautifulSoup
import time
import random
import os
import csv
from playwright.sync_api import sync_playwright
class PostScraper:

    def __init__(self,user_agent,queue,stop_event,ready_to_scrape_next,TIME_LIMIT):
        self.user_agent = user_agent    
        self.queue = queue
        self.stop_event = stop_event
        self.ready_to_scrape_next = ready_to_scrape_next
        self.TIME_LIMIT = TIME_LIMIT

    def clean_fb_text(self,text):
        if not text:
            return ""
        text = re.sub(r'(\d)([\U0000E000-\U0010FFFF\u200e\u200f\u202a-\u202e\u200b-\u200d\ufeff]+)(\d)', 
                    r'\1 \3', text)
        text = re.sub(r'[\U0000E000-\U0010FFFF]', '', text)
        text = re.sub(r'[\u200e\u200f\u202a-\u202e\u200b-\u200d\ufeff]', '', text)
        text = re.sub(r'\s+', ' ', text)
        return text.strip()
    
    def parse_time_to_minutes(self,time_str):

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
            return value * multipliers.get(unit, 0)        
        return 0
    


    def check_is_older_than_limit(self,time_str, limit_str):

        post_minutes = self.parse_time_to_minutes(time_str)
        
        limit_minutes = self.parse_time_to_minutes(limit_str)
        if post_minutes == 0:
            return False
        return post_minutes > limit_minutes
    


    
    def extract_post_data(self,html_content, url):
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
            author_block = self.clean_fb_text(author_block_raw)
            
            time_match = time_pattern.search(author_block)
            if time_match:
                post_time = f"{time_match.group(1)} {time_match.group(2)}"
        
        # Nếu không tìm thấy, thử các div xung quanh
        if post_time == "N/A":
            for idx in range(max(0, 3), min(len(native_texts), 7)):
                text_raw = native_texts[idx].get_text()
                text = self.clean_fb_text(text_raw)
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
            text = self.clean_fb_text(native_texts[idx].get_text())
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
    

    def process_post_page(self , page, url):
        print(f"\n=== CÀO BÀI VIẾT===")
        post_id = url.split('/')[-2] if '/' in url else None
        print(f"Đang xử lý: {post_id}...", end=" ")
        
        try:
            page.goto(url, wait_until="networkidle")
            time.sleep(3) 
            #save_debug_html(page, post_id)
            html_content = page.content()
            result = self.extract_post_data(html_content, url)
            print(f"[{result['time']}] {result['content'][:40]}... | Ảnh: {'✅' if result['image_url'] != 'N/A' else '❌'}")
            time.sleep(random.uniform(2, 4))
            if self.check_is_older_than_limit(result['time'],self.TIME_LIMIT):
                return f"time_old"
            return result
            
        except Exception as e:
            print(f"Lỗi: {e}")
            return {
                "link": url,
                "content": "Error",
                "image_url": "N/A",
                "time": "N/A"
            }
        
    def scrape_feed_hook(self,STATE,ai_post_filter,supabase_client,PROXY_CONFIG): 
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=False, channel="chrome", proxy=PROXY_CONFIG, args=["--disable-notifications"])
            context = browser.new_context(
                storage_state=STATE if os.path.exists(STATE) else None,
                user_agent=self.user_agent, 
                viewport={'width': 375, 'height': 812})
            page = context.new_page()
            while not self.stop_event.is_set():
                url = self.queue.get()
                if url is None:
                    print("\nĐã xử lý hết link. Đóng luồng cào...")
                    break
                data = self.process_post_page(page, url)
                if isinstance(data, str) and data == f"time_old":
                    print(f"  GẶP BÀI QUÁ {self.TIME_LIMIT} PHÚT → DỪNG TOÀN BỘ PIPELINE")
                    self.stop_event.set()          
                    self.queue.task_done()

                    self.queue.put(None)
                    self.ready_to_scrape_next.set()
                    break 
                is_valid, reason =ai_post_filter.check_post_quality(data['content'])
                data['filter_reason'] = reason
                if is_valid:
                    print(f"   >>> GIỮ BÀI: {reason}")
                    # --- SUPABASE INTEGRATION ---
                    # Chỉ đẩy lên DB những bài hợp lệ (đã qua lọc rác)
                    #supabase_client.save_to_supabase(data) 
                # ----------------------------
                else:
                    print(f"   >>> LOẠI BỎ: {reason}")
                self.queue.task_done()
                self.ready_to_scrape_next.set()

