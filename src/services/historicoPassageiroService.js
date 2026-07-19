import { apiRequest } from './api.js';

export async function listarHistoricoComoPassageiro() {
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
