import { apiRequest } from './api.js';

export async function registrarInteresse({ origem, destino }) {
  return apiRequest('/interesses-trajeto', {
    method: 'POST',
    body: JSON.stringify({
      origem,
      destino,
    }),
  });
}

export async function listarInteresses() {
  const resposta = await apiRequest('/interesses-trajeto');
  if (Array.isArray(resposta)) {
    return resposta;
  }
  return resposta?.content || resposta?.items || [];
}

export async function removerInteresse(id) {
  return apiRequest(`/interesses-trajeto/${id}`, {
    method: 'DELETE',
  });
}
