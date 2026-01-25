### DATA PIPELINE:
## 1. Facebook Posts:
- Cào dữ liệu của 1 bài viết từ 1 group của facebook sử dụng playwright
data = {
    content : str
    image_url : str
    post_url : str
    <!-- time_posted : int  -->
}

## 2. ML Prefiltering: 
- Lọc sơ bộ những bài không liên quan đến mất đồ, tìm đồ.
- Dùng luật + re.
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
- So khớp giữa bài post "lost" và "found": Dùng mô hình OpenAI CLIP (phiên bản multilingual) để embedding "content", "ảnh" của post, từ đó dùng Semantic Search (Cosine Simularity) để tìm các bài tìm chủ của đồ khớp với 1 bài tìm đồ đó (có threshold nhất định).
- Embedding ra 2 vector: vector của ảnh, vector của content.
- Công thức để tính score tương đồng dựa theo trọng số khi so khớp tương ứng nội dung và ảnh của 2 bài:
Score = w1.Sim(Img, Img) + w2.Sim(Text, Img) + w3.KeywordMatch
- Có thể lưu các vector đã embed được vào VectorDB hoặc SQLDB để tránh embed lại.
- Input cho model: content: str, image_url : str 
- Output của thuật toán: probability:float của 2 bài được so sánh.
Với mỗi bài tìm đồ (Khóa ngoại) -> Có 1 bảng gồm thuộc tính của các tìm chủ đã được tính độ tương đồng + thêm thuộc tính "probability".


data = {
    id int [foreign key] -> Key of "lost"
    content : str
    image_url : str
    post_url : str
    time_posted : int 
    is_valid: Boolean
    clf_status = "found"
    probability : float
}

