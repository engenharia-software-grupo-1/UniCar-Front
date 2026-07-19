const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';
const CACHE_KEY = 'unicar.geocoding.cache';
const SUGGESTIONS_CACHE_KEY = 'unicar.geocoding.suggestions';
const CACHE_TTL_MS = 60 * 60 * 1000;

// Nominatim permite no máximo ~1 requisição por segundo por IP.
const INTERVALO_MIN_MS = 1100;
let ultimaRequisicao = 0;
let filaRequisicoes = Promise.resolve();

// Reserva a "vez" na fila de forma atômica: cada chamada só resolve quando já
// passou INTERVALO_MIN_MS desde a anterior, e a atualização de `ultimaRequisicao`
// acontece encadeada (não há dois awaits lendo o mesmo valor antigo).
//
// Sem isto havia uma corrida: origem e destino calculavam a espera lendo o mesmo
// `ultimaRequisicao` antes de qualquer um gravá-lo, disparavam quase juntos e o
// Nominatim recusava uma das requisições — por isso o segundo campo (destino)
// quase nunca mostrava sugestão. Serializando, as chamadas saem uma a uma.
function aguardarVezNaFila() {
  const vez = filaRequisicoes.then(async () => {
    const espera = Math.max(0, INTERVALO_MIN_MS - (Date.now() - ultimaRequisicao));
    if (espera) await new Promise((resolve) => window.setTimeout(resolve, espera));
    ultimaRequisicao = Date.now();
  });

  // A fila precisa avançar mesmo que esta requisição falhe depois.
  filaRequisicoes = vez.catch(() => {});
  return vez;
}

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
  if (cache[chave]) return cache[chave].endereco;

  const [endereco] = await pesquisarEnderecos(texto, 1);

  if (!endereco) {
    throw new Error(`Não foi possível localizar “${texto}”. Informe um endereço mais completo.`);
  }

  cache[chave] = { endereco, expiraEm: Date.now() + CACHE_TTL_MS };
  sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  return endereco;
}

// Sugestões para os campos de origem e destino. A consulta é restrita à cidade
// de atuação do app para evitar opções ambíguas de outras regiões do país.
export async function buscarSugestoesEndereco(consulta) {
  const texto = String(consulta || '').trim();
  if (texto.length < 3) return [];

  const cache = carregarCache(SUGGESTIONS_CACHE_KEY);
  const chave = texto.toLocaleLowerCase('pt-BR');
  if (cache[chave]) return cache[chave].enderecos;

  const enderecos = await pesquisarEnderecos(texto, 5);
  cache[chave] = { enderecos, expiraEm: Date.now() + CACHE_TTL_MS };
  sessionStorage.setItem(SUGGESTIONS_CACHE_KEY, JSON.stringify(cache));
  return enderecos;
}

async function pesquisarEnderecos(texto, limite) {
  const params = new URLSearchParams({
    q: `${texto}, Campina Grande, Paraíba, Brasil`,
    format: 'jsonv2',
    limit: String(limite),
    countrycodes: 'br',
    'accept-language': 'pt-BR',
  });

  await aguardarVezNaFila();

  let response;
  try {
    response = await fetch(`${NOMINATIM_SEARCH_URL}?${params}`);
  } catch (error) {
    throw new Error('Não foi possível localizar o endereço. Verifique sua conexão.', { cause: error });
  }

  if (!response.ok) throw new Error('O serviço de localização está indisponível. Tente novamente.');

  const resultados = await response.json();
  return resultados
    .map((resultado) => ({
      descricao: resultado.display_name || resultado.name,
      latitude: Number(resultado.lat),
      longitude: Number(resultado.lon),
    }))
    .filter((endereco) => endereco.descricao && Number.isFinite(endereco.latitude) && Number.isFinite(endereco.longitude));
}

function carregarCache(chaveCache = CACHE_KEY) {
  try {
    const cache = JSON.parse(sessionStorage.getItem(chaveCache)) || {};
    const agora = Date.now();

    return Object.fromEntries(
      Object.entries(cache)
        .filter(([, entrada]) => entrada?.expiraEm > agora),
    );
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
