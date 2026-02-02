import requests
import time
class proxy: 
    def __init__(self,API_KEY): 
        self.PROXY_API_KEY = API_KEY
    def get_proxy_config(self):
        print(">>> 🔄 Đang gọi API lấy Proxy...")
        api_url = f"https://proxyxoay.shop/api/get.php?key={self.PROXY_API_KEY}&nhamang=Random&tinhthanh=0"

        try:
            resp = requests.get(api_url, timeout=30).json()
            if resp.get('status') == 100:
                raw_proxy = resp['proxyhttp'] # Dạng IP:Port:User:Pass
                print(f"Đã lấy Proxy: {raw_proxy}")
                parts = raw_proxy.split(':')
                ip, port = parts[0], parts[1]
                config = {"server": f"http://{ip}:{port}"}
                if len(parts) >= 4 and parts[2] and parts[3]:
                    config["username"] = parts[2]
                    config["password"] = parts[3]
                return config
            elif resp.get('status') == 101:
                wait_msg = resp.get('message', 'Wait')
                print(f"   ⏳ {wait_msg}. Đang đợi 60s để lấy IP mới...")
                time.sleep(60)
                return self.get_proxy_config()
            else:
                print(f" Lỗi API Proxy: {resp}")
                return None
        except Exception as e:
            print(f"!!! Lỗi kết nối API Proxy: {e}")
            return None