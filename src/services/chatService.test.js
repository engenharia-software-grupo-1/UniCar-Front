import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const BASE_URL = 'http://localhost:8080';
let chatService;

function respostaJson(body, { status = 200 } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json' },
    json: async () => body,
  };
}

beforeEach(async () => {
  sessionStorage.setItem('unicar.session', JSON.stringify({ token: 'token', usuario: { id: 1 } }));
  vi.resetModules();
  vi.stubEnv('VITE_API_URL', BASE_URL);
  vi.stubGlobal('fetch', vi.fn());
  chatService = await import('./chatService.js');
});

afterEach(() => {
  sessionStorage.clear();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('chatService', () => {
  it('localiza o chat pelo id da reserva', async () => {
    fetch.mockResolvedValue(respostaJson([
      { id: 8, reservaId: 20 },
      { id: 9, reservaId: 77, nomeParticipante: 'João' },
    ]));

    await expect(chatService.obterChatDaReserva(77)).resolves.toMatchObject({ id: 9 });
    expect(fetch.mock.calls[0][0]).toBe(`${BASE_URL}/chats`);
  });

  it('carrega e normaliza mensagens', async () => {
    fetch.mockResolvedValue(respostaJson([
      { id: 1, remetenteId: 5, conteudo: 'Olá', lida: false, dataEnvio: '2026-07-19T10:00:00' },
    ]));

    await expect(chatService.listarMensagensChat(9)).resolves.toEqual([
      { id: 1, remetenteId: 5, texto: 'Olá', lida: false, dataEnvio: '2026-07-19T10:00:00' },
    ]);
    expect(fetch.mock.calls[0][0]).toBe(`${BASE_URL}/chats/9/mensagens`);
  });

  it('envia o corpo esperado pelo backend', async () => {
    fetch.mockResolvedValue(respostaJson(
      { id: 2, remetenteId: 1, conteudo: 'Cheguei', lida: false, dataEnvio: '2026-07-19T10:01:00' },
      { status: 201 },
    ));

    await chatService.enviarMensagemChat(9, 'Cheguei');

    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/chats/9/mensagens`);
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({ conteudo: 'Cheguei' });
  });

  it('marca as mensagens como lidas', async () => {
    fetch.mockResolvedValue({
      ok: true,
      status: 204,
      headers: { get: () => null },
    });

    await chatService.marcarMensagensComoLidas(9);

    expect(fetch.mock.calls[0][0]).toBe(`${BASE_URL}/chats/9/lidas`);
    expect(fetch.mock.calls[0][1].method).toBe('PATCH');
  });

  it('identifica mensagem não lida recebida de outro usuário', async () => {
    fetch
      .mockResolvedValueOnce(respostaJson([{ id: 9 }]))
      .mockResolvedValueOnce(respostaJson([
        { id: 1, remetenteId: 5, conteudo: 'Olá', lida: false },
        { id: 2, remetenteId: 1, conteudo: 'Minha mensagem', lida: false },
      ]));

    await expect(chatService.temMensagensChatNaoLidas()).resolves.toBe(true);
  });
});
