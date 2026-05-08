import axios from 'axios'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export type LoadVideoResponse = {
  session_id?: string
  sessionId?: string
  data?: {
    session_id?: string
    sessionId?: string
  }
}

export type ChatResponse = {
  answer?: string
  response?: string
  result?: string
  data?: {
    answer?: string
    response?: string
    result?: string
  }
}

export async function loadVideo(youtubeUrl: string) {
  const response = await api.post<LoadVideoResponse>('/load-video', {
    youtube_url: youtubeUrl,
    url: youtubeUrl,
    video_url: youtubeUrl,
  })

  return response.data?.session_id ?? response.data?.sessionId ?? response.data?.data?.session_id ?? response.data?.data?.sessionId ?? null
}

export async function chat(sessionId: string, question: string) {
  const response = await api.post<ChatResponse>('/chat', {
    session_id: sessionId,
    question,
    query: question,
  })

  return response.data?.answer ?? response.data?.response ?? response.data?.result ?? response.data?.data?.answer ?? response.data?.data?.response ?? response.data?.data?.result ?? ''
}
