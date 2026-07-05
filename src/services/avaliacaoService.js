import { getSession } from './authService.js';
import { apiRequest } from './api.js';
import { API_BASE_URL, shouldUseLocalDataMocks, shouldUseMocks } from './apiConfig.js';

const AVALIACOES_RECEBIDAS_ENDPOINT = `${API_BASE_URL}/usuarios/me/avaliacoes`;
const MOCK_AVALIACOES_RECEBIDAS = [
  {
    id: 1,
    from: 'Mariana',
    nota: 5,
    comentario: 'Pontual, educada e deixou a viagem tranquila.',
    dataAvaliacao: '2026-06-15',
  },
  {
    id: 2,
    from: 'Carlos',
    nota: 4,
    comentario: 'Boa comunicação antes da carona.',
    dataAvaliacao: '2026-06-02',
  },
  {
    id: 3,
    from: 'Bianca',
    nota: 5,
    comentario: 'Experiência excelente.',
    dataAvaliacao: '2026-05-21',
  },
];

function usarAvaliacoesMockadas() {
  return shouldUseLocalDataMocks();
}

function obterToken() {
  const session = getSession();

  if (!session?.token) {
    throw new Error('Usuário não autenticado.');
  }

  return session.token;
}

async function extrairMensagemErro(response, mensagemPadrao) {
  try {
    const corpo = await response.json();

    return corpo?.message || corpo?.erro || corpo?.error || mensagemPadrao;
  } catch {
    return mensagemPadrao;
  }
}

export async function listarAvaliacoesRecebidas() {
  const token = obterToken();

  if (usarAvaliacoesMockadas()) {
    return MOCK_AVALIACOES_RECEBIDAS.map(normalizarAvaliacao);
  }

  let response;

  try {
    response = await fetch(AVALIACOES_RECEBIDAS_ENDPOINT, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw new Error('Não foi possível conectar ao servidor. Tente novamente.');
  }

  if (!response.ok) {
    const mensagem = await extrairMensagemErro(
      response,
      'Não foi possível carregar as avaliações.',
    );

    throw new Error(mensagem);
  }

  const dados = await response.json();
  const avaliacoes = Array.isArray(dados) ? dados : dados?.avaliacoes;

  if (!Array.isArray(avaliacoes)) {
    throw new Error('Resposta de avaliações inválida.');
  }

  return avaliacoes.map(normalizarAvaliacao);
}

export async function criarAvaliacao({ caronaId, avaliadoId, nota, comentario } = {}) {
  // Garante que há sessão antes de enviar (mesmo comportamento das demais funções).
  obterToken();

  const notaNumerica = Number(nota);

  if (!Number.isInteger(notaNumerica) || notaNumerica < 1 || notaNumerica > 5) {
    throw new Error('Selecione uma nota de 1 a 5 estrelas.');
  }

  const corpo = {
    caronaId,
    avaliadoId,
    nota: notaNumerica,
    comentario: comentario?.trim() ? comentario.trim() : '',
  };

  // Em modo totalmente offline (VITE_ENABLE_MOCKS=true) não tocamos a rede.
  // Em dev normal o POST é real, passando pelo proxy do Vite para o backend.
  if (shouldUseMocks()) {
    return { id: Date.now() };
  }

  return apiRequest('/avaliacoes', {
    method: 'POST',
    body: JSON.stringify(corpo),
  });
}

function normalizarAvaliacao(avaliacao = {}) {
  return {
    id:
      avaliacao.id ??
      avaliacao.avaliacaoId ??
      `${avaliacao.dataAvaliacao ?? avaliacao.data ?? ''}-${avaliacao.comentario ?? ''}`,
    nota: Number(avaliacao.nota ?? avaliacao.rating ?? avaliacao.estrelas ?? 0),
    from:
      avaliacao.from ??
      avaliacao.autor ??
      avaliacao.nomeAvaliador ??
      avaliacao.avaliador?.nome ??
      avaliacao.avaliador?.nomeCompleto ??
      avaliacao.usuario?.nome ??
      avaliacao.usuario?.nomeCompleto ??
      'Usuário UniCar',
    comentario:
      avaliacao.comentario ??
      avaliacao.comment ??
      avaliacao.observacao ??
      'Sem comentário.',
    dataAvaliacao:
      avaliacao.dataAvaliacao ??
      avaliacao.data ??
      avaliacao.createdAt ??
      avaliacao.criadoEm ??
      '',
  };
}
