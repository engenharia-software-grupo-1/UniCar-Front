import { apiRequest } from './api.js';
import { shouldUseLocalDataMocks } from './apiConfig.js';

const HISTORICO_MOTORISTA_MOCK = [
  {
    id: 101,
    status: 'FINALIZADA',
    dataHoraSaida: '2026-05-28T07:20:00',
    origem: 'Centenário',
    destino: 'UFCG',
    pontoEncontro: 'Campus Sede',
    vagasOcupadas: 4,
    vagasTotal: 4,
    passageiros: [
      { id: 5, nome: 'Marina Souza' },
      { id: 8, nome: 'João Mendes' },
      { id: 9, nome: 'Beatriz Lima' },
      { id: 10, nome: 'Rafael Costa' },
    ],
  },
  {
    id: 102,
    status: 'FINALIZADA',
    dataHoraSaida: '2026-05-25T08:00:00',
    origem: 'Liberdade',
    destino: 'UFCG',
    pontoEncontro: 'CCT',
    vagasOcupadas: 3,
    vagasTotal: 4,
    passageiros: [
      { id: 6, nome: 'Lucas Pereira' },
      { id: 11, nome: 'Ana Paula' },
      { id: 12, nome: 'Rafael Costa' },
    ],
  },
  {
    id: 103,
    status: 'CANCELADA',
    dataHoraSaida: '2026-05-20T06:45:00',
    origem: 'Catolé',
    destino: 'UFCG',
    pontoEncontro: 'Campus Sede',
    vagasOcupadas: 1,
    vagasTotal: 3,
    passageiros: [{ id: 7, nome: 'Ana Carolina' }],
  },
];

const AVALIACOES_MOTORISTA_MOCK = [
  {
    id: 201,
    autor: 'João Mendes',
    comentario: 'Motorista pontual e super tranquilo!',
    data: '28/05',
    nota: 5,
  },
  {
    id: 202,
    autor: 'Beatriz Lima',
    comentario: 'Carro confortável, recomendo demais.',
    data: '25/05',
    nota: 5,
  },
  {
    id: 203,
    autor: 'Rafael Costa',
    comentario: 'Bom papo durante o trajeto.',
    data: '20/05',
    nota: 4,
  },
];

export async function listarHistoricoComoMotorista() {
  if (shouldUseLocalDataMocks()) {
    return HISTORICO_MOTORISTA_MOCK.map(normalizarCaronaMotorista);
  }

  const resposta = await apiRequest('/historico/motorista');
  const caronas = extrairLista(resposta);

  return caronas.map(normalizarCaronaMotorista);
}

export async function listarAvaliacoesComoMotorista() {
  return AVALIACOES_MOTORISTA_MOCK;
}

export async function obterResumoHistorico() {
  return {
    avaliacaoMedia: 4.8,
    caronasConcluidas: 42,
  };
}

function normalizarCaronaMotorista(carona = {}) {
  const passageiros = extrairPassageiros(carona);
  const passageirosNormalizados = passageiros.map(normalizarPassageiro).filter((passageiro) => passageiro.nome);
  const passageiro = carona.passageiro || carona.usuario?.nome || passageirosNormalizados[0]?.nome || '';
  const quantidadePassageiros = passageiros.length || (passageiro ? 1 : 0);
  const reservasConfirmadas = contarReservasConfirmadas(carona.reservas);
  const ocupacaoInformada = obterNumero(
    carona.vagasOcupadas ??
      carona.reservasConfirmadas ??
      carona.quantidadeReservas ??
      carona.quantidadePassageiros ??
      carona.passageirosConfirmados ??
      carona.ocupacaoAtual ??
      reservasConfirmadas ??
      carona.ocupacao ??
      quantidadePassageiros,
  );
  const totalInformado = obterNumero(
    carona.vagasTotal ??
      carona.totalVagas ??
      carona.quantidadeVagas ??
      carona.quantidadeMaximaPassageiros ??
      carona.capacidadePassageiros ??
      carona.capacidade ??
      carona.vagas,
  );
  const vagasOcupadas = ocupacaoInformada || quantidadePassageiros;
  const vagasTotal = totalInformado || Math.max(vagasOcupadas, 3);

  return {
    id: carona.id,
    status: carona.status || 'ATIVA',
    dataHoraSaida: carona.dataHoraSaida || carona.dataHora || '',
    origem: descricaoLocal(carona.origem),
    destino: descricaoLocal(carona.destino),
    pontoEncontro: carona.pontoEncontro || carona.pontoReferencia || '',
    vagasOcupadas,
    vagasTotal,
    passageiro,
    passageiros: passageirosNormalizados.length
      ? passageirosNormalizados
      : criarPassageirosFallback(carona, passageiro),
    avaliadoId: carona.avaliadoId ?? carona.usuario?.id ?? carona.passageiroId ?? '',
  };
}

function extrairLista(resposta) {
  if (Array.isArray(resposta)) {
    return resposta;
  }

  return resposta?.content || resposta?.items || resposta?.caronas || resposta?.data || [];
}

function obterNumero(valor) {
  const numero = Number(valor);

  return Number.isFinite(numero) && numero >= 0 ? numero : 0;
}

function normalizarPassageiro(passageiro) {
  if (typeof passageiro === 'string') {
    return {
      id: passageiro,
      nome: passageiro,
    };
  }

  const usuario = passageiro?.usuario || passageiro?.passageiro || passageiro || {};

  return {
    id: usuario.id ?? usuario.usuarioId ?? usuario.passageiroId ?? passageiro?.id ?? '',
    nome: usuario.nome ?? usuario.name ?? usuario.nomeCompleto ?? passageiro?.nome ?? '',
  };
}

function criarPassageirosFallback(carona, passageiro) {
  if (!passageiro) {
    return [];
  }

  return [
    {
      id: carona.avaliadoId ?? carona.usuario?.id ?? carona.passageiroId ?? passageiro,
      nome: passageiro,
    },
  ];
}

function extrairPassageiros(carona) {
  if (Array.isArray(carona.passageiros)) {
    return carona.passageiros;
  }

  if (Array.isArray(carona.usuarios)) {
    return carona.usuarios;
  }

  if (Array.isArray(carona.reservas)) {
    return carona.reservas
      .filter((reserva) => reserva.status !== 'CANCELADA' && reserva.status !== 'RECUSADA')
      .map((reserva) => reserva.usuario || reserva.passageiro || reserva);
  }

  return [];
}

function contarReservasConfirmadas(reservas) {
  if (!Array.isArray(reservas)) {
    return undefined;
  }

  return reservas.filter((reserva) => reserva.status !== 'CANCELADA' && reserva.status !== 'RECUSADA').length;
}

function descricaoLocal(local) {
  if (!local) {
    return '';
  }

  return typeof local === 'string' ? local : local.descricao || local.nome || '';
}
