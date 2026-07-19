import { apiRequest } from './api.js';

export async function listarHistoricoComoMotorista() {
  const resposta = await apiRequest('/historico/motorista?size=100');
  return extrairLista(resposta).map(normalizarCaronaMotorista);
}

function normalizarCaronaMotorista(carona = {}) {
  const passageiros = extrairPassageiros(carona).map(normalizarPassageiro).filter((passageiro) => passageiro.nome);
  const vagasOcupadas = obterNumero(
    carona.vagasOcupadas ??
      carona.reservasConfirmadas ??
      carona.quantidadeReservas ??
      carona.quantidadePassageiros ??
      carona.totalPassageiros ??
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
    id: carona.caronaId ?? carona.id,
    status: carona.status || 'ATIVA',
    dataHoraSaida: carona.dataViagem || carona.dataHoraSaida || carona.dataHora || '',
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
