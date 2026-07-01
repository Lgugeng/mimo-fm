const BASE = '/api';

export async function apiFetch<T>(path: string, token?: string, options: RequestInit = {}): Promise<T> {
  const headers = { 
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers 
  };
  
  const res = await fetch(`${BASE}${path}`, {
    headers,
    ...options,
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(`API error ${res.status}: ${error.message || res.statusText}`);
  }
  
  return res.json();
}

// Legacy function that only takes path (deprecated, use apiFetch with token)
export async function apiGet<T>(path: string, options: RequestInit = {}): Promise<T> {
  return apiFetch<T>(path, undefined, options);
}

export async function apiPost<T>(path: string, body: unknown, token?: string): Promise<T> {
  return apiFetch<T>(path, token, { method: 'POST', body: JSON.stringify(body) });
}

export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { method: 'POST', body: formData });
  if (!res.ok) throw new Error(`Upload error: ${res.status}`);
  return res.json();
}

export function streamSSE(
  path: string,
  body: Record<string, unknown>,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: Error) => void
): AbortController {
  const controller = new AbortController();
  (async () => {
    try {
      const res = await fetch(`${BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) throw new Error(`SSE error: ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        for (const line of text.split('\n')) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') { onDone(); return; }
            try {
              const parsed = JSON.parse(data);
              onChunk(parsed.content ?? parsed.text ?? data);
            } catch {
              onChunk(data);
            }
          }
        }
      }
      onDone();
    } catch (err) {
      if ((err as Error).name !== 'AbortError') onError(err as Error);
    }
  })();
  return controller;
}
