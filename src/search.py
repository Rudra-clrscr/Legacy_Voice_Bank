import re
import math
import numpy as np
from src.gemini_service import rank_clips_with_gemini

def tokenize(text: str) -> list:
    """Tokenizes and cleans text into lowercase alphanumeric words."""
    if not text:
        return []
    text = text.lower()
    return re.findall(r'\b\w+\b', text)

def local_tfidf_search(query: str, clips: list, threshold: float = 0.12) -> dict:
    """
    Performs a local TF-IDF document retrieval on a list of clips.
    Each clip is a dict with 'id' and 'transcript'.
    Returns a dict: {"found": bool, "clip_id": str, "score": float}
    """
    if not clips or not query:
        return {"found": False, "clip_id": None, "score": 0.0}

    query_tokens = tokenize(query)
    if not query_tokens:
        return {"found": False, "clip_id": None, "score": 0.0}

    # Prepare document token lists
    docs = []
    for clip in clips:
        docs.append((clip["id"], tokenize(clip.get("transcript", ""))))

    # Compute vocabulary
    vocab = set(query_tokens)
    for _, tokens in docs:
        vocab.update(tokens)
    vocab = list(vocab)
    vocab_index = {word: i for i, word in enumerate(vocab)}

    # Compute Document Frequencies (DF) for IDF calculation
    df = {}
    for word in vocab:
        df[word] = 0
        for _, tokens in docs:
            if word in tokens:
                df[word] += 1

    # Compute IDF
    num_docs = len(docs)
    idf = {}
    for word in vocab:
        # smooth idf
        idf[word] = math.log((1 + num_docs) / (1 + df[word])) + 1

    # Helper to calculate TF-IDF vector
    def get_tfidf_vector(tokens):
        vec = np.zeros(len(vocab))
        if not tokens:
            return vec
        # TF counts
        counts = {}
        for t in tokens:
            counts[t] = counts.get(t, 0) + 1
        # Calculate TF-IDF
        for t, count in counts.items():
            if t in vocab_index:
                # TF normalization
                tf = count / len(tokens)
                vec[vocab_index[t]] = tf * idf[t]
        return vec

    # Vectorize query
    query_vec = get_tfidf_vector(query_tokens)
    query_norm = np.linalg.norm(query_vec)
    if query_norm == 0:
        return {"found": False, "clip_id": None, "score": 0.0}

    best_clip_id = None
    best_score = 0.0

    # Vectorize and compare documents
    for doc_id, doc_tokens in docs:
        doc_vec = get_tfidf_vector(doc_tokens)
        doc_norm = np.linalg.norm(doc_vec)
        if doc_norm == 0:
            continue
        
        # Cosine Similarity
        similarity = np.dot(query_vec, doc_vec) / (query_norm * doc_norm)
        if similarity > best_score:
            best_score = similarity
            best_clip_id = doc_id

    # Check threshold
    if best_score >= threshold:
        return {
            "found": True,
            "clip_id": best_clip_id if isinstance(best_clip_id, str) else str(best_clip_id),
            "score": float(best_score)
        }
    
    return {"found": False, "clip_id": None, "score": float(best_score)}

def retrieve_relevant_clip(query: str, clips: list) -> dict:
    """
    Orchestrates search: tries Gemini LLM ranking first, and falls back to TF-IDF.
    """
    # 1. Try Gemini
    gemini_result = rank_clips_with_gemini(query, clips)
    if "error" not in gemini_result and gemini_result.get("found"):
        return {
            "found": True,
            "clip_id": gemini_result.get("clip_id"),
            "score": gemini_result.get("score", 0.0),
            "method": "gemini"
        }

    # 2. Fallback to Local TF-IDF Search
    local_result = local_tfidf_search(query, clips)
    local_result["method"] = "local_tfidf"
    return local_result
