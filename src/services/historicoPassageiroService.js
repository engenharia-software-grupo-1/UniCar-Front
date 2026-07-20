import { apiRequest } from './api.js';

export async function listarHistoricoComoPassageiro() {
  const resposta = await apiRequest('/historico/passageiro?size=100');
  const reservas = Array.isArray(resposta)
    ? resposta
    : resposta?.content || resposta?.items || resposta?.reservas || [];

  return reservas.map(normalizarReservaPassageiro);
}

function normalizarReservaPassageiro(reserva = {}) {
  const motoristaRecebido = reserva.motorista || reserva.carona?.motorista || {};
  const motorista = typeof motoristaRecebido === 'string'
    ? { nome: motoristaRecebido }
    : motoristaRecebido;
  const usuarioMotorista = motorista.usuario || motorista;

  return {
    id: reserva.reservaId ?? reserva.id,
    caronaId: reserva.caronaId ?? reserva.carona?.id,
    status: reserva.status || 'PENDENTE',
    dataHora: reserva.dataViagem || reserva.dataHora || reserva.carona?.dataHoraSaida || '',
    vagasReservadas: reserva.vagasReservadas ?? reserva.quantidadePassageiros ?? 1,
    totalVagas:
      reserva.totalVagas ?? reserva.carona?.quantidadeVagas ?? reserva.carona?.vagasTotais ?? null,
    origem: descricaoLocal(reserva.origem || reserva.carona?.origem),
    destino: descricaoLocal(reserva.destino || reserva.carona?.destino),
    pontoReferencia:
      reserva.pontoReferencia || reserva.pontoEncontro || reserva.carona?.pontoEncontro || '',
    motorista: {
      id: usuarioMotorista.id ?? usuarioMotorista.usuarioId ?? usuarioMotorista.userId ?? reserva.motoristaId ?? '',
      nome: usuarioMotorista.nome || usuarioMotorista.nomeCompleto || 'Motorista',
      // O histórico pode chamar essa média de reputação, ao contrário de
      // outras respostas da API que usam avaliacao/rating.
      avaliacao:
        usuarioMotorista.reputacao ?? usuarioMotorista.avaliacao ?? usuarioMotorista.rating ?? '',
      fotoPerfil:
        usuarioMotorista.fotoPerfil ||
        usuarioMotorista.linkFoto ||
        usuarioMotorista.avatarUrl ||
        usuarioMotorista.avatar ||
        reserva.motoristaLinkFoto ||
        '',
    },
  };
}

function descricaoLocal(local) {
  if (!local) {
    return '';
  }

  return typeof local === 'string' ? local : local.descricao || local.nome || '';
}
