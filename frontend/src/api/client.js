export const API_CONFIG = {
  baseURL: localStorage.getItem('bookstore_api_url') || 'http://localhost:8000',
  apiKey: localStorage.getItem('bookstore_api_key') || 'bookstore-secure-token-2026',
};

export async function apiClient(endpoint, options = {}) {
  const url = `${API_CONFIG.baseURL}${endpoint}`;
  const startTime = performance.now();

  const headers = {
    'Content-Type': 'application/json',
    'X-API-KEY': API_CONFIG.apiKey,
    ...options.headers,
  };

  try {
    const response = await fetch(url, { ...options, headers });
    const duration = Math.round(performance.now() - startTime);

    let data = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    }

    window.dispatchEvent(new CustomEvent('api-log', {
      detail: {
        method: options.method || 'GET',
        endpoint,
        status: response.status,
        duration,
        ok: response.ok,
        timestamp: new Date().toLocaleTimeString(),
      }
    }));

   if (!response.ok) {
      let errorMsg = data?.message || data?.error || `Error HTTP ${response.status}`;

      if (data?.errors && typeof data.errors === 'object') {
        const details = Object.entries(data.errors)
          .map(([field, errs]) => `${field.toUpperCase()}: ${Array.isArray(errs) ? errs.join(', ') : errs}`)
          .join(' | ');
        errorMsg = `${errorMsg} -> ${details}`;
      }

      throw { status: response.status, message: errorMsg, data };
    }

    return data;
  } catch (error) {
    if (!error.status) {
      window.dispatchEvent(new CustomEvent('api-log', {
        detail: {
          method: options.method || 'GET',
          endpoint,
          status: 0,
          duration: Math.round(performance.now() - startTime),
          ok: false,
          timestamp: new Date().toLocaleTimeString(),
        }
      }));
    }
    throw error;
  }
}