import { shouldUseLocalDataMocks } from './apiConfig.js';
import { apiRequest } from './api.js';
import { getSession } from './authService.js';

const MOCK_NOTIFICACOES = [
  {
    id: 1,
    titulo: 'Vaga confirmada',
    mensagem:
      'Sua vaga na carona de Marina (07:20) foi confirmada. Ponto de encontro: Praça da Bandeira, saída às 07:15. Leve o comprovante da matrícula para agilizar o embarque.',
    detalhes:
      'Sua vaga na carona de Marina (07:20) foi confirmada. Ponto de encontro: Praça da Bandeira, saída às 07:15. Leve o comprovante da matrícula para agilizar o embarque.',
    dataHora: minutosAtras(5),
    lida: false,
    tipo: 'confirmada',
  },
  {
    id: 2,
    titulo: 'Lembrete de partida',
    mensagem:
      'Sua carona com Lucas sai em 30 minutos. Não esqueça de estar no ponto combinado com antecedência.',
    detalhes:
      'Sua carona com Lucas sai em 30 minutos. Não esqueça de estar no ponto combinado com antecedência.',
    dataHora: horasAtras(1),
    lida: false,
    tipo: 'lembrete',
  },
  {
    id: 3,
    titulo: 'Nova carona compatível',
    mensagem:
      'Marina abriu vaga no trajeto Centenário → UFCG (07:20). Restam 2 vagas disponíveis por R$ 8,00.',
    detalhes:
      'Marina abriu vaga no trajeto Centenário → UFCG (07:20). Restam 2 vagas disponíveis por R$ 8,00.',
    dataHora: horasAtras(2),
    lida: true,
    tipo: 'compatível',
  },
  {
    id: 4,
    titulo: 'Carona cancelada',
    mensagem:
      'Ana cancelou a carona de amanhã 06:45. Sugerimos buscar alternativas no painel de caronas próximas.',
    detalhes:
      'Ana cancelou a carona de amanhã 06:45. Sugerimos buscar alternativas no painel de caronas próximas.',
    dataHora: diasAtras(1),
    lida: true,
    tipo: 'cancelada',
  },
  {
    id: 5,
    titulo: 'Nova avaliação',
    mensagem:
      'Você recebeu 5 estrelas de João Mendes. "Motorista pontual e super tranquilo!"',
    detalhes:
      'Você recebeu 5 estrelas de João Mendes. "Motorista pontual e super tranquilo!"',
    dataHora: diasAtras(2),
    lida: true,
    tipo: 'avaliacao',
  },
];

export async function listarNotificacoes() {
  obterToken();

  if (shouldUseLocalDataMocks()) {
    return ordenarPorDataDesc(MOCK_NOTIFICACOES.map(normalizarNotificacao));
  }

  const resposta = await apiRequest('/notificacoes');
  const notificacoes = Array.isArray(resposta)
    ? resposta
    : resposta?.content || resposta?.items || resposta?.notificacoes || [];

  return ordenarPorDataDesc(notificacoes.map(normalizarNotificacao));
}

export async function marcarNotificacaoComoLida(id) {
  obterToken();

  if (!id) {
    throw new Error('Notificação inválida.');
  }

  if (shouldUseLocalDataMocks()) {
    const notificacao = MOCK_NOTIFICACOES.find((item) => item.id === id);

    if (!notificacao) {
      throw new Error('Notificação não encontrada.');
    }

    notificacao.lida = true;
    return { id, lida: true };
  }

  // Contrato (openapi): PATCH /notificacoes/{id}/visualizar. Não existe endpoint
  // de "marcar todas" — essa feature foi removida por não estar no contrato.
  return apiRequest(`/notificacoes/${encodeURIComponent(id)}/visualizar`, {
    method: 'PATCH',
  });
}

function obterToken() {
  const session = getSession();

  if (!session?.token) {
    throw new Error('Usuário não autenticado.');
  }

  return session.token;
}

function normalizarNotificacao(notificacao = {}) {
  return {
    id:
      notificacao.id ??
      notificacao.notificacaoId ??
      `${notificacao.dataHora ?? notificacao.createdAt ?? ''}-${notificacao.titulo ?? ''}`,
    titulo: notificacao.titulo ?? notificacao.title ?? 'Notificação',
    mensagem: notificacao.mensagem ?? notificacao.message ?? notificacao.descricao ?? '',
    detalhes:
      notificacao.detalhes ??
      notificacao.details ??
      notificacao.conteudo ??
      notificacao.mensagem ??
      notificacao.message ??
      '',
    dataHora:
      notificacao.dataHora ??
      notificacao.data ??
      notificacao.createdAt ??
      notificacao.criadoEm ??
      '',
    lida: Boolean(notificacao.lida ?? notificacao.read ?? notificacao.visualizada),
    tipo: notificacao.tipo ?? notificacao.type ?? 'sistema',
  };
}

function ordenarPorDataDesc(notificacoes) {
  return [...notificacoes].sort((a, b) => {
    const dataA = new Date(a.dataHora).getTime();
    const dataB = new Date(b.dataHora).getTime();

    return normalizarTempo(dataB) - normalizarTempo(dataA);
  });
}

function normalizarTempo(tempo) {
  return Number.isNaN(tempo) ? 0 : tempo;
}

function minutosAtras(minutos) {
  return dataRelativa(minutos * 60000);
}

function horasAtras(horas) {
  return dataRelativa(horas * 60 * 60000);
}

function diasAtras(dias) {
  return dataRelativa(dias * 24 * 60 * 60000);
}

function dataRelativa(diferencaMs) {
  return new Date(Date.now() - diferencaMs).toISOString();
}
