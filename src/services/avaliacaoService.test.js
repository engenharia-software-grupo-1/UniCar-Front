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

// criarAvaliacao passa pelo apiRequest, que inspeciona response.headers.get(...).
function respostaApi(body, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    headers: { get: () => 'application/json' },
    json: async () => body,
  };
}

async function importarService() {
  vi.resetModules();
  const service = await import('./avaliacaoService.js');
  return service.listarAvaliacoesRecebidas;
}

async function importarCriarAvaliacao() {
  vi.resetModules();
  const service = await import('./avaliacaoService.js');
  return service.criarAvaliacao;
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

  it('faz GET /usuarios/me/avaliacoes com Authorization e normaliza o retorno', async () => {
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
    expect(url).toBe(`${BASE_URL}/usuarios/me/avaliacoes`);
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

describe('criarAvaliacao', () => {
  const payload = {
    caronaId: 10,
    avaliadoId: 5,
    nota: 5,
    comentario: 'Motorista pontual e educado.',
  };

  it('rejeita sem sessão e não chama fetch', async () => {
    const criarAvaliacao = await importarCriarAvaliacao();

    await expect(criarAvaliacao(payload)).rejects.toThrow('Usuário não autenticado.');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejeita nota inválida sem chamar fetch', async () => {
    comSessao();
    const criarAvaliacao = await importarCriarAvaliacao();

    await expect(criarAvaliacao({ ...payload, nota: 0 })).rejects.toThrow(
      'Selecione uma nota de 1 a 5 estrelas.',
    );
    await expect(criarAvaliacao({ ...payload, nota: 6 })).rejects.toThrow(
      'Selecione uma nota de 1 a 5 estrelas.',
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it('faz POST /avaliacoes com Authorization, JSON e retorna o id', async () => {
    comSessao();
    fetch.mockResolvedValue(respostaApi({ id: 100 }, { status: 201 }));

    const criarAvaliacao = await importarCriarAvaliacao();
    const resultado = await criarAvaliacao(payload);

    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/avaliacoes`);
    expect(options.method).toBe('POST');
    expect(options.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(options.body)).toEqual({
      caronaId: 10,
      avaliadoId: 5,
      nota: 5,
      comentario: 'Motorista pontual e educado.',
    });
    expect(resultado).toEqual({ id: 100 });
  });

  it('envia comentário vazio quando omitido', async () => {
    comSessao();
    fetch.mockResolvedValue(respostaApi({ id: 101 }, { status: 201 }));

    const criarAvaliacao = await importarCriarAvaliacao();
    await criarAvaliacao({ caronaId: 10, avaliadoId: 5, nota: 4 });

    const [, options] = fetch.mock.calls[0];
    expect(JSON.parse(options.body).comentario).toBe('');
  });

  it('mapeia erro da API para a mensagem retornada', async () => {
    comSessao();
    fetch.mockResolvedValue(
      respostaApi({ message: 'Carona não encontrada.' }, { ok: false, status: 400 }),
    );

    const criarAvaliacao = await importarCriarAvaliacao();

    await expect(criarAvaliacao(payload)).rejects.toThrow('Carona não encontrada.');
  });

  it('traduz falha de conexão', async () => {
    comSessao();
    fetch.mockRejectedValue(new TypeError('Failed to fetch'));

    const criarAvaliacao = await importarCriarAvaliacao();

    await expect(criarAvaliacao(payload)).rejects.toThrow(
      'Não foi possível conectar ao servidor. Tente novamente.',
    );
  });
});
