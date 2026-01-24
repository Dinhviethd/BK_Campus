### DATA PIPELINE:
## 1. Facebook Posts:
data = {
    content : str
    image_url : str
    post_url : str
    <!-- time_posted : int  -->
}

## 2. ML Prefiltering: 
- Lọc sơ bộ những bài không liên quan đến mất đồ, tìm đồ. 
- Sử dụng TFIDF + SVM.
- Input: content : str
- Output: is_valid: Boolean
data = {
    content : str
    image_url : str
    post_url : str
    time_posted : int 
    is_valid: Boolean
}

## 3. Core1_Filtering:
- Phân loại bài viết có nhãn "is_valid = True" thành 3  class: lost, found, trash. Lost là bài viết của người mất đồ, Found là bài viết tìm được đồ và tìm chủ cho đồ đó, Trash là bài viết không liên quan. 
- Sử dụng model kết hợp kiến trúc CNN và NLP: Resnet + PhoBERT -> Training với dữ liệu được thu thập bằng Facebook Crawler.
- Chỉ có bài viết được phân loại là "lost", "found" mới được đăng lên web.
- Input: content: str, image_url : str 
- Output: clf_status : ["lost", "found", "trash"]
data = {
    content : str
    image_url : str
    post_url : str
    time_posted : int 
    is_valid: Boolean
    clf_status : ["lost", "found", "trash"]
}

## 4. Core2_Matching:

