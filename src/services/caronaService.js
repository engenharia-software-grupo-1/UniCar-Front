import { apiRequest } from './api.js';
import { shouldUseLocalDataMocks } from './apiConfig.js';

export async function buscarProximaCarona() {
  const carona = await apiRequest('/caronas/proxima');

  return carona ? ajustarCarona(carona) : null;
}

export async function buscarSugestoesDeCaronas() {
  const resposta = await apiRequest('/caronas/sugestoes');
  const caronas = Array.isArray(resposta) ? resposta : resposta?.content || resposta?.items || [];

  return caronas.map(ajustarCarona);
}

// Detalha uma carona (GET /caronas/{id}), trazendo ponto de encontro, vagas etc.
export async function obterCarona(id) {
  if (shouldUseLocalDataMocks()) {
    const carona = carregarCaronasMock().find((item) => item.id === Number(id));

    if (!carona) {
      throw new Error('Carona não encontrada.');
    }

    return ajustarCaronaMotorista(carona);
  }

  const carona = await apiRequest(`/caronas/${id}`);

  return ajustarCaronaMotorista(carona);
}

// Cria uma nova carona (POST /caronas) — contrato US7-BACK-01. Recebe origem e
// destino como texto (ou objeto) e devolve o payload no formato do contrato,
// com origem/destino em { descricao, latitude, longitude }. Responde
// { id, status: 'CRIADA' }.
export async function criarCarona(dados) {
  const payload = montarPayloadCarona(dados);

  if (shouldUseLocalDataMocks()) {
    const caronas = carregarCaronasMock();

    const novaCarona = {
      id: Math.max(10, ...caronas.map((carona) => carona.id)) + 1,
      ...payload,
      vagasDisponiveis: payload.quantidadeVagas,
      status: 'CRIADA',
    };

    salvarCaronasMock([...caronas, novaCarona]);

    return { id: novaCarona.id, status: 'CRIADA' };
  }

  return apiRequest('/caronas', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

function montarPayloadCarona(dados = {}) {
  return {
    veiculoId: Number(dados.veiculoId),
    origem: montarLocalContrato(dados.origem),
    destino: montarLocalContrato(dados.destino),
    pontoEncontro: dados.pontoEncontro ?? '',
    dataHoraSaida: dados.dataHoraSaida,
    quantidadeVagas: Number(dados.quantidadeVagas),
    valorContribuicao: Number(dados.valorContribuicao),
  };
}

// O contrato exige origem/destino com descricao, latitude e longitude. A UI só
// coleta texto, então preenchemos as coordenadas com null quando ausentes.
function montarLocalContrato(valor) {
  if (valor && typeof valor === 'object') {
    return {
      descricao: valor.descricao ?? '',
      latitude: valor.latitude ?? null,
      longitude: valor.longitude ?? null,
    };
  }

  return { descricao: valor ?? '', latitude: null, longitude: null };
}

// Cancela uma carona do motorista (PATCH /caronas/{id}/cancelar) — contrato
// US7-BACK-05. Sem corpo; devolve { id, status: 'CANCELADA' }.
export async function cancelarCarona(id) {
  if (shouldUseLocalDataMocks()) {
    const caronas = carregarCaronasMock();
    const carona = caronas.find((item) => item.id === Number(id));

    if (carona) {
      carona.status = 'CANCELADA';
      salvarCaronasMock(caronas);
    }

    return { id: Number(id), status: 'CANCELADA' };
  }

  return apiRequest(`/caronas/${id}/cancelar`, { method: 'PATCH' });
}

// Lista as caronas criadas pelo motorista autenticado. O GET /caronas/minhas
// devolve poucos campos, então enriquecemos cada item com o GET /caronas/{id}
// (em paralelo) para exibir ponto de encontro e contagem de passageiros.
export async function listarMinhasCaronas() {
  if (shouldUseLocalDataMocks()) {
    return carregarCaronasMock().map(ajustarCaronaMotorista);
  }

  const resposta = await apiRequest('/caronas/minhas');
  const lista = extrairLista(resposta);

  return Promise.all(
    lista.map((carona) =>
      obterCarona(carona.id).catch(() => ajustarCaronaMotorista(carona)),
    ),
  );
}

// Store simulado (VITE_ENABLE_MOCKS / modo DEV) persistido em localStorage, para
// que caronas criadas via `criarCarona` apareçam em "Minhas caronas" e o
// cancelamento seja refletido — assim como o mock de veículos.
const MOCK_CARONAS_KEY = 'unicar.mock.caronas';
const MOCK_CARONAS_VERSION_KEY = 'unicar.mock.caronas.version';
const MOCK_CARONAS_VERSION = 'semente-v1';

// Semente inicial. As datas são geradas na hora para caírem em "Hoje"/"Amanhã".
function caronasSemente() {
  return [
    {
      id: 10,
      origem: { descricao: 'Bodocongó' },
      destino: { descricao: 'UFCG' },
      pontoEncontro: 'Campus Sede',
      dataHoraSaida: saidaMockada(0, 13, 30),
      quantidadeVagas: 3,
      vagasDisponiveis: 1,
      valorContribuicao: 5,
      status: 'CRIADA',
    },
    {
      id: 11,
      origem: { descricao: 'Catolé' },
      destino: { descricao: 'UFCG' },
      pontoEncontro: 'Portão principal',
      dataHoraSaida: saidaMockada(1, 7, 0),
      quantidadeVagas: 4,
      vagasDisponiveis: 4,
      valorContribuicao: 6,
      status: 'CRIADA',
    },
  ];
}

function carregarCaronasMock() {
  if (localStorage.getItem(MOCK_CARONAS_VERSION_KEY) !== MOCK_CARONAS_VERSION) {
    const semente = caronasSemente();
    salvarCaronasMock(semente);
    localStorage.setItem(MOCK_CARONAS_VERSION_KEY, MOCK_CARONAS_VERSION);
    return semente;
  }

  const salvos = localStorage.getItem(MOCK_CARONAS_KEY);

  if (!salvos) {
    const semente = caronasSemente();
    salvarCaronasMock(semente);
    return semente;
  }

  try {
    return JSON.parse(salvos);
  } catch {
    const semente = caronasSemente();
    salvarCaronasMock(semente);
    return semente;
  }
}

function salvarCaronasMock(caronas) {
  localStorage.setItem(MOCK_CARONAS_KEY, JSON.stringify(caronas));
}

function saidaMockada(diasAFrente, hora, minuto) {
  const data = new Date();
  data.setDate(data.getDate() + diasAFrente);
  data.setHours(hora, minuto, 0, 0);

  const pad = (n) => String(n).padStart(2, '0');

  return (
    `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}` +
    `T${pad(data.getHours())}:${pad(data.getMinutes())}:00`
  );
}

function extrairLista(resposta) {
  if (Array.isArray(resposta)) {
    return resposta;
  }

  return resposta?.content || resposta?.caronas || resposta?.items || [];
}

function ajustarCaronaMotorista(carona = {}) {
  const quantidadeVagas = carona.quantidadeVagas ?? null;
  const vagasDisponiveis = carona.vagasDisponiveis ?? null;
  const passageirosConfirmados =
    quantidadeVagas !== null && vagasDisponiveis !== null
      ? Math.max(0, quantidadeVagas - vagasDisponiveis)
      : null;

  return {
    id: carona.id,
    status: carona.status || 'CRIADA',
    dataHoraSaida: carona.dataHoraSaida || carona.dataHora || '',
    origem: descricaoLocal(carona.origem),
    destino: descricaoLocal(carona.destino),
    pontoEncontro: carona.pontoEncontro || '',
    quantidadeVagas,
    vagasDisponiveis,
    passageirosConfirmados,
  };
}

function descricaoLocal(local) {
  if (!local) {
    return '';
  }

  return typeof local === 'string' ? local : local.descricao || '';
}

function ajustarCarona(carona = {}) {
  const motorista = carona.motorista || carona.driver || carona.usuario || {};
  const origem = carona.origem || carona.from || carona.pontoOrigem || '';
  const destino = carona.destino || carona.to || carona.pontoDestino || '';

  return {
    id: carona.id,
    horario: carona.horario || carona.time || carona.dataHora || '',
    origem,
    destino,
    rota: carona.rota || montarRota(origem, destino),
    preco: carona.preco || carona.price || carona.valor || '',
    motorista: {
      nome: motorista.nomeCompleto || motorista.nome || motorista.name || '',
      avatar: motorista.avatar || primeiraLetra(motorista.nomeCompleto || motorista.nome || motorista.name),
      avaliacao: motorista.avaliacao || motorista.rating || '',
    },
  };
}

function montarRota(origem, destino) {
  if (origem && destino) {
    return `${origem} -> ${destino}`;
  }

  return origem || destino || '';
}

function primeiraLetra(nome = '') {
  return nome.trim()[0]?.toUpperCase() || '';
}
