import { apiRequest } from './api.js';
import { getSession } from './authService.js';

// Usado pela barra superior para sinalizar novas mensagens mesmo quando o chat
// não está aberto. Só conta mensagens recebidas de outra pessoa.
export async function temMensagensChatNaoLidas() {
  const alertas = await listarAlertasChatNaoLidas();
  return alertas.length > 0;
}

// Lista usada pela caixa de entrada. Como versões antigas do resumo de /chats
// ainda devolvem uma mensagem genérica e zero não lidas, consultamos as
// mensagens de cada conversa para manter a prévia e o contador corretos.
export async function listarChats() {
  const usuarioId = getSession()?.usuario?.id;
  const resposta = await apiRequest('/chats');
  const chats = Array.isArray(resposta) ? resposta : resposta?.content || [];

  const normalizados = await Promise.all(chats.map(async (chat) => {
    const [mensagens, reserva] = await Promise.all([
      listarMensagensChat(chat.id).catch(() => []),
      chat.reservaId
        ? apiRequest(`/reservas/${encodeURIComponent(chat.reservaId)}`).catch(() => null)
        : Promise.resolve(null),
    ]);
    const ultima = mensagens.at(-1);
    const naoLidasCalculadas = mensagens.filter((mensagem) =>
      !mensagem.lida && String(mensagem.remetenteId) !== String(usuarioId),
    ).length;
    const carona = reserva?.carona || chat.carona || {};

    return {
      id: chat.id,
      reservaId: chat.reservaId,
      caronaId: chat.caronaId ?? carona.id ?? reserva?.caronaId,
      participanteId:
        chat.participanteId ?? chat.usuarioParticipanteId ?? chat.usuarioId ?? '',
      nomeParticipante: chat.nomeParticipante || 'Participante',
      fotoParticipante:
        chat.linkFotoParticipante || chat.fotoParticipante || chat.fotoUrlParticipante || '',
      verificado: Boolean(chat.participanteVerificado ?? chat.verificado),
      origem: descricaoLocal(chat.origem ?? carona.origem ?? reserva?.origem),
      destino: descricaoLocal(chat.destino ?? carona.destino ?? reserva?.destino),
      dataCarona:
        chat.dataCarona || carona.dataHoraSaida || carona.dataCarona || reserva?.dataCarona || '',
      ultimaMensagem: ultima?.texto || chat.ultimaMensagem || 'Clique para abrir a conversa',
      dataUltimaMensagem: ultima?.dataEnvio || chat.dataUltimaMensagem || '',
      mensagensNaoLidas: mensagens.length > 0
        ? naoLidasCalculadas
        : Number(chat.mensagensNaoLidas) || 0,
    };
  }));

  return normalizados.sort((a, b) =>
    new Date(b.dataUltimaMensagem || 0).getTime() - new Date(a.dataUltimaMensagem || 0).getTime(),
  );
}

// Converte mensagens não lidas em itens que a central de notificações consegue
// exibir. O backend fornece o total no resumo do chat; para respostas antigas,
// consultamos as mensagens como compatibilidade.
export async function listarAlertasChatNaoLidas() {
  const usuarioId = getSession()?.usuario?.id;
  if (!usuarioId) return [];

  const resposta = await apiRequest('/chats');
  const chats = Array.isArray(resposta) ? resposta : resposta?.content || [];

  const alertas = await Promise.all(chats.filter((chat) => chat?.id != null).map(async (chat) => {
    let quantidade = Number(chat.mensagensNaoLidas);
    let ultimaMensagem = chat.ultimaMensagem || '';
    let dataHora = chat.dataUltimaMensagem || '';

    if (!Number.isFinite(quantidade)) {
      const mensagens = await listarMensagensChat(chat.id);
      const naoLidas = mensagens.filter((mensagem) =>
        !mensagem.lida && String(mensagem.remetenteId) !== String(usuarioId),
      );
      quantidade = naoLidas.length;
      ultimaMensagem ||= naoLidas.at(-1)?.texto || '';
      dataHora ||= naoLidas.at(-1)?.dataEnvio || '';
    }

    if (quantidade <= 0) return null;

    const participante = chat.nomeParticipante || 'participante da carona';
    const mensagem = ultimaMensagem || `Você recebeu ${quantidade} ${quantidade === 1 ? 'nova mensagem' : 'novas mensagens'}.`;

    return {
      id: `chat-${chat.id}`,
      chatId: chat.id,
      reservaId: chat.reservaId,
      titulo: `Nova mensagem de ${participante}`,
      mensagem,
      detalhes: mensagem,
      dataHora: dataHora || new Date().toISOString(),
      lida: false,
      tipo: 'chat',
    };
  }));

  return alertas.filter(Boolean);
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

function descricaoLocal(local) {
  if (!local) return '';
  return typeof local === 'string' ? local : local.descricao || local.nome || '';
}
