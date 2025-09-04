from flask import Flask, request, jsonify
from sentence_transformers import SentenceTransformer

# Khởi tạo ứng dụng Flask
app = Flask(__name__)

# Khởi tạo mô hình Sentence Transformer (sử dụng mô hình 'all-MiniLM-L6-v2')
model = SentenceTransformer('all-MiniLM-L6-v2')

@app.route('/embedding', methods=['POST'])
def get_embedding():
    # Lấy dữ liệu JSON từ request
    data = request.get_json()
    
    # Kiểm tra nếu không có key 'query' thì trả về lỗi
    if not data or 'query' not in data:
        return jsonify({'error': 'Thiếu tham số "query"'}), 400

    query = data['query']
    
    try:
        # Tính toán embedding cho câu truy vấn
        embedding = model.encode(query)
        # Chuyển embedding thành list để có thể JSON hóa được
        embedding_list = embedding.tolist()
        
        return jsonify({'embedding': embedding_list})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Chạy server Flask trên cổng 5000
    app.run(host='0.0.0.0', port=5050, debug=True)
