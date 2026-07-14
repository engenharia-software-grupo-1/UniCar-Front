const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';
const CACHE_KEY = 'unicar.geocoding.cache';
let ultimaRequisicao = 0;

export async function geocodificarEndereco(descricao) {
  const texto = String(descricao || '').trim();

  if (!texto) throw new Error('Informe um endereço para localizar.');

  const cache = carregarCache();
  const chave = texto.toLocaleLowerCase('pt-BR');
  if (cache[chave]) return cache[chave];

  const params = new URLSearchParams({
    q: `${texto}, Campina Grande, Paraíba, Brasil`,
    format: 'jsonv2',
    limit: '1',
    countrycodes: 'br',
    'accept-language': 'pt-BR',
  });

  const espera = Math.max(0, 1100 - (Date.now() - ultimaRequisicao));
  if (espera) await new Promise((resolve) => window.setTimeout(resolve, espera));
  ultimaRequisicao = Date.now();

  let response;
  try {
    response = await fetch(`${NOMINATIM_SEARCH_URL}?${params}`);
  } catch (error) {
    throw new Error('Não foi possível localizar o endereço. Verifique sua conexão.', { cause: error });
  }

  if (!response.ok) throw new Error('O serviço de localização está indisponível. Tente novamente.');

  const [resultado] = await response.json();
  const latitude = Number(resultado?.lat);
  const longitude = Number(resultado?.lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error(`Não foi possível localizar “${texto}”. Informe um endereço mais completo.`);
  }

  const endereco = { descricao: texto, latitude, longitude };
  cache[chave] = endereco;
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  return endereco;
}

function carregarCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY)) || {};
  } catch {
    return {};
  }
}
