import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const BASE_URL = 'http://localhost:8080';
const TOKEN = 'token-simulado';

function comSessao() {
  localStorage.setItem(
    'unicar.session',
    JSON.stringify({ token: TOKEN, usuario: { nome: 'Fulano' } }),
  );
}

function respostaJson(body, { ok = true, status = 200 } = {}) {
  return { ok, status, json: async () => body };
}

async function importarService() {
  vi.resetModules();
  const service = await import('./avaliacaoService.js');
  return service.listarAvaliacoesRecebidas;
}

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('fetch', vi.fn());
  vi.stubEnv('VITE_API_URL', BASE_URL);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('listarAvaliacoesRecebidas', () => {
  it('rejeita sem sessão e não chama fetch', async () => {
    const listarAvaliacoesRecebidas = await importarService();

    await expect(listarAvaliacoesRecebidas()).rejects.toThrow('Usuário não autenticado.');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('faz GET /avaliacoes/recebidas com Authorization e normaliza o retorno', async () => {
    comSessao();
    fetch.mockResolvedValue(
      respostaJson([
        {
          avaliacaoId: 7,
          avaliador: { nome: 'Mariana' },
          rating: 4,
          comment: 'Boa carona.',
          data: '2026-06-15',
        },
      ]),
    );

    const listarAvaliacoesRecebidas = await importarService();
    const resultado = await listarAvaliacoesRecebidas();

    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/avaliacoes/recebidas`);
    expect(options.method).toBe('GET');
    expect(options.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(resultado).toEqual([
      {
        id: 7,
        nota: 4,
        from: 'Mariana',
        comentario: 'Boa carona.',
        dataAvaliacao: '2026-06-15',
      },
    ]);
  });

  it('aceita payload envelopado em { avaliacoes }', async () => {
    comSessao();
    fetch.mockResolvedValue(
      respostaJson({
        avaliacoes: [
          {
            id: 1,
            from: 'Carlos',
            nota: 5,
            comentario: 'Excelente.',
            dataAvaliacao: '2026-06-02',
          },
        ],
      }),
    );

    const listarAvaliacoesRecebidas = await importarService();

    await expect(listarAvaliacoesRecebidas()).resolves.toEqual([
      {
        id: 1,
        nota: 5,
        from: 'Carlos',
        comentario: 'Excelente.',
        dataAvaliacao: '2026-06-02',
      },
    ]);
  });

  it('mapeia erro da API para a mensagem retornada', async () => {
    comSessao();
    fetch.mockResolvedValue(
      respostaJson({ message: 'Acesso negado' }, { ok: false, status: 403 }),
    );

    const listarAvaliacoesRecebidas = await importarService();

    await expect(listarAvaliacoesRecebidas()).rejects.toThrow('Acesso negado');
  });
});
