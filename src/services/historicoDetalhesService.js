import { apiRequest } from './api.js';
import { shouldUseDevelopmentFallbacks, shouldUseLocalDataMocks } from './apiConfig.js';
import { getSession } from './authService.js';

const DETALHES_HISTORICO_MOCK = [
  {
    id: '1',
    status: 'CONFIRMADA',
    dataHoraSaida: hojeAs(7, 20),
    dataHoraChegada: hojeAs(7, 55),
    origem: 'Centenário',
    destino: 'UFCG',
    pontoReferencia: 'Campus Sede',
    paradas: ['Avenida Almirante Barroso', 'Terminal de Integração'],
    valor: 5,
    custos: 'Combustível compartilhado entre os passageiros.',
    motorista: {
      id: 'marina',
      nome: 'Marina Souza',
      avaliacao: 4.9,
      fotoPerfil: '',
    },
    reservas: [
      { id: 'r1', usuarioId: 1, nome: 'Estudante UniCar', vagas: 1, status: 'CONFIRMADA' },
      { id: 'r2', usuarioId: 'lucas', nome: 'Lucas Pereira', vagas: 1, status: 'CONFIRMADA' },
    ],
    participantes: [1, 'marina', 'lucas'],
  },
  {
    id: '2',
    status: 'FINALIZADA',
    dataHoraSaida: '2026-05-22T18:30:00',
    dataHoraChegada: '2026-05-22T19:05:00',
    origem: 'Prata',
    destino: 'UFCG',
    pontoReferencia: 'CCT',
    paradas: ['Rua João Alves', 'Biblioteca Central'],
    valor: 6,
    custos: 'Valor usado para dividir combustível e estacionamento.',
    motorista: {
      id: 'beatriz',
      nome: 'Beatriz Lima',
      avaliacao: 4.9,
      fotoPerfil: '',
    },
    reservas: [
      { id: 'r3', usuarioId: 1, nome: 'Estudante UniCar', vagas: 2, status: 'FINALIZADA' },
      { id: 'r4', usuarioId: 'joao', nome: 'João Mendes', vagas: 1, status: 'FINALIZADA' },
      { id: 'r5', usuarioId: 'rafael', nome: 'Rafael Costa', vagas: 1, status: 'FINALIZADA' },
    ],
    participantes: [1, 'beatriz', 'joao', 'rafael'],
  },
  {
    id: '3',
    status: 'CANCELADA',
    dataHoraSaida: '2026-05-18T07:15:00',
    dataHoraChegada: '',
    origem: 'Liberdade',
    destino: 'UFCG',
    pontoReferencia: 'Campus Sede',
    paradas: ['Praça da Liberdade'],
    valor: 4,
    custos: 'Carona cancelada antes da cobrança.',
    motorista: {
      id: 'rafael',
      nome: 'Rafael Costa',
      avaliacao: 4.3,
      fotoPerfil: '',
    },
    reservas: [
      { id: 'r6', usuarioId: 1, nome: 'Estudante UniCar', vagas: 1, status: 'CANCELADA' },
    ],
    participantes: [1, 'rafael'],
  },
  {
    id: '4',
    status: 'RECUSADA',
    dataHoraSaida: '2026-05-15T07:30:00',
    dataHoraChegada: '',
    origem: 'Centro',
    destino: 'UFCG',
    pontoReferencia: 'Campus Sede',
    paradas: ['Terminal de Integração'],
    valor: 5,
    custos: 'Reserva recusada pelo motorista antes da confirmação.',
    motorista: {
      id: 'ana',
      nome: 'Ana Paula',
      avaliacao: 4.5,
      fotoPerfil: '',
    },
    reservas: [
      { id: 'r7', usuarioId: 1, nome: 'Estudante UniCar', vagas: 1, status: 'RECUSADA' },
    ],
    participantes: [1, 'ana'],
  },
  {
    id: '101',
    status: 'FINALIZADA',
    dataHoraSaida: '2026-05-28T07:20:00',
    dataHoraChegada: '2026-05-28T07:55:00',
    origem: 'Centenário',
    destino: 'UFCG',
    pontoReferencia: 'Campus Sede',
    paradas: ['Avenida Floriano Peixoto', 'Biblioteca Central'],
    valor: 5,
    custos: 'Combustível dividido entre os passageiros confirmados.',
    motorista: {
      id: 1,
      nome: 'Estudante UniCar',
      avaliacao: 4.8,
      fotoPerfil: '',
    },
    reservas: [
      { id: 'r101-1', usuarioId: 5, nome: 'Marina Souza', vagas: 1, status: 'FINALIZADA' },
      { id: 'r101-2', usuarioId: 8, nome: 'João Mendes', vagas: 1, status: 'FINALIZADA' },
      { id: 'r101-3', usuarioId: 9, nome: 'Beatriz Lima', vagas: 1, status: 'FINALIZADA' },
      { id: 'r101-4', usuarioId: 10, nome: 'Rafael Costa', vagas: 1, status: 'FINALIZADA' },
    ],
    participantes: [1, 5, 8, 9, 10],
  },
  {
    id: '102',
    status: 'FINALIZADA',
    dataHoraSaida: '2026-05-25T08:00:00',
    dataHoraChegada: '2026-05-25T08:35:00',
    origem: 'Liberdade',
    destino: 'UFCG',
    pontoReferencia: 'CCT',
    paradas: ['Praça da Liberdade'],
    valor: 6,
    custos: 'Custo estimado para combustível e estacionamento.',
    motorista: {
      id: 1,
      nome: 'Estudante UniCar',
      avaliacao: 4.8,
      fotoPerfil: '',
    },
    reservas: [
      { id: 'r102-1', usuarioId: 6, nome: 'Lucas Pereira', vagas: 1, status: 'FINALIZADA' },
      { id: 'r102-2', usuarioId: 11, nome: 'Ana Paula', vagas: 1, status: 'FINALIZADA' },
      { id: 'r102-3', usuarioId: 12, nome: 'Rafael Costa', vagas: 1, status: 'FINALIZADA' },
    ],
    participantes: [1, 6, 11, 12],
  },
  {
    id: '103',
    status: 'CANCELADA',
    dataHoraSaida: '2026-05-20T06:45:00',
    dataHoraChegada: '',
    origem: 'Catolé',
    destino: 'UFCG',
    pontoReferencia: 'Campus Sede',
    paradas: ['Avenida Brasília'],
    valor: 0,
    custos: 'Carona cancelada antes da cobrança.',
    motorista: {
      id: 1,
      nome: 'Estudante UniCar',
      avaliacao: 4.8,
      fotoPerfil: '',
    },
    reservas: [
      { id: 'r103-1', usuarioId: 7, nome: 'Ana Carolina', vagas: 1, status: 'CANCELADA' },
    ],
    participantes: [1, 7],
  },
  {
    id: '403',
    status: 'FINALIZADA',
    dataHoraSaida: '2026-05-10T08:00:00',
    dataHoraChegada: '2026-05-10T08:35:00',
    origem: 'Bodocongó',
    destino: 'UFCG',
    pontoReferencia: 'Bloco CN',
    paradas: [],
    valor: 5,
    custos: 'Carona privada de outro usuário.',
    motorista: {
      id: 'outro-motorista',
      nome: 'Outro Motorista',
      avaliacao: 5,
      fotoPerfil: '',
    },
    reservas: [
      { id: 'r403', usuarioId: 'outro-passageiro', nome: 'Outro Passageiro', vagas: 1, status: 'FINALIZADA' },
    ],
    participantes: ['outro-motorista', 'outro-passageiro'],
  },
];

export async function obterDetalhesHistorico(id) {
  if (shouldUseLocalDataMocks()) {
    return obterDetalheMock(id, { validarAcesso: true });
  }

  try {
    const detalhe = await apiRequest(`/historico/${id}`);

    return normalizarDetalheHistorico(detalhe);
  } catch (error) {
    if (error.status === 403) {
      throw error;
    }

    if (shouldUseDevelopmentFallbacks()) {
      return obterDetalheMock(id, { validarAcesso: true });
    }

    throw error;
  }
}

function obterDetalheMock(id, { validarAcesso }) {
  const detalhe = DETALHES_HISTORICO_MOCK.find((item) => String(item.id) === String(id));

  if (!detalhe) {
    const error = new Error('Detalhes da carona não encontrados.');
    error.status = 404;
    throw error;
  }

  if (validarAcesso) {
    validarParticipante(detalhe);
  }

  return normalizarDetalheHistorico(detalhe);
}

function validarParticipante(detalhe) {
  const usuario = getSession()?.usuario;
  const usuarioId = usuario?.id ?? usuario?.usuarioId ?? usuario?.matricula;
  const participantes = detalhe.participantes || [];

  if (!participantes.map(String).includes(String(usuarioId))) {
    const error = new Error('Acesso negado.');
    error.status = 403;
    throw error;
  }
}

function normalizarDetalheHistorico(detalhe = {}) {
  const motorista = detalhe.motorista || detalhe.condutor || {};
  const reservas = extrairLista(detalhe.reservas || detalhe.passageiros || detalhe.participantesReserva);

  return {
    id: detalhe.id,
    status: detalhe.status || detalhe.statusFinal || 'FINALIZADA',
    dataHoraSaida: detalhe.dataHoraSaida || detalhe.dataHora || '',
    dataHoraChegada: detalhe.dataHoraChegada || detalhe.chegadaPrevista || '',
    origem: descricaoLocal(detalhe.origem),
    destino: descricaoLocal(detalhe.destino),
    pontoReferencia: detalhe.pontoReferencia || detalhe.pontoEncontro || '',
    paradas: extrairLista(detalhe.paradas || detalhe.pontosParada).map(descricaoLocal).filter(Boolean),
    valor: Number(detalhe.valor ?? detalhe.custo ?? detalhe.preco ?? 0),
    custos: detalhe.custos || detalhe.descricaoCustos || '',
    vagasTotais: detalhe.vagasTotais ?? detalhe.quantidadeVagas ?? detalhe.totalVagas ?? 0,
    veiculo: detalhe.veiculo ? {
      modelo: detalhe.veiculo.modelo || '',
      cor: detalhe.veiculo.cor || '',
      placa: detalhe.veiculo.placa || '',
    } : null,
    motorista: {
      id: motorista.id ?? motorista.usuarioId ?? detalhe.motoristaId ?? '',
      nome: motorista.nome || motorista.nomeCompleto || 'Motorista',
      avaliacao: motorista.avaliacao ?? motorista.rating ?? '',
      fotoPerfil: motorista.fotoPerfil || motorista.avatarUrl || motorista.avatar || '',
    },
    reservas: reservas.map(normalizarReserva),
  };
}

function normalizarReserva(reserva = {}) {
  const usuario = reserva.usuario || reserva.passageiro || reserva;

  return {
    id: reserva.id ?? usuario.id ?? usuario.usuarioId ?? usuario.nome,
    usuarioId: usuario.id ?? usuario.usuarioId ?? reserva.usuarioId ?? '',
    nome: usuario.nome || usuario.nomeCompleto || reserva.nome || 'Passageiro',
    vagas: reserva.vagas ?? reserva.quantidadePassageiros ?? reserva.vagasReservadas ?? 1,
    status: reserva.status || 'CONFIRMADA',
    avaliacao: usuario.avaliacao ?? usuario.rating ?? reserva.avaliacao ?? '',
    fotoPerfil: usuario.fotoPerfil || usuario.avatarUrl || '',
  };
}

function extrairLista(valor) {
  if (Array.isArray(valor)) {
    return valor;
  }

  return valor?.content || valor?.items || [];
}

function descricaoLocal(local) {
  if (!local) {
    return '';
  }

  return typeof local === 'string' ? local : local.descricao || local.nome || local.endereco || '';
}

function hojeAs(hora, minuto) {
  const data = new Date();
  data.setHours(hora, minuto, 0, 0);

  const pad = (valor) => String(valor).padStart(2, '0');

  return (
    `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}` +
    `T${pad(data.getHours())}:${pad(data.getMinutes())}:00`
  );
}
