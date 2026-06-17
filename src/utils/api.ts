export const apiFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const token = localStorage.getItem('token');
  const isMalformedToken = token === 'null' || token === 'undefined' || !token;
  
  let url = '';
  if (typeof input === 'string') {
    url = input;
  } else if (input instanceof URL) {
    url = input.toString();
  } else if (input instanceof Request) {
    url = input.url;
  }

  if (token && !isMalformedToken && url.includes('/api/')) {
    if (input instanceof Request) {
      const newHeaders = new Headers(input.headers);
      if (!newHeaders.has('Authorization')) {
        newHeaders.set('Authorization', `Bearer ${token}`);
      }
      const newRequest = new Request(input, { headers: newHeaders });
      return fetch(newRequest, init);
    } else {
      const newInit = { ...init };
      const headers = new Headers(newInit.headers || {});
      
      if (!headers.has('Authorization') && !headers.has('authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      
      newInit.headers = headers;
      const res = await fetch(input, newInit);
      if (!res.ok && res.headers.get('content-type')?.includes('text/html')) {
        const text = await res.text();
        console.error('API returned HTML instead of JSON. First 100 chars:', text.substring(0, 100));
        throw new Error(`API returned HTML (status ${res.status}). This often means the route was not found or hit a server error fallback.`);
      }
      return res;
    }
  }

  const res = await fetch(input, init);
  if (!res.ok && res.headers.get('content-type')?.includes('text/html')) {
    const text = await res.text();
    console.error('API returned HTML instead of JSON. First 100 chars:', text.substring(0, 100));
    throw new Error(`API returned HTML (status ${res.status}). This often means the route was not found or hit a server error fallback.`);
  }
  return res;
};
