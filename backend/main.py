import os
import re
import uuid
import json
from typing import List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import numpy as np
from youtube_transcript_api import YouTubeTranscriptApi
from sentence_transformers import SentenceTransformer
import faiss
import requests

app = FastAPI(title="AI Video Assistant Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:5174',
        'http://127.0.0.1:5174',
    ],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

SESSIONS_DIR = os.path.join(os.path.dirname(__file__), 'sessions')
os.makedirs(SESSIONS_DIR, exist_ok=True)

# Load embeddings model (will download on first run)
EMBED_MODEL_NAME = os.getenv('EMBED_MODEL', 'all-MiniLM-L6-v2')
embed_model = SentenceTransformer(EMBED_MODEL_NAME)


class LoadVideoRequest(BaseModel):
    youtube_url: str


class LoadVideoResponse(BaseModel):
    session_id: str


class ChatRequest(BaseModel):
    session_id: str
    question: str


def extract_video_id(url: str) -> str:
    # Handles youtube.com/watch?v=ID and youtu.be/ID
    m = re.search(r'(?:v=|youtu\.be/)([A-Za-z0-9_-]{6,20})', url)
    if m:
        return m.group(1)
    # fallback: take last path segment
    parts = url.split('/')
    return parts[-1]


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        chunk = words[i:i + chunk_size]
        chunks.append(' '.join(chunk))
        i += chunk_size - overlap
    return chunks


def requested_point_count(question: str) -> int | None:
    match = re.search(r'\b(\d{1,2})\s*(?:point|points|bullet|bullets)\b', question.lower())
    if not match:
        return None
    count = int(match.group(1))
    if 1 <= count <= 10:
        return count
    return None


def requested_sentence_count(question: str) -> int:
    lower = question.lower()
    match = re.search(r'\b(\d{1,2})\s*(?:sentence|sentences)\b', lower)
    if match:
        count = int(match.group(1))
        return max(1, min(count, 12))

    if re.search(r'\b(long|detailed|in detail|explain|comprehensive)\b', lower):
        return 8

    return 5


def concise_answer_from_hits(question: str, hits: List[str], max_sentences: int = 5, max_chars: int | None = None) -> str:
    if not hits:
        return "I could not find a clear answer in the video transcript."

    stopwords = {
        'the', 'and', 'for', 'that', 'this', 'with', 'from', 'your', 'video', 'short', 'main',
        'give', 'takeaways', 'about', 'what', 'how', 'are', 'was', 'were', 'you', 'can',
        'please', 'summary', 'summarize', 'into', 'just', 'tell'
    }
    question_lower = question.lower()
    keyword_set = {
        w for w in re.findall(r'[a-zA-Z0-9]+', question_lower)
        if (len(w) > 2 or w.isdigit()) and w not in stopwords
    }
    digit_parts = re.findall(r'\d+', question_lower)
    for part in digit_parts:
        keyword_set.add(part)
    if len(digit_parts) >= 2:
        keyword_set.add(''.join(digit_parts[:2]))
    candidates = []
    fallback_candidates = []
    noise_markers = ('subscribe', 'patreon', 'like button', 'membership', 'link in the description')
    is_summary_request = bool(re.search(r'\b(summary|summarize|takeaways|main point|what is .*about)\b', question.lower()))
    point_count = requested_point_count(question)
    if point_count:
        is_summary_request = True

    # For explicit detailed/long requests, return multi-paragraph grounded excerpts.
    if requested_sentence_count(question) >= 7 and not is_summary_request:
        detailed_sections = []
        for hit in hits[:4]:
            sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', hit) if s.strip()]
            filtered = [
                re.sub(r'\s+', ' ', s).strip()
                for s in sentences
                if len(s.strip()) > 25 and not any(marker in s.lower() for marker in noise_markers)
            ]
            if filtered:
                detailed_sections.append(' '.join(filtered[:4]))
            if len(detailed_sections) == 3:
                break

        if detailed_sections:
            return '\n\n'.join(detailed_sections)

    for hit in hits[:3]:
        sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', hit) if s.strip()]
        for sentence in sentences:
            if any(marker in sentence.lower() for marker in noise_markers):
                continue

            clean_sentence = re.sub(r'\s+', ' ', sentence).strip(' -')
            if len(clean_sentence) < 30:
                continue

            words = set(re.findall(r'[a-zA-Z0-9]+', sentence.lower()))
            score = len(keyword_set & words)
            length_bonus = min(len(clean_sentence) / 120.0, 1.0)
            final_score = score + length_bonus

            fallback_candidates.append((final_score, clean_sentence))
            if keyword_set:
                if score > 0:
                    candidates.append((final_score, clean_sentence))
            else:
                candidates.append((final_score, clean_sentence))

    if is_summary_request:
        wanted = point_count or 5
        pool = candidates if candidates else fallback_candidates
        ranked = sorted(pool, key=lambda item: item[0], reverse=True)

        chosen = []
        seen = set()
        for _, sentence in ranked:
            key = sentence.lower()
            if key in seen:
                continue
            seen.add(key)
            chosen.append(sentence)
            if len(chosen) == wanted:
                break

        # Backfill to match requested point count when possible.
        if len(chosen) < wanted:
            for _, sentence in sorted(fallback_candidates, key=lambda item: item[0], reverse=True):
                key = sentence.lower()
                if key in seen:
                    continue
                seen.add(key)
                chosen.append(sentence)
                if len(chosen) == wanted:
                    break

        if not chosen:
            return "I could not find enough relevant lines in the transcript to summarize."

        lines = []
        for idx, sentence in enumerate(chosen[:wanted], start=1):
            lines.append(f"{idx}. {sentence}")
        return '\n'.join(lines)

    if not candidates:
        first_hit_sentences = [
            s.strip() for s in re.split(r'(?<=[.!?])\s+', hits[0])
            if s.strip() and not any(marker in s.lower() for marker in noise_markers)
        ]
        base = ' '.join(first_hit_sentences[:max_sentences]) if first_hit_sentences else hits[0]
    else:
        best = sorted(candidates, key=lambda item: (item[0], len(item[1])), reverse=True)[:max_sentences]
        base = ' '.join([sentence for _, sentence in best])

    base = re.sub(r'\s+', ' ', base).strip()
    if max_chars and len(base) > max_chars:
        return base[: max_chars - 1].rstrip() + '…'
    return base


def session_paths(session_id: str):
    base = os.path.join(SESSIONS_DIR, session_id)
    return {
        'dir': base,
        'index': os.path.join(base, 'index.faiss'),
        'meta': os.path.join(base, 'meta.json'),
    }


@app.post('/load-video', response_model=LoadVideoResponse)
def load_video(req: LoadVideoRequest):
    youtube_url = req.youtube_url
    if not youtube_url:
        raise HTTPException(status_code=400, detail='youtube_url is required')

    video_id = extract_video_id(youtube_url)
    try:
        # The youtube_transcript_api package has changed interfaces across versions.
        # Try a few common call patterns to support more environments.
        try:
            transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=['en'])
        except AttributeError:
            # older/newer API: instantiate and call fetch()
            try:
                ytt_api = YouTubeTranscriptApi()
                raw = ytt_api.fetch(video_id, languages=['en'])
                # some implementations return an object with to_raw_data()
                transcript = getattr(raw, 'to_raw_data', lambda: raw)()
            except Exception:
                # as a final attempt, try the module-level fetch function
                transcript = YouTubeTranscriptApi.fetch(video_id)
        except Exception as e:
            raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f'Could not fetch transcript: {e}')

    # Join texts
    full_text = ' '.join([t.get('text', '') for t in transcript])
    chunks = chunk_text(full_text, chunk_size=400, overlap=80)

    # Embed chunks
    embeddings = embed_model.encode(chunks, convert_to_numpy=True, show_progress_bar=False)
    embeddings = np.array(embeddings).astype('float32')

    dim = embeddings.shape[1]
    index = faiss.IndexFlatL2(dim)
    index.add(embeddings)

    session_id = uuid.uuid4().hex
    paths = session_paths(session_id)
    os.makedirs(paths['dir'], exist_ok=True)

    # Save index and metadata
    faiss.write_index(index, paths['index'])
    meta = {'chunks': chunks}
    with open(paths['meta'], 'w', encoding='utf-8') as f:
        json.dump(meta, f, ensure_ascii=False)

    return {'session_id': session_id}


@app.post('/chat')
def chat(req: ChatRequest):
    session_id = req.session_id
    question = req.question
    if not session_id or not question:
        raise HTTPException(status_code=400, detail='session_id and question are required')

    paths = session_paths(session_id)
    if not os.path.exists(paths['index']) or not os.path.exists(paths['meta']):
        raise HTTPException(status_code=404, detail='session not found')

    # load index and metadata
    index = faiss.read_index(paths['index'])
    with open(paths['meta'], 'r', encoding='utf-8') as f:
        meta = json.load(f)
    chunks = meta.get('chunks', [])

    q_emb = embed_model.encode([question], convert_to_numpy=True)
    q_emb = np.array(q_emb).astype('float32')

    k = min(8, len(chunks))
    D, I = index.search(q_emb, k)
    hits = [chunks[i] for i in I[0] if i < len(chunks)]

    # Lexical fallback: for very specific prompts, include chunks that contain question keywords.
    keyword_tokens = {
        token for token in re.findall(r'[a-zA-Z0-9]+', question.lower())
        if len(token) > 2 or token.isdigit()
    }
    if keyword_tokens:
        lexical_hits = []
        for chunk in chunks:
            lowered = chunk.lower()
            if any(token in lowered for token in keyword_tokens):
                lexical_hits.append(chunk)
            if len(lexical_hits) >= 5:
                break

        for chunk in lexical_hits:
            if chunk not in hits:
                hits.append(chunk)

    # Build context from top hits
    context = '\n\n'.join(hits)
    answer = concise_answer_from_hits(
        question,
        hits,
        max_sentences=requested_sentence_count(question),
        max_chars=None,
    )

    # If GROQ_API_KEY and GROQ_API_URL are present, call the Groq generative API
    groq_api_key = os.getenv('GROQ_API_KEY')
    groq_api_url = os.getenv('GROQ_API_URL')

    if groq_api_key and groq_api_url:
        try:
            prompt = (
                "You are Techbot, an assistant that answers user questions using only the provided context. "
                "If the answer is not present in the context, say you don't know.\n\n"
                f"CONTEXT:\n{context}\n\nQUESTION:\n{question}\n\n"
                "If user asks for N points, return exactly N numbered points."
                " If user asks for detailed or long answer, provide a detailed grounded response."
            )

            headers = {'Authorization': f'Bearer {groq_api_key}', 'Content-Type': 'application/json'}
            payload = {'prompt': prompt, 'max_tokens': 1200}

            resp = requests.post(groq_api_url, headers=headers, json=payload, timeout=30)
            resp.raise_for_status()
            data = resp.json()

            # Groq API response formats vary. Try a few common shapes.
            groq_text = None
            if isinstance(data, dict):
                groq_text = data.get('text') or data.get('output') or data.get('result')
                if not groq_text:
                    # sometimes responses nest into choices or outputs
                    if 'choices' in data and isinstance(data['choices'], list) and data['choices']:
                        first = data['choices'][0]
                        groq_text = first.get('text') or first.get('message') or first.get('output')
                    elif 'outputs' in data and isinstance(data['outputs'], list) and data['outputs']:
                        groq_text = data['outputs'][0].get('text') or data['outputs'][0].get('content')

            if groq_text:
                clean_text = re.sub(r'\s+', ' ', str(groq_text)).strip()
                return {'answer': clean_text, 'source': 'groq'}
        except Exception as e:
            # If Groq call fails, continue and return the retrieval answer
            print('Groq generation failed:', e)

    return {'answer': answer, 'source': 'retrieval'}
