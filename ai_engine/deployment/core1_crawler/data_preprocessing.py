import re
import numpy as np
# Input is after concat/read_csv --->>      index|Unnamed: 0|content|Label
# Output is index|content|Label with clean content
def preprocess_text(text):
    text = text.lower()
    text = re.sub(r'[^\w\s]', ' ', text)  # Loại bỏ dấu câu
    return text

def rule_based_filtering(text):
    text = text.lower()
    
    # 1. DANH SÁCH TỪ KHÓA CHẮC CHẮN LOẠI BỎ (NEGATIVE KEYWORDS)
    # Nếu bài viết chứa bất kỳ từ nào trong này -> RETURN 0
    
    strong_negative_keywords = [
        # --- Nhóm 1: Học vụ & Thủ tục (Xuất hiện nhiều nhất trong data của bạn) ---
        r'học phí', r'nộp tiền', r'biên lai',
        r'hủy học phần', r'hủy hp', r'đăng ký tín', r'đk tín', r'đkhp',
        r'bảo lưu', r'phúc khảo', r'xem điểm', r'nhập học',
        r'điểm rèn luyện', r'đrl', r'công tác xã hội', r'ctxh',
        r'sinh hoạt công dân', r'shcd', r'ngoại khóa',
        r'lịch thi', r'phòng đào tạo', r'pđt', r'khảo sát', r'bhyt',
        
        # --- Nhóm 2: Chứng chỉ & Môn học đặc thù ---
        r'vstep', r'toeic', r'ielts', r'mos', r'ic3', # Chứng chỉ
        r'đầu ra', r'chuẩn đầu ra',
        r'giáo dục quốc phòng', r'gdqp', r'quân sự',
        r'thể dục', r'bóng đá', r'bóng chuyền', r'cầu lông',
        r'triết học', r'tư tưởng', r'mac-lenin', r'pháp luật',
        
        # --- Nhóm 3: Tài liệu & Giáo trình ---
        r'giáo trình', r'tài liệu', r'đề cương', r'đáp án', 
        r'slide', r'xin file', r'ebook', r'sách cũ', r'tiểu luận',
        
        # --- Nhóm 4: Mua bán & Rao vặt (Market) ---
        r'pass lại', r'pass đồ', r'thanh lý', r'nhượng lại', 
        r'cần mua', r'thu mua', r'gom order', r'tuyển dụng', 
        r'tìm việc', r'việc làm', r'cho thuê', r'tìm trọ',
        r'pass',
        
        # --- Nhóm 5: Tình cảm & Đời sống (Social) ---
        r'tỏ tình', r'crush', r'người yêu', r'nyc', r'thả thính',
        r'kết bạn', r'làm quen', r'tâm sự', 
        r'review', r'bóc phốt', r'drama',
        
        # --- Nhóm 6: Các cụm từ chứa "mất/tìm" nhưng KHÔNG phải mất đồ ---
        r'mất gốc',   # Mất gốc kiến thức
        r'mất ngủ',   # Mất ngủ
        r'mất mạng',  # Mất internet
        r'tìm in4', r'tìm info', # Tìm thông tin trai xinh gái đẹp
        r'tìm bạn', r'tìm người',
        r'tìm nhóm'   # Tìm nhóm làm bài tập
    ]
    
    # Kiểm tra: Nếu dính từ khóa "cấm" -> Loại ngay
    for pattern in strong_negative_keywords:
        if re.search(pattern, text):
            return 0  # Label 0: Không liên quan
            
    # 2. (Tùy chọn) KIỂM TRA TÍCH CỰC - POSITIVE KEYWORDS
    # Nếu muốn chắc chắn hơn, chỉ giữ lại bài có từ liên quan đến đồ đạc/hành động
    # Tuy nhiên, để Recall cao (không sót bài), ta thường bỏ qua bước này hoặc để lỏng.
    # Ở đây tôi cho qua (Return 1) để các model ML phía sau xử lý tiếp.
    
    return 1  # Label 1: Có khả năng liên quan (Giữ lại)

def preprocessing(df):
    df.dropna(subset=['content'], inplace=True)
    df.drop_duplicates(subset=['content'], inplace=True)
    df.drop(["Unnamed: 0"], axis=1, inplace=True)
    df['content'] = df['content'].astype(str)

    df['prefilter'] = df['content'].apply(rule_based_filtering)
    df = df[df['prefilter'] != 0].copy()
    df.drop(['prefilter'], axis=1, inplace=True)

    df['content'] = df['content'].apply(preprocess_text)

    return df