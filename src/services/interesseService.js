import { apiRequest } from './api.js';
import { shouldUseLocalDataMocks } from './apiConfig.js';

const MOCK_INTERESSES_KEY = 'unicar.mock.interesses';

export async function registrarInteresse({ origem, destino }) {
  if (shouldUseLocalDataMocks()) {
    const interesses = carregarInteressesMock();
    const novoInteresse = {
      id: Date.now(),
      origem,
      destino,
      dataCadastro: new Date().toISOString(),
    };
    interesses.push(novoInteresse);
    salvarInteressesMock(interesses);
    return novoInteresse;
  }
  return apiRequest('/interesses-trajeto', {
    method: 'POST',
    body: JSON.stringify({
      origem,
      destino,
    }),
  });
}

export async function listarInteresses() {
  if (shouldUseLocalDataMocks()) {
    return carregarInteressesMock();
  }
  const resposta = await apiRequest('/interesses-trajeto');
  if (Array.isArray(resposta)) {
    return resposta;
  }
  return resposta?.content || resposta?.items || [];
}

export async function removerInteresse(id) {
  if (shouldUseLocalDataMocks()) {
    const interesses = carregarInteressesMock().filter(
      (interesse) => String(interesse.id) !== String(id),
    );
    salvarInteressesMock(interesses);
    return;
  }
  return apiRequest(`/interesses-trajeto/${id}`, {
    method: 'DELETE',
  });
}

function carregarInteressesMock() {
  const salvos = localStorage.getItem(MOCK_INTERESSES_KEY);
  if (!salvos) {
    return [];
  }
  try {
    return JSON.parse(salvos);
  } catch {
    return [];
  }
}

function salvarInteressesMock(interesses) {
  localStorage.setItem(
    MOCK_INTERESSES_KEY,
    JSON.stringify(interesses),
  );
}