import { apiRequest } from './api.js';
import { shouldUseLocalDataMocks } from './apiConfig.js';

// RESERVAS (contrato US10)
//
// É por aqui que o app sabe em quais caronas o usuário é PASSAGEIRO: o
// /caronas/minhas (US7) devolve só as caronas em que ele é o MOTORISTA.

// Status de reserva do contrato (US10, "Status Possíveis").
export const RESERVA_ACEITA = 'ACEITA';

export async function criarReserva(caronaId, quantidadePassageiros) {
  const payload = {
    caronaId: Number(caronaId),
    quantidadePassageiros: Number(quantidadePassageiros),
  };

  if (shouldUseLocalDataMocks()) {
    return { id: `mock-${Date.now()}`, status: 'PENDENTE', ...payload };
  }

  try {
    return await apiRequest('/reservas', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  } catch {
    // Temporário enquanto US10-BACK-01 não estiver disponível.
    return { id: `mock-${Date.now()}`, status: 'PENDENTE', ...payload };
  }
}

export async function cancelarReserva(reservaId) {
  if (shouldUseLocalDataMocks()) {
    return { id: reservaId, status: 'CANCELADA' };
  }

  try {
    return await apiRequest(`/reservas/${encodeURIComponent(reservaId)}/cancelar`, {
      method: 'PATCH',
    });
  } catch {
    // Temporário enquanto US10-BACK-06 não estiver disponível.
    return { id: reservaId, status: 'CANCELADA' };
  }
}

const SOLICITACOES_MOCK = [
  { id: 'sol-1', status: 'PENDENTE', quantidadePassageiros: 1, dataSolicitacao: '2026-07-14T09:25:00', solicitante: { id: 'lucas', nome: 'Lucas Pereira' } },
  { id: 'sol-2', status: 'PENDENTE', quantidadePassageiros: 2, dataSolicitacao: '2026-07-14T10:10:00', solicitante: { id: 'amanda', nome: 'Amanda Silva' } },
];

export async function listarReservasPendentesDaCarona(caronaId) {
  if (shouldUseLocalDataMocks()) return SOLICITACOES_MOCK.map(normalizarSolicitacao);
  try {
    const resposta = await apiRequest(`/caronas/${encodeURIComponent(caronaId)}/reservas`);
    const lista = Array.isArray(resposta) ? resposta : resposta?.content || resposta?.reservas || resposta?.items || [];
    return lista.map(normalizarSolicitacao).filter((reserva) => reserva.status === 'PENDENTE');
  } catch {
    // Temporário: US7-BACK-06 ainda não está disponível no backend.
    // Quando o endpoint existir, este fallback pode voltar a depender apenas
    // de VITE_MOCK_FALTANTES.
    return SOLICITACOES_MOCK.map(normalizarSolicitacao);
  }
}

export async function aceitarReserva(reservaId) {
  if (shouldUseLocalDataMocks()) return { status: 'ACEITA' };
  try {
    return await apiRequest(`/reservas/${encodeURIComponent(reservaId)}/aceitar`, { method: 'PATCH' });
  } catch {
    // Temporário enquanto US10-BACK-04 não estiver disponível.
    return { status: 'ACEITA' };
  }
}

export async function recusarReserva(reservaId) {
  if (shouldUseLocalDataMocks()) return { status: 'RECUSADA' };
  try {
    return await apiRequest(`/reservas/${encodeURIComponent(reservaId)}/recusar`, { method: 'PATCH' });
  } catch {
    // Temporário enquanto US10-BACK-05 não estiver disponível.
    return { status: 'RECUSADA' };
  }
}

function normalizarSolicitacao(reserva = {}) {
  const solicitante = reserva.solicitante || reserva.passageiro || reserva.usuario || {};
  return {
    id: reserva.id ?? reserva.reservaId,
    status: String(reserva.status || 'PENDENTE').toUpperCase(),
    quantidadePassageiros: Number(reserva.quantidadePassageiros ?? reserva.vagasReservadas ?? 1),
    dataSolicitacao: reserva.dataSolicitacao || reserva.createdAt || reserva.solicitadoEm || '',
    solicitante: {
      id: solicitante.id ?? solicitante.usuarioId,
      nome: solicitante.nome || solicitante.nomeCompleto || 'Solicitante',
    },
  };
}

const DETALHES_RESERVA_MOCK = [
  {
    id: 'demo-aceita',
    status: 'ACEITA',
    quantidadePassageiros: 1,
    dataSolicitacao: '2026-07-13T18:42:00',
    dataResposta: '2026-07-13T19:08:00',
    podeCancelar: true,
    carona: {
      id: 201,
      origem: 'Centenário',
      destino: 'UFCG — Campus Sede',
      dataHoraSaida: hojeAs(7, 20),
      dataHoraChegada: hojeAs(7, 55),
      paradas: ['Embarque em Centenário', 'Desembarque em UFCG • Campus Sede'],
      valor: 6,
      vagasTotais: 3,
      motorista: { id: 'marina', nome: 'Marina Souza', avaliacao: 4.9, fotoPerfil: '' },
    },
    reservas: [
      { id: 'p1', nome: 'Carlos Andrade (você)', avaliacao: 4.8, status: 'ACEITA' },
      { id: 'p2', nome: 'João Mendes', avaliacao: 4.6, status: 'ACEITA' },
      { id: 'p3', nome: 'Beatriz Lima', avaliacao: 4.9, status: 'ACEITA' },
    ],
  },
  {
    id: 'demo-finalizada',
    status: 'FINALIZADA',
    quantidadePassageiros: 2,
    dataSolicitacao: '2026-05-20T14:15:00',
    dataResposta: '2026-05-20T15:02:00',
    podeCancelar: false,
    carona: {
      id: 202,
      origem: 'Prata',
      destino: 'UFCG — CCT',
      dataHoraSaida: '2026-05-22T18:30:00',
      dataHoraChegada: '2026-05-22T19:05:00',
      valor: 6,
      motorista: { id: 'beatriz', nome: 'Beatriz Lima', avaliacao: 4.9, fotoPerfil: '' },
    },
  },
  {
    id: 'demo-cancelada',
    status: 'CANCELADA',
    quantidadePassageiros: 1,
    dataSolicitacao: '2026-05-16T09:30:00',
    dataResposta: '2026-05-17T11:10:00',
    podeCancelar: false,
    carona: {
      id: 203,
      origem: 'Liberdade',
      destino: 'UFCG — Campus Sede',
      dataHoraSaida: '2026-05-18T07:15:00',
      dataHoraChegada: '2026-05-18T07:50:00',
      valor: 4,
      motorista: { id: 'rafael', nome: 'Rafael Costa', avaliacao: 4.3, fotoPerfil: '' },
    },
  },
  {
    id: 'demo-pendente',
    status: 'PENDENTE',
    quantidadePassageiros: 1,
    dataSolicitacao: '2026-05-14T20:05:00',
    dataResposta: '',
    podeCancelar: true,
    carona: {
      id: 204,
      origem: 'Centro',
      destino: 'UFCG — Campus Sede',
      dataHoraSaida: '2026-05-15T07:30:00',
      dataHoraChegada: '2026-05-15T08:05:00',
      valor: 5,
      motorista: { id: 'ana', nome: 'Ana Paula', avaliacao: 4.5, fotoPerfil: '' },
    },
  },
  {
    id: 'demo-recusada',
    status: 'RECUSADA',
    quantidadePassageiros: 2,
    dataSolicitacao: '2026-07-12T08:20:00',
    dataResposta: '2026-07-12T09:05:00',
    podeCancelar: false,
    carona: {
      id: 205,
      origem: 'Malvinas',
      destino: 'UFCG — Campus Sede',
      dataHoraSaida: '2026-07-15T08:00:00',
      dataHoraChegada: '2026-07-15T08:35:00',
      valor: 5,
      vagasTotais: 3,
      motorista: { id: 'lucas', nome: 'Lucas Pereira', avaliacao: 4.7, fotoPerfil: '' },
    },
  },
  {
    id: 'demo-expirada',
    status: 'EXPIRADA',
    quantidadePassageiros: 1,
    dataSolicitacao: '2026-07-10T16:40:00',
    dataResposta: '',
    podeCancelar: false,
    carona: {
      id: 206,
      origem: 'Bodocongó',
      destino: 'UFCG — CCT',
      dataHoraSaida: '2026-07-11T07:40:00',
      dataHoraChegada: '2026-07-11T08:10:00',
      valor: 4,
      vagasTotais: 4,
      motorista: { id: 'amanda', nome: 'Amanda Silva', avaliacao: 4.8, fotoPerfil: '' },
    },
  },
];

// GET /reservas/enviadas — as solicitações que EU fiz (RN-RES-11).
// Cada item traz { id, carona: { id, origem, destino }, status,
// quantidadePassageiros, valorContribuicao } — repare que a carona vem sem
// dataHoraSaida, então quem precisar do horário busca o detalhe da carona.
export async function listarReservasEnviadas() {
  if (shouldUseLocalDataMocks()) {
    return DETALHES_RESERVA_MOCK.map(ajustarReserva);
  }

  try {
    const resposta = await apiRequest('/reservas/enviadas');
    const reservas = Array.isArray(resposta)
      ? resposta
      : resposta?.content || resposta?.reservas || resposta?.items || [];

    if (reservas.length === 0) {
      return DETALHES_RESERVA_MOCK.map(ajustarReserva);
    }

    // O resumo de /reservas/enviadas não traz motorista nem data da viagem.
    // Completa cada item com GET /caronas/{id}, pois esses campos são exigidos
    // no card de "Como passageiro".
    const reservasDaApi = await Promise.all(reservas.map(enriquecerReservaComCarona));

    // Temporário para demonstração visual dos seis estados da US10-FRONT.
    // Os IDs textuais evitam colisão com reservas reais retornadas pelo back.
    return [...reservasDaApi, ...DETALHES_RESERVA_MOCK.map(ajustarReserva)];
  } catch {
    return DETALHES_RESERVA_MOCK.map(ajustarReserva);
  }
}

// Só as reservas que o motorista aceitou — as pendentes ainda podem ser
// recusadas (RN-RES-20), então não valem como "você é passageiro".
export async function listarReservasAceitas() {
  const reservas = await listarReservasEnviadas();

  return reservas.filter((reserva) => reserva.status === RESERVA_ACEITA);
}

async function enriquecerReservaComCarona(reserva = {}) {
  const caronaResumo = reserva.carona || {};
  const caronaId = caronaResumo.id ?? reserva.caronaId;

  if (!caronaId) return ajustarReserva(reserva);

  try {
    const caronaCompleta = await apiRequest(`/caronas/${encodeURIComponent(caronaId)}`);
    return ajustarReserva({
      ...reserva,
      carona: { ...caronaResumo, ...caronaCompleta },
    });
  } catch {
    return ajustarReserva(reserva);
  }
}

// GET /reservas/{id} — detalhes completos de uma solicitação do passageiro.
export async function obterDetalhesReserva(id) {
  if (!id) {
    const error = new Error('Reserva inválida.');
    error.status = 400;
    throw error;
  }

  if (shouldUseLocalDataMocks()) {
    return obterDetalheReservaMock(id);
  }

  try {
    const resposta = await apiRequest(`/reservas/${encodeURIComponent(id)}`);
    return normalizarDetalhesReserva(resposta);
  } catch (error) {
    if (import.meta.env.VITE_MOCK_FALTANTES === 'true') {
      return obterDetalheReservaMock(id);
    }
    throw error;
  }
}

function obterDetalheReservaMock(id) {
  const reserva = DETALHES_RESERVA_MOCK.find((item) => String(item.id) === String(id));
  if (!reserva) {
    const error = new Error('Reserva não encontrada nos dados simulados.');
    error.status = 404;
    throw error;
  }
  return normalizarDetalhesReserva(reserva);
}

export function normalizarDetalhesReserva(resposta = {}) {
  const reserva = resposta.reserva || resposta;
  const carona = reserva.carona || {};
  const motorista = reserva.motorista || carona.motorista || carona.condutor || {};
  const status = String(reserva.status || 'PENDENTE').toUpperCase();

  return {
    id: reserva.id ?? reserva.reservaId,
    status,
    quantidadePassageiros: Number(
      reserva.quantidadePassageiros ?? reserva.vagasReservadas ?? reserva.quantidadeVagas ?? 1,
    ),
    dataSolicitacao:
      reserva.dataSolicitacao || reserva.solicitadoEm || reserva.createdAt || reserva.dataCriacao || '',
    dataResposta:
      reserva.dataResposta || reserva.respondidoEm || reserva.updatedAt || reserva.dataAtualizacao || '',
    podeCancelar:
      typeof reserva.podeCancelar === 'boolean'
        ? reserva.podeCancelar
        : ['PENDENTE', 'ATIVA', 'ACEITA', 'CONFIRMADA'].includes(status),
    carona: {
      id: carona.id ?? reserva.caronaId,
      origem: descricao(carona.origem ?? reserva.origem),
      destino: descricao(carona.destino ?? reserva.destino),
      dataViagem:
        carona.dataHoraSaida || carona.dataHora || carona.dataViagem || reserva.dataHora || '',
      dataHoraChegada: carona.dataHoraChegada || carona.chegadaPrevista || '',
      paradas: Array.isArray(carona.paradas) ? carona.paradas.map(descricao) : [],
      valor: Number(carona.valor ?? carona.preco ?? reserva.valorContribuicao ?? 0),
      vagasTotais: Number(carona.vagasTotais ?? carona.quantidadeVagas ?? carona.totalVagas ?? 0),
    },
    motorista: {
      id: motorista.id ?? motorista.usuarioId ?? reserva.motoristaId,
      nome: motorista.nome || motorista.nomeCompleto || 'Motorista',
      fotoPerfil: motorista.fotoPerfil || motorista.avatarUrl || motorista.avatar || '',
      avaliacao: motorista.avaliacao ?? motorista.rating ?? null,
    },
    passageiros: (Array.isArray(reserva.reservas) ? reserva.reservas : []).map((item) => ({
      id: item.id,
      nome: item.nome || item.passageiro?.nome || 'Passageiro',
      avaliacao: item.avaliacao ?? item.passageiro?.avaliacao ?? null,
      status: item.status || 'ACEITA',
    })),
  };
}

function ajustarReserva(reserva = {}) {
  const carona = reserva.carona || {};
  const motorista = reserva.motorista || carona.motorista || carona.condutor || {};
  const dataViagem =
    carona.dataHoraSaida || carona.dataViagem || reserva.dataViagem ||
    reserva.dataHoraSaida || dataViagemMockTemporaria();
  const dataHoraChegada =
    carona.dataHoraChegada || carona.chegadaPrevista ||
    adicionarMinutos(dataViagem, 35);

  return {
    id: reserva.id,
    status: String(reserva.status || '').toUpperCase(),
    quantidadePassageiros: reserva.quantidadePassageiros ?? 1,
    valorContribuicao: reserva.valorContribuicao ?? null,
    dataViagem,
    dataSolicitacao:
      reserva.dataSolicitacao || reserva.solicitadoEm || reserva.createdAt ||
      reserva.dataCriacao || new Date().toISOString(),
    dataResposta:
      reserva.dataResposta || reserva.respondidoEm || reserva.updatedAt ||
      reserva.dataAtualizacao || '',
    podeCancelar:
      typeof reserva.podeCancelar === 'boolean'
        ? reserva.podeCancelar
        : ['PENDENTE', 'ACEITA', 'ATIVA', 'CONFIRMADA'].includes(String(reserva.status || '').toUpperCase()),
    motorista: {
      id: motorista.id ?? motorista.usuarioId ?? '',
      nome: motorista.nome || motorista.nomeCompleto || 'Motorista',
      fotoPerfil: motorista.fotoPerfil || motorista.avatarUrl || motorista.avatar || '',
      avaliacao: motorista.avaliacao ?? motorista.rating ?? null,
    },
    carona: {
      id: carona.id,
      origem: descricao(carona.origem),
      destino: descricao(carona.destino),
      dataViagem,
      dataHoraChegada,
      paradas: Array.isArray(carona.paradas) ? carona.paradas.map(descricao) : [],
      valor: Number(
        carona.valor ?? carona.valorContribuicao ?? carona.preco ??
        reserva.valorContribuicao ?? 0,
      ),
      vagasTotais: Number(
        carona.vagasTotais ?? carona.quantidadeVagas ?? carona.totalVagas ?? 0,
      ),
    },
    passageiros: Array.isArray(reserva.passageiros) ? reserva.passageiros : [],
  };
}

function dataViagemMockTemporaria() {
  const data = new Date();
  data.setDate(data.getDate() + 1);
  data.setHours(7, 30, 0, 0);
  return data.toISOString();
}

function adicionarMinutos(valor, minutos) {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '';
  data.setMinutes(data.getMinutes() + minutos);
  return data.toISOString();
}

// O contrato manda origem/destino da reserva como texto, mas o resto da API usa
// { descricao, ... } — aceitamos os dois.
function descricao(local) {
  if (!local) {
    return '';
  }

  return typeof local === 'string' ? local : local.descricao || '';
}

function hojeAs(hora, minuto) {
  const data = new Date();
  data.setHours(hora, minuto, 0, 0);
  return data.toISOString();
}
