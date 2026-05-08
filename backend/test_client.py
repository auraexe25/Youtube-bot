import sys
import time
import requests

BASE = 'http://127.0.0.1:8000'
VIDEO = 'https://youtu.be/MGXwxwYMgfU?si=M4aX5t-_-YyxLcsk'

def load_video(url: str):
    r = requests.post(f"{BASE}/load-video", json={"youtube_url": url})
    try:
        r.raise_for_status()
    except Exception:
        print('Load video failed:', r.status_code, r.text)
        sys.exit(1)
    data = r.json()
    print('load-video response:', data)
    return data.get('session_id')

def chat(session_id: str, question: str):
    r = requests.post(f"{BASE}/chat", json={"session_id": session_id, "question": question})
    try:
        r.raise_for_status()
    except Exception:
        print('Chat failed:', r.status_code, r.text)
        sys.exit(1)
    data = r.json()
    print('chat response:', data)
    return data

def main():
    print('Calling load-video for', VIDEO)
    sid = load_video(VIDEO)
    if not sid:
        print('No session_id returned')
        sys.exit(1)

    print('Session id:', sid)
    # Wait a moment to ensure index is flushed to disk (if needed)
    time.sleep(1)
    print('Asking a test question...')
    res = chat(sid, 'Give a short summary of the video and main takeaways.')
    print('\nFinal Answer:\n')
    print(res.get('answer'))

if __name__ == '__main__':
    main()
