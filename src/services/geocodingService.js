const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';
const CACHE_KEY = 'unicar.geocoding.cache';
let ultimaRequisicao = 0;

// Espelha a validação de contribuição do backend (CaronaService.validarValorContribuicao):
// o teto de um trajeto é a distância Haversine em km multiplicada por um fator R$/km.
// Reproduzimos o cálculo aqui para a barra ir só até o permitido, sem depender do 400.
export const RAIO_TERRA_KM = 6371;
export const FATOR_VALOR_POR_KM = 1.0; // default do back (unicar.carona.fator-valor-por-km)
export const PASSO_CONTRIBUICAO = 0.5;

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

// Arredonda a 2 casas com HALF_UP, espelhando BigDecimal.valueOf(x).setScale(2, HALF_UP)
// do backend. Usa a representação decimal curta (mesma base do Double.toString do Java)
// em vez de Math.round(x*100), que erraria 1 centavo nos empates de 3ª casa por causa
// do ponto flutuante.
export function round2HalfUp(valor) {
  const num = Number(valor);
  if (!Number.isFinite(num)) return 0;

  const negativo = num < 0;
  const texto = Math.abs(num).toString();

  // Notação científica só aparece em valores extremos (fora da faixa de km); fallback.
  if (texto.includes('e') || texto.includes('E')) {
    return Math.round(num * 100) / 100;
  }

  const [inteira, decimalBruto = ''] = texto.split('.');
  const decimal = decimalBruto.padEnd(3, '0');
  const terceiraCasa = decimal.charCodeAt(2) - 48;

  let centavos = parseInt(inteira + decimal.slice(0, 2), 10);
  if (terceiraCasa >= 5) centavos += 1;

  const resultado = centavos / 100;
  return negativo ? -resultado : resultado;
}

function grausParaRadianos(graus) {
  return (graus * Math.PI) / 180;
}

// Distância Haversine em km, replicando linha a linha CaronaService.calcularDistanciaKm
// (mesma ordem de operações para que o double bata bit a bit com o backend).
export function calcularDistanciaKm(coordA, coordB) {
  const lat1 = Number(coordA.latitude);
  const lon1 = Number(coordA.longitude);
  const lat2 = Number(coordB.latitude);
  const lon2 = Number(coordB.longitude);

  const lat1Rad = grausParaRadianos(lat1);
  const lat2Rad = grausParaRadianos(lat2);
  const dLat = grausParaRadianos(lat2 - lat1);
  const dLon = grausParaRadianos(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return round2HalfUp(RAIO_TERRA_KM * c);
}

// Teto de contribuição do trajeto: distância (km) × fator R$/km, como o backend.
export function calcularTetoContribuicao(coordA, coordB) {
  return round2HalfUp(calcularDistanciaKm(coordA, coordB) * FATOR_VALOR_POR_KM);
}

// Maior valor alcançável na barra: o maior múltiplo de PASSO_CONTRIBUICAO <= teto.
// Fica sempre abaixo (ou igual) do teto, o que dá margem contra divergência de centavo.
export function contribuicaoMaxima(teto) {
  const valor = Number(teto);
  if (!Number.isFinite(valor) || valor <= 0) return 0;

  return Math.floor(valor / PASSO_CONTRIBUICAO) * PASSO_CONTRIBUICAO;
}
