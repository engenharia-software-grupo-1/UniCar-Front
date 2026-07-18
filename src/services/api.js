import { API_BASE_URL } from './apiConfig.js';
import { readStoredSession } from './sessionStore.js';

export async function apiRequest(endpoint, options = {}) {
  const session = readStoredSession();
  const { incluirAutorizacao = true, ...opcoesRequest } = options;

  const headers = {
    'Content-Type': 'application/json',
    ...opcoesRequest.headers,
  };

  if (incluirAutorizacao && session?.token) {
    headers.Authorization = `Bearer ${session.token}`;
  }

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...opcoesRequest,
      headers,
    });
  } catch (error) {
    throw new Error('Não foi possível conectar ao servidor. Tente novamente.', {
      cause: error,
    });
  }

  const contentType = response.headers.get('content-type');
  const hasJson =
    contentType &&
    (contentType.includes('application/json') || contentType.includes('+json'));

  let data = null;

  if (hasJson) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const mensagem =
      data?.message ||
      data?.erro ||
      data?.error ||
      data?.detail ||
      data?.title ||
      'Erro ao comunicar com o servidor.';

    // Erros de validação da API vêm como { message, detalhes: "campo: motivo" }.
    const error = new Error(
      data?.detalhes ? `${mensagem} ${data.detalhes}` : mensagem,
    );

    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}
