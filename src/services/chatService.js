import { apiRequest } from './api.js';
import { getSession } from './authService.js';

// Usado pela barra superior para sinalizar novas mensagens mesmo quando o chat
// não está aberto. Só conta mensagens recebidas de outra pessoa.
export async function temMensagensChatNaoLidas() {
  const usuarioId = getSession()?.usuario?.id;
  if (!usuarioId) return false;

  const resposta = await apiRequest('/chats');
  const chats = Array.isArray(resposta) ? resposta : resposta?.content || [];

  const listas = await Promise.all(
    chats.filter((chat) => chat?.id != null).map((chat) => listarMensagensChat(chat.id)),
  );

  return listas.flat().some((mensagem) =>
    !mensagem.lida && String(mensagem.remetenteId) !== String(usuarioId),
  );
}

export async function obterChatDaReserva(reservaId) {
  const resposta = await apiRequest('/chats');
  const chats = Array.isArray(resposta) ? resposta : resposta?.content || [];
  const chat = chats.find((item) => String(item.reservaId) === String(reservaId));

  if (!chat) {
    const error = new Error('Chat não encontrado para esta reserva.');
    error.status = 404;
    throw error;
  }

  return chat;
}

export async function listarMensagensChat(chatId) {
  const resposta = await apiRequest(`/chats/${encodeURIComponent(chatId)}/mensagens`);
  const mensagens = Array.isArray(resposta) ? resposta : resposta?.content || [];

  return mensagens.map(normalizarMensagem);
}

export async function enviarMensagemChat(chatId, conteudo) {
  const mensagem = await apiRequest(`/chats/${encodeURIComponent(chatId)}/mensagens`, {
    method: 'POST',
    body: JSON.stringify({ conteudo }),
  });

  return normalizarMensagem(mensagem);
}

export async function marcarMensagensComoLidas(chatId) {
  return apiRequest(`/chats/${encodeURIComponent(chatId)}/lidas`, {
    method: 'PATCH',
  });
}

function normalizarMensagem(mensagem = {}) {
  return {
    id: mensagem.id,
    remetenteId: mensagem.remetenteId,
    texto: mensagem.conteudo ?? mensagem.texto ?? '',
    lida: Boolean(mensagem.lida),
    dataEnvio: mensagem.dataEnvio ?? mensagem.dataHora ?? '',
  };
}
