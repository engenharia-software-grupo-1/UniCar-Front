const RESERVAS_PASSAGEIRO_MOCK = [
  {
    id: 1,
    status: 'CONFIRMADA',
    dataHora: hojeAs(7, 20),
    vagasReservadas: 1,
    totalVagas: 3,
    origem: 'Centenário',
    destino: 'UFCG',
    pontoReferencia: 'Campus Sede',
    motorista: {
      id: 'marina',
      nome: 'Marina Souza',
      avaliacao: 4.9,
      fotoPerfil: '',
    },
  },
  {
    id: 2,
    status: 'FINALIZADA',
    dataHora: '2026-05-22T18:30:00',
    vagasReservadas: 2,
    totalVagas: 4,
    origem: 'Prata',
    destino: 'UFCG',
    pontoReferencia: 'CCT',
    motorista: {
      id: 'beatriz',
      nome: 'Beatriz Lima',
      avaliacao: 4.9,
      fotoPerfil: '',
    },
  },
  {
    id: 3,
    status: 'CANCELADA',
    dataHora: '2026-05-18T07:15:00',
    vagasReservadas: 1,
    totalVagas: 3,
    origem: 'Liberdade',
    destino: 'UFCG',
    pontoReferencia: 'Campus Sede',
    motorista: {
      id: 'rafael',
      nome: 'Rafael Costa',
      avaliacao: 4.3,
      fotoPerfil: '',
    },
  },
  {
    id: 4,
    status: 'RECUSADA',
    dataHora: '2026-05-15T07:30:00',
    vagasReservadas: 1,
    totalVagas: 3,
    origem: 'Centro',
    destino: 'UFCG',
    pontoReferencia: 'Campus Sede',
    motorista: {
      id: 'ana',
      nome: 'Ana Paula',
      avaliacao: 4.5,
      fotoPerfil: '',
    },
  },
];

export async function listarHistoricoComoPassageiro() {
  if (shouldUseLocalDataMocks()) {
    return RESERVAS_PASSAGEIRO_MOCK.map(normalizarReservaPassageiro);
  }

  // O backend atual não implementa /historico/passageiro. As reservas
  // enviadas permanecem disponíveis depois da viagem com status FINALIZADA.
  const resposta = await apiRequest('/reservas/enviadas');
  const reservas = Array.isArray(resposta)
    ? resposta
    : resposta?.content || resposta?.items || resposta?.reservas || [];

  const reservasComDetalhe = await Promise.all(
    reservas.map(async (reserva) => {
      const caronaId = reserva?.carona?.id ?? reserva?.caronaId;
      if (caronaId == null) return reserva;

      try {
        const carona = await apiRequest(`/caronas/${encodeURIComponent(caronaId)}`);
        return {
          ...reserva,
          carona: { ...reserva.carona, ...carona },
          motorista: carona?.motorista || reserva.motorista,
        };
      } catch {
        return reserva;
      }
    }),
  );

  return reservasComDetalhe.map(normalizarReservaPassageiro);
}

export async function obterResumoHistoricoPassageiro() {
  return {
    avaliacaoMedia: 4.8,
    caronasConcluidas: 42,
  };
}

function normalizarReservaPassageiro(reserva = {}) {
  const motorista = reserva.motorista || reserva.carona?.motorista || {};

  return {
    id: reserva.id,
    status: reserva.status || 'PENDENTE',
    dataHora: reserva.dataHora || reserva.carona?.dataHoraSaida || '',
    vagasReservadas: reserva.vagasReservadas ?? reserva.quantidadePassageiros ?? 1,
    totalVagas:
      reserva.totalVagas ?? reserva.carona?.quantidadeVagas ?? reserva.carona?.vagasTotais ?? null,
    origem: descricaoLocal(reserva.origem || reserva.carona?.origem),
    destino: descricaoLocal(reserva.destino || reserva.carona?.destino),
    pontoReferencia:
      reserva.pontoReferencia || reserva.pontoEncontro || reserva.carona?.pontoEncontro || '',
    motorista: {
      id: motorista.id ?? motorista.usuarioId ?? motorista.userId ?? reserva.motoristaId ?? '',
      nome: motorista.nome || motorista.nomeCompleto || 'Motorista',
      avaliacao: motorista.avaliacao ?? motorista.rating ?? '',
      fotoPerfil: motorista.fotoPerfil || motorista.avatarUrl || motorista.avatar || '',
    },
  };
}

function descricaoLocal(local) {
  if (!local) {
    return '';
  }

  return typeof local === 'string' ? local : local.descricao || local.nome || '';
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
import { apiRequest } from './api.js';
import { shouldUseLocalDataMocks } from './apiConfig.js';
