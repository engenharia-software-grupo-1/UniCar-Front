const API_BASE_URL = 'http://localhost:8080';

function getSession() {
  const session = localStorage.getItem('unicar.session');

  if (!session) {
    return null;
  }

  try {
    return JSON.parse(session);
  } catch {
    return null;
  }
}

export async function apiRequest(endpoint, options = {}) {
  const session = getSession();

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (session?.token) {
    headers.Authorization = `Bearer ${session.token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type');
  const hasJson = contentType && contentType.includes('application/json');

  const data = hasJson ? await response.json() : null;

  if (!response.ok) {
    throw new Error(
      data?.message ||
      data?.erro ||
      data?.error ||
      'Erro ao comunicar com o servidor.'
    );
  }

  return data;
}