from underthesea import word_tokenize
def vietnamese_tokenizer(text):
    # word_tokenize trả về list: ['Học máy', 'là', ...]
    tokens = word_tokenize(text)
    return tokens