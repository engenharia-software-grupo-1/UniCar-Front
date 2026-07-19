import { apiRequest } from './api.js';

export async function registrarInteresse({ origem, destino }) {
  return apiRequest('/interesses-trajeto', {
    method: 'POST',
    body: JSON.stringify({
      origem: normalizarCoordenada(origem),
      destino: normalizarCoordenada(destino),
    }),
  });
}

export async function listarInteresses() {
  const resposta = await apiRequest('/interesses-trajeto');
  const interesses = Array.isArray(resposta)
    ? resposta
    : resposta?.content || resposta?.items || [];

  return interesses.map((interesse) => ({
    ...interesse,
    ...(interesse.origem !== undefined
      ? { origem: descreverCoordenada(interesse.origem) }
      : {}),
    ...(interesse.destino !== undefined
      ? { destino: descreverCoordenada(interesse.destino) }
      : {}),
  }));
}

export async function removerInteresse(id) {
  return apiRequest(`/interesses-trajeto/${id}`, {
    method: 'DELETE',
  });
}

function normalizarCoordenada(coordenada) {
  const latitude = Number(coordenada?.latitude);
  const longitude = Number(coordenada?.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('Selecione uma origem e um destino vÃ¡lidos antes de criar o alerta.');
  }

  return { latitude, longitude };
}

function descreverCoordenada(coordenada) {
  if (typeof coordenada === 'string') {
    return coordenada;
  }

  if (coordenada?.descricao) {
    return coordenada.descricao;
  }

  const latitude = Number(coordenada?.latitude);
  const longitude = Number(coordenada?.longitude);

  return Number.isFinite(latitude) && Number.isFinite(longitude)
    ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
    : '';
}
