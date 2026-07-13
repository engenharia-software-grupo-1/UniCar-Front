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

export async function listarHistoricoComoMotorista() {
  if (shouldUseLocalDataMocks()) {
    return HISTORICO_MOTORISTA_MOCK.map(normalizarCaronaMotorista);
  }

  try {
    const resposta = await apiRequest('/historico/motorista');
    const caronas = extrairLista(resposta);

    if (caronas.length > 0) {
      return caronas.map(normalizarCaronaMotorista);
    }
  } catch {
    // Enquanto a US5-BACK-07 não estiver disponível, mantém a tela navegável.
  }

  return HISTORICO_MOTORISTA_MOCK.map(normalizarCaronaMotorista);
}

export async function obterResumoHistoricoMotorista() {
  return {
    avaliacaoMedia: 4.8,
    caronasConcluidas: 42,
  };
}

function normalizarCaronaMotorista(carona = {}) {
  const passageiros = extrairPassageiros(carona).map(normalizarPassageiro).filter((passageiro) => passageiro.nome);
  const vagasOcupadas = obterNumero(
    carona.vagasOcupadas ??
      carona.reservasConfirmadas ??
      carona.quantidadeReservas ??
      carona.quantidadePassageiros ??
      passageiros.length,
  );
  const vagasTotal = obterNumero(
    carona.vagasTotal ??
      carona.totalVagas ??
      carona.quantidadeVagas ??
      carona.capacidadePassageiros ??
      carona.vagas,
  );

  return {
    id: carona.id,
    status: carona.status || 'ATIVA',
    dataHoraSaida: carona.dataHoraSaida || carona.dataHora || '',
    origem: descricaoLocal(carona.origem),
    destino: descricaoLocal(carona.destino),
    pontoEncontro: carona.pontoEncontro || carona.pontoReferencia || '',
    vagasOcupadas: vagasOcupadas || passageiros.length,
    vagasTotal: vagasTotal || Math.max(vagasOcupadas, passageiros.length, 3),
    passageiros,
  };
}

function extrairLista(resposta) {
  if (Array.isArray(resposta)) {
    return resposta;
  }

  return resposta?.content || resposta?.items || resposta?.caronas || resposta?.data || [];
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

function obterNumero(valor) {
  const numero = Number(valor);

  return Number.isFinite(numero) && numero >= 0 ? numero : 0;
}

function descricaoLocal(local) {
  if (!local) {
    return '';
  }

  return typeof local === 'string' ? local : local.descricao || local.nome || '';
}
