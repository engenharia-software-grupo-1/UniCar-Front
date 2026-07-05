import { apiRequest } from './api.js';

export async function buscarProximaCarona() {
  const carona = await apiRequest('/caronas/proxima');

  return carona ? ajustarCarona(carona) : null;
}

export async function buscarSugestoesDeCaronas() {
  const resposta = await apiRequest('/caronas/sugestoes');
  const caronas = Array.isArray(resposta) ? resposta : resposta?.content || resposta?.items || [];

  return caronas.map(ajustarCarona);
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

// implementacao provisoria enquanto back ainda nao foi implementada
export async function listarTrajetosRecorrentes() {
  return [
    {
      id: 1,
      origem: 'Bodocongó',
      destino: 'UFCG - Campus Sede',
      quantidadeViagens: 15,
    },
    {
      id: 2,
      origem: 'Centro',
      destino: 'UFCG - Campus Sede',
      quantidadeViagens: 8,
    },
  ];
}

// AINDA FALTA IMPLEMENTAR A BUSCA DE T. RECORRENTE POR ID

