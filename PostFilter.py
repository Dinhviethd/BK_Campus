from data_preprocessing import preprocess_text,rule_based_filtering
import joblib
from underthesea import word_tokenize

def vietnamese_tokenizer(text):
    # word_tokenize trả về list: ['Học máy', 'là', ...]
    tokens = word_tokenize(text)
    return tokens
class PostFilter:
    def __init__(self,path_model):
        self.path_model = path_model
        print(">>> Đang load AI Model...")
        try:
            self.AI_MODEL = joblib.load(self.path_model)
            print(">>> Load Model thành công!")
        except Exception as e:
            print(f"!!! Lỗi load model: {e}. Sẽ chạy chế độ chỉ cào (không lọc ML).")
            self.AI_MODEL = None
    def check_post_quality(self, content):
        if not content or len(content.strip()) < 10:
            return False, "Too short/Empty"

        is_pass_rule = rule_based_filtering(content)
        if is_pass_rule == 0:
            return False, "Rule-based Filtered"

        if self.AI_MODEL:
            try:
                clean_content = preprocess_text(content)
                prediction = self.AI_MODEL.predict([clean_content])[0]
                if prediction == 1:
                    return True, "AI Accepted"
                else:
                    return False, "AI Rejected"
            except Exception as e:
                print(f"Lỗi khi predict AI: {e}")
                return True, "Model Error (Kept)"
    
        return True, "No Model (Kept)"
