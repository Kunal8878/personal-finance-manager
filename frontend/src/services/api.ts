const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001/api';

export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  const token = localStorage.getItem('finance_token');

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>)
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    const text = await res.text();
    let data: any = {};

    if (text) {
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = { error: 'Server returned non-JSON response.' };
      }
    }

    if (!res.ok) {
      return { success: false, error: data.error || `HTTP ${res.status}: An API error occurred.` };
    }

    return { success: true, data: data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error. Is the backend running on port 5001?' };
  }
}
