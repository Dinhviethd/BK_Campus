import time
class FacebookSession:
    def __init__(self,path_cookie,email,passw):
        self.path_cookie = path_cookie
        self.email = email
        self.passw = passw  
        self.STATE = "fb_state_mbasic.json"
    def login(self,page,context):
        print(">>>Đang kiểm tra trạng thái đăng nhập...")
        try:
            page.goto("https://m.facebook.com/", wait_until="domcontentloaded")
            time.sleep(10)
            
            if "m_timeline" in page.content() or "Tạo tin" in page.content() or "Bảng tin" in page.title():
                print(">>>Đã có session đăng nhập cũ!")
                return True
            
            print("--- Tiến hành đăng nhập mới ---")
            if page.locator("input[name='email']").is_visible():
                page.fill("input[name='email']", self.email)
                page.fill("input[name='pass']", self.passw)
                page.click("button[name='login']")
                page.wait_for_timeout(8000)
            context.storage_state(path=self.STATE)
            return True
        except Exception as e:
            print(f"Lỗi đăng nhập: {e}")
            return False
        
            