import os
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from sentence_transformers import SentenceTransformer
import faiss
import numpy as np
from models import HistoricalDataModel, QueryModel, PyObjectId
from typing import List

# 1. Load ENV
from dotenv import load_dotenv
load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
DB_NAME      = os.getenv("DB_NAME")
COL_NAME     = os.getenv("COL_NAME")

# 2. Khởi tạo app và CORS
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Kết nối MongoDB
client = MongoClient(MONGODB_URI)
db = client[DB_NAME]
col = db[COL_NAME]

# 4. Load mô hình NLP
model = SentenceTransformer('all-MiniLM-L6-v2')

# 5. Tải embeddings và xây FAISS index
docs = list(col.find({'embedding': {'$exists': True}}, {'_id':1,'embedding':1,'name':1,'description':1,'additionalInfo':1}))
ids  = [str(d['_id']) for d in docs]
embs = np.array([d['embedding'] for d in docs], dtype='float32')
faiss.normalize_L2(embs)
dim   = embs.shape[1]
index = faiss.IndexFlatIP(dim)
index.add(embs)


@app.get("/")
def healthcheck():
    return {"status": "ok", "message": "API is running"}
# --- CRUD Endpoints ---

@app.post("/historical/bulk", response_model=List[HistoricalDataModel])
def bulk_insert(records: List[HistoricalDataModel]):
    payload = [r.dict(by_alias=True, exclude={"id"}) for r in records]
    res = col.insert_many(payload)
    return list(col.find({"_id": {"$in": res.inserted_ids}}))

@app.get("/historical", response_model=List[HistoricalDataModel])
def get_all():
    return list(col.find())

@app.get("/historical/{item_id}", response_model=HistoricalDataModel)
def get_one(item_id: str):
    doc = col.find_one({"_id": PyObjectId.validate(item_id)})
    if not doc:
        raise HTTPException(404, "Not found")
    return doc

@app.put("/historical/{item_id}", response_model=HistoricalDataModel)
def update(item_id: str, record: HistoricalDataModel):
    updated = col.find_one_and_replace(
        {"_id": PyObjectId.validate(item_id)},
        record.dict(by_alias=True, exclude={"id"}),
        return_document=True
    )
    if not updated:
        raise HTTPException(404, "Not found")
    return updated

@app.delete("/historical/{item_id}")
def delete(item_id: str):
    res = col.delete_one({"_id": PyObjectId.validate(item_id)})
    if res.deleted_count==0:
        raise HTTPException(404, "Not found")
    return {"message":"Deleted"}

# --- Lexical Search ---

@app.get("/historical/search", response_model=List[HistoricalDataModel])
def lexical_search(q: str = Query(..., min_length=1)):
    regex = { "$regex": q, "$options": "i" }
    cursor = col.find({ "$or": [
        {"name": regex},
        {"additionalInfo.aliases": regex}
    ]}).limit(5)
    return list(cursor)

# --- FAISS Semantic Search ---

@app.post("/historical/faiss_search")
def faiss_search(body: QueryModel):
    q, top_k, thr = body.query, body.top_k, body.threshold
    # embed & normalize
    q_emb = model.encode(q).astype('float32').reshape(1,-1)
    faiss.normalize_L2(q_emb)
    D, I = index.search(q_emb, top_k)
    results = []
    for score, idx in zip(D[0], I[0]):
        if score < thr: continue
        d = docs[idx]
        results.append({
            "record": {
              "_id": ids[idx],
              "name": d['name'],
              "description": d['description'],
              "additionalInfo": d.get('additionalInfo',{})
            },
            "similarity": float(score)
        })
    return results or {"message":"No match"}

# --- Fallback Hybrid Semantic Search (lexical + FAISS) ---

@app.get("/historical/semantic")
def hybrid_search(q: str = Query(..., min_length=1), top_k: int = 5, threshold: float = 0.6):
    # 1. Lexical
    regex = { "$regex": q, "$options": "i" }
    lex = list(col.find({ "$or":[{"name":regex},{"additionalInfo.aliases":regex}]}).limit(5))
    if lex:
        return [{"record":r,"similarity":1.0} for r in lex]

    # 2. FAISS
    body = QueryModel(query=q, top_k=top_k, threshold=threshold)
    return faiss_search(body)

# --- Rebuild FAISS Index (nếu update embedding) ---

@app.post("/historical/rebuild_index")
def rebuild_index():
    global docs, ids, embs, index
    docs = list(col.find({'embedding': {'$exists': True}}, {'_id':1,'embedding':1,'name':1,'description':1,'additionalInfo':1}))
    ids  = [str(d['_id']) for d in docs]
    embs = np.array([d['embedding'] for d in docs], dtype='float32')
    faiss.normalize_L2(embs)
    index = faiss.IndexFlatIP(embs.shape[1])
    index.add(embs)
    return {"message":"Index rebuilt", "count": len(docs)}

# --- Run server ---
@app.on_event("startup")
def check_db():
    try:
        # Gọi một lệnh đơn giản
        col.count_documents({})
        print("✅ MongoDB kết nối OK")
    except Exception as e:
        print("❌ MongoDB connection error:", e)
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
