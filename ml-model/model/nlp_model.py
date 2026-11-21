"""
SmartConnect NLP Model — TF-IDF + Naive Bayes Classifier
Run: python model/nlp_model.py
"""
import json, os, pickle
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, '..', 'dataset', 'training_data.json')

with open(DATA_PATH, 'r') as f:
    data = json.load(f)

texts = [d['text'] for d in data]
labels = [d['category'] for d in data]

X_train, X_test, y_train, y_test = train_test_split(texts, labels, test_size=0.2, random_state=42, stratify=labels)

vectorizer = TfidfVectorizer(ngram_range=(1, 2), stop_words='english', max_features=1000)
X_train_vec = vectorizer.fit_transform(X_train)
X_test_vec  = vectorizer.transform(X_test)

clf = MultinomialNB()
clf.fit(X_train_vec, y_train)

y_pred = clf.predict(X_test_vec)
acc = accuracy_score(y_test, y_pred)

print(f"\n✅ Model Accuracy: {acc:.2%}")
print("\nClassification Report:")
print(classification_report(y_test, y_pred))

os.makedirs(os.path.join(BASE_DIR, '..', 'model'), exist_ok=True)
with open(os.path.join(BASE_DIR, '..', 'model', 'model.pkl'), 'wb') as f:
    pickle.dump(clf, f)
with open(os.path.join(BASE_DIR, '..', 'model', 'vectorizer.pkl'), 'wb') as f:
    pickle.dump(vectorizer, f)

print("✅ Model saved to model/model.pkl & model/vectorizer.pkl")

test_queries = [
    "fan not working at home",
    "pipe leakage bathroom",
    "AC not cooling",
    "need wooden wardrobe",
    "house construction plan",
]
print("\n--- Sample Predictions ---")
for q in test_queries:
    vec = vectorizer.transform([q])
    pred = clf.predict(vec)[0]
    prob = max(clf.predict_proba(vec)[0])
    print(f"  '{q}' → {pred} ({prob:.0%} confidence)")
