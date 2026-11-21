from flask import Flask, request, jsonify
from flask_cors import CORS
import json, os, pickle
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.naive_bayes import MultinomialNB
import numpy as np

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, '..', 'dataset', 'training_data.json')
MODEL_PATH = os.path.join(BASE_DIR, '..', 'model', 'model.pkl')
VEC_PATH   = os.path.join(BASE_DIR, '..', 'model', 'vectorizer.pkl')

def load_training_data():
    with open(DATA_PATH, 'r') as f:
        data = json.load(f)
    texts = [d['text'] for d in data]
    labels = [d['category'] for d in data]
    return texts, labels

def train_and_save():
    texts, labels = load_training_data()
    vectorizer = TfidfVectorizer(ngram_range=(1, 2), stop_words='english')
    X = vectorizer.fit_transform(texts)
    model = MultinomialNB()
    model.fit(X, labels)
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    with open(MODEL_PATH, 'wb') as f: pickle.dump(model, f)
    with open(VEC_PATH, 'wb') as f: pickle.dump(vectorizer, f)
    print("✅ Model trained and saved.")
    return model, vectorizer

def load_model():
    if os.path.exists(MODEL_PATH) and os.path.exists(VEC_PATH):
        with open(MODEL_PATH, 'rb') as f: model = pickle.load(f)
        with open(VEC_PATH, 'rb') as f: vectorizer = pickle.load(f)
        return model, vectorizer
    return train_and_save()

model, vectorizer = load_model()
texts, labels = load_training_data()

@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()
    query = data.get('query', '').strip()
    if not query:
        return jsonify({'error': 'Query is required'}), 400

    X_query = vectorizer.transform([query])
    probs = model.predict_proba(X_query)[0]
    classes = model.classes_

    top_indices = np.argsort(probs)[::-1][:2]
    results = [
        {'category': classes[i], 'confidence': round(float(probs[i]), 3)}
        for i in top_indices if probs[i] > 0.05
    ]

    if not results:
        results = [{'category': 'Technician', 'confidence': 0.5}]

    return jsonify({
        'query': query,
        'category': results[0]['category'],
        'confidence': results[0]['confidence'],
        'top_results': results
    })

@app.route('/retrain', methods=['POST'])
def retrain():
    global model, vectorizer, texts, labels
    model, vectorizer = train_and_save()
    texts, labels = load_training_data()
    return jsonify({'message': 'Model retrained successfully'})

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'model': 'TF-IDF + Naive Bayes', 'categories': list(set(labels))})

if __name__ == '__main__':
    print("🤖 SmartConnect ML API starting on port 5001...")
    app.run(host='0.0.0.0', port=5001, debug=True)
