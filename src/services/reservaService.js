import { apiRequest } from './api.js';
import { shouldUseLocalDataMocks } from './apiConfig.js';

// RESERVAS (contrato US10)
//
// É por aqui que o app sabe em quais caronas o usuário é PASSAGEIRO: o
// /caronas/minhas (US7) devolve só as caronas em que ele é o MOTORISTA.

// Status de reserva do contrato (US10, "Status Possíveis").
export const RESERVA_ACEITA = 'ACEITA';

// GET /reservas/enviadas — as solicitações que EU fiz (RN-RES-11).
// Cada item traz { id, carona: { id, origem, destino }, status,
// quantidadePassageiros, valorContribuicao } — repare que a carona vem sem
// dataHoraSaida, então quem precisar do horário busca o detalhe da carona.
export async function listarReservasEnviadas() {
  if (shouldUseLocalDataMocks()) {
    // O store local do caronaService representa as caronas do próprio motorista
    // e não modela reservas — sem backend, o usuário não é passageiro de nada.
    return [];
  }

  const resposta = await apiRequest('/reservas/enviadas');
  const reservas = Array.isArray(resposta)
    ? resposta
    : resposta?.content || resposta?.reservas || resposta?.items || [];

  return reservas.map(ajustarReserva);
}

// Só as reservas que o motorista aceitou — as pendentes ainda podem ser
// recusadas (RN-RES-20), então não valem como "você é passageiro".
export async function listarReservasAceitas() {
  const reservas = await listarReservasEnviadas();

  return reservas.filter((reserva) => reserva.status === RESERVA_ACEITA);
}

function ajustarReserva(reserva = {}) {
  const carona = reserva.carona || {};

  return {
    id: reserva.id,
    status: String(reserva.status || '').toUpperCase(),
    quantidadePassageiros: reserva.quantidadePassageiros ?? 1,
    valorContribuicao: reserva.valorContribuicao ?? null,
    carona: {
      id: carona.id,
      origem: descricao(carona.origem),
      destino: descricao(carona.destino),
    },
  };
}

// O contrato manda origem/destino da reserva como texto, mas o resto da API usa
// { descricao, ... } — aceitamos os dois.
function descricao(local) {
  if (!local) {
    return '';
  }

  return typeof local === 'string' ? local : local.descricao || '';
}
