from supabase import create_client, Client
class SaveSupaBase:
    def __init__(self,supabase_url,supabase_key):
        self.supabase_url = supabase_url
        self.supabase_key = supabase_key
        self.supabase_client: Client = None
        if self.supabase_url and self.supabase_key:
            try:
                supabase_client = create_client(self.supabase_url, self.supabase_key)
                print(">>> Kết nối Supabase thành công!")
            except Exception as e:
                print(f"!!!Lỗi kết nối Supabase: {e}")
        else:
            print("!!!Không tìm thấy cấu hình SUPABASE_URL hoặc SUPABASE_KEY trong .env")
    def save_to_supabase(self,data):
        if not self.supabase_client:
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
            response = self.supabase_client.table("posts").insert(post_payload).execute()
            
            if not response.data:
                print("   >>>Warning: Insert bài viết không trả về data.")
                return

            new_post_id = response.data[0]['id'] # Lấy UUID vừa tạo [cite: 7]

            # 2. Chuẩn bị payload cho bảng POST_IMAGES (nếu có ảnh) 
            if data['image_url'] and data['image_url'] != "N/A":
                image_payload = {
                    "post_id": new_post_id,
                    "url": data['image_url']
                }
                self.supabase_client.table("post_images").insert(image_payload).execute()
            
            print(f"   >>>Đã đẩy lên Supabase thành công! (ID: {new_post_id})")

        except Exception as e:
            print(f"   >>>Lỗi khi lưu vào Supabase: {e}")