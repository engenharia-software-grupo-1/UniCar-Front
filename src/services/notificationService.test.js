import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const BASE_URL = 'http://localhost:8080';
const TOKEN = 'token-simulado';

let listarNotificacoes;
let marcarNotificacaoComoLida;
let marcarTodasNotificacoesComoLidas;

function comSessao() {
  localStorage.setItem(
    'unicar.session',
    JSON.stringify({ token: TOKEN, usuario: { nome: 'Fulano' } }),
  );
}

function contarNaoLidas(notificacoes) {
  return notificacoes.filter((notificacao) => !notificacao.lida).length;
}

// O api.js chama response.headers.get('content-type') ANTES de response.json(),
// então a resposta fake precisa expor headers.get.
function respostaJson(body, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    headers: { get: () => 'application/json' },
    json: async () => body,
  };
}

// Resposta de erro cujo corpo NÃO é JSON (content-type text/html): api.js nem
// chama json() e cai na mensagem padrão.
function respostaSemJson({ ok = false, status = 500 } = {}) {
  return {
    ok,
    status,
    headers: { get: () => 'text/html' },
    json: async () => {
      throw new SyntaxError('Unexpected end of JSON input');
    },
  };
}

beforeEach(async () => {
  localStorage.clear();
  vi.resetModules();
  vi.stubGlobal('fetch', vi.fn());
  // API_BASE_URL é lido no load do apiConfig — precisa estar stubado antes do import.
  vi.stubEnv('VITE_API_URL', BASE_URL);

  ({
    listarNotificacoes,
    marcarNotificacaoComoLida,
    marcarTodasNotificacoesComoLidas,
  } = await import('./notificationService.js'));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('autenticação', () => {
  it('listarNotificacoes rejeita sem sessão e não chama fetch', async () => {
    await expect(listarNotificacoes()).rejects.toThrow('Usuário não autenticado.');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('marcarNotificacaoComoLida rejeita sem sessão', async () => {
    await expect(marcarNotificacaoComoLida(1)).rejects.toThrow(
      'Usuário não autenticado.',
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it('marcarTodasNotificacoesComoLidas rejeita sem sessão', async () => {
    await expect(marcarTodasNotificacoesComoLidas()).rejects.toThrow(
      'Usuário não autenticado.',
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejeita quando a sessão não tem token', async () => {
    localStorage.setItem('unicar.session', JSON.stringify({ usuario: {} }));

    await expect(listarNotificacoes()).rejects.toThrow('Usuário não autenticado.');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejeita quando a sessão é um JSON corrompido', async () => {
    localStorage.setItem('unicar.session', '{ não é json');

    await expect(listarNotificacoes()).rejects.toThrow('Usuário não autenticado.');
    expect(fetch).not.toHaveBeenCalled();
  });

  // A checagem de sessão vem antes da validação do id.
  it('a sessão é checada antes do id inválido', async () => {
    await expect(marcarNotificacaoComoLida(undefined)).rejects.toThrow(
      'Usuário não autenticado.',
    );
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('validação de id (com sessão, antes de qualquer rede)', () => {
  beforeEach(() => {
    comSessao();
  });

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['string vazia', ''],
    ['zero', 0],
    ['NaN', Number.NaN],
    ['false', false],
  ])('rejeita id inválido: %s', async (_rotulo, id) => {
    await expect(marcarNotificacaoComoLida(id)).rejects.toThrow(
      'Notificação inválida.',
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejeita quando chamada sem argumento', async () => {
    await expect(marcarNotificacaoComoLida()).rejects.toThrow(
      'Notificação inválida.',
    );
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('caminho de rede (VITE_ENABLE_MOCKS desligado)', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_ENABLE_MOCKS', 'false');
    comSessao();
  });

  describe('listarNotificacoes', () => {
    it('faz GET /notificacoes e retorna a lista normalizada', async () => {
      const item = {
        id: 7,
        titulo: 'Vaga confirmada',
        mensagem: 'corpo',
        dataHora: '2026-07-17T10:00:00.000Z',
        lida: false,
        tipo: 'confirmada',
      };
      fetch.mockResolvedValue(respostaJson([item]));

      const notificacoes = await listarNotificacoes();

      const [url, options] = fetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/notificacoes`);
      expect(options.method).toBeUndefined(); // GET (default do fetch)
      expect(options.body).toBeUndefined();
      expect(notificacoes).toHaveLength(1);
      expect(notificacoes[0]).toEqual({
        id: 7,
        titulo: 'Vaga confirmada',
        mensagem: 'corpo',
        detalhes: 'corpo',
        dataHora: '2026-07-17T10:00:00.000Z',
        lida: false,
        tipo: 'confirmada',
      });
    });

    it('envia Authorization: Bearer <token>', async () => {
      fetch.mockResolvedValue(respostaJson([]));

      await listarNotificacoes();

      const [, options] = fetch.mock.calls[0];
      expect(options.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    });

    it('normaliza campos com nomes alternativos vindos do backend', async () => {
      const item = {
        notificacaoId: 42,
        title: 'Backend title',
        message: 'mensagem do backend',
        createdAt: '2026-07-17T09:00:00.000Z',
        read: true,
        type: 'sistema',
      };
      fetch.mockResolvedValue(respostaJson([item]));

      const [notificacao] = await listarNotificacoes();

      expect(notificacao).toEqual({
        id: 42,
        titulo: 'Backend title',
        mensagem: 'mensagem do backend',
        detalhes: 'mensagem do backend',
        dataHora: '2026-07-17T09:00:00.000Z',
        lida: true,
        tipo: 'sistema',
      });
    });

    it.each([
      ['content', (lista) => ({ content: lista })],
      ['items', (lista) => ({ items: lista })],
      ['notificacoes', (lista) => ({ notificacoes: lista })],
    ])('desembrulha o envelope paginado .%s', async (_rotulo, envelope) => {
      const lista = [
        { id: 1, titulo: 'A', dataHora: '2026-07-17T10:00:00.000Z' },
        { id: 2, titulo: 'B', dataHora: '2026-07-17T09:00:00.000Z' },
      ];
      fetch.mockResolvedValue(respostaJson(envelope(lista)));

      const notificacoes = await listarNotificacoes();

      expect(notificacoes.map((item) => item.id)).toEqual([1, 2]);
    });

    it('devolve lista vazia quando a resposta não é array nem envelope conhecido', async () => {
      fetch.mockResolvedValue(respostaJson({ inesperado: true }));

      await expect(listarNotificacoes()).resolves.toEqual([]);
    });

    it('ordena da mais recente para a mais antiga', async () => {
      const lista = [
        { id: 1, dataHora: '2026-07-15T08:00:00.000Z' },
        { id: 2, dataHora: '2026-07-17T08:00:00.000Z' },
        { id: 3, dataHora: '2026-07-16T08:00:00.000Z' },
      ];
      fetch.mockResolvedValue(respostaJson(lista));

      const notificacoes = await listarNotificacoes();

      expect(notificacoes.map((item) => item.id)).toEqual([2, 3, 1]);
    });
  });

  describe('marcarNotificacaoComoLida', () => {
    it('faz PATCH /notificacoes/{id}/lida e devolve o corpo da API', async () => {
      fetch.mockResolvedValue(respostaJson({ id: 1, lida: true }));

      const resultado = await marcarNotificacaoComoLida(1);

      const [url, options] = fetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/notificacoes/1/lida`);
      expect(options.method).toBe('PATCH');
      expect(resultado).toEqual({ id: 1, lida: true });
    });

    it('faz encodeURIComponent do id na URL', async () => {
      fetch.mockResolvedValue(respostaJson({ lida: true }));

      await marcarNotificacaoComoLida('a/b c');

      const [url] = fetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/notificacoes/a%2Fb%20c/lida`);
    });
  });

  describe('marcarTodasNotificacoesComoLidas', () => {
    it('faz PATCH /notificacoes/lidas', async () => {
      fetch.mockResolvedValue(respostaJson({ total: 3 }));

      const resultado = await marcarTodasNotificacoesComoLidas();

      const [url, options] = fetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/notificacoes/lidas`);
      expect(options.method).toBe('PATCH');
      expect(resultado).toEqual({ total: 3 });
    });
  });

  describe('tratamento de erro', () => {
    it('propaga a mensagem da API num 401', async () => {
      fetch.mockResolvedValue(
        respostaJson({ message: 'Sessão expirada' }, { ok: false, status: 401 }),
      );

      await expect(listarNotificacoes()).rejects.toThrow('Sessão expirada');
    });

    it('usa a mensagem padrão quando o corpo de erro não é JSON (500)', async () => {
      fetch.mockResolvedValue(respostaSemJson({ status: 500 }));

      await expect(listarNotificacoes()).rejects.toThrow(
        'Erro ao comunicar com o servidor.',
      );
    });

    it('propaga erro da API ao marcar como lida', async () => {
      fetch.mockResolvedValue(
        respostaJson({ message: 'Notificação não encontrada' }, {
          ok: false,
          status: 404,
        }),
      );

      await expect(marcarNotificacaoComoLida(99)).rejects.toThrow(
        'Notificação não encontrada',
      );
    });

    it('traduz falha de conexão ao listar', async () => {
      fetch.mockRejectedValue(new TypeError('Failed to fetch'));

      await expect(listarNotificacoes()).rejects.toThrow(
        'Não foi possível conectar ao servidor. Tente novamente.',
      );
    });

    it('traduz falha de conexão ao marcar todas', async () => {
      fetch.mockRejectedValue(new TypeError('Failed to fetch'));

      await expect(marcarTodasNotificacoesComoLidas()).rejects.toThrow(
        'Não foi possível conectar ao servidor. Tente novamente.',
      );
    });
  });
});

describe('caminho mock (VITE_ENABLE_MOCKS=true)', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_ENABLE_MOCKS', 'true');
    comSessao();
  });

  describe('listarNotificacoes', () => {
    it('não toca na rede', async () => {
      await listarNotificacoes();

      expect(fetch).not.toHaveBeenCalled();
    });

    it('devolve as 5 notificações mockadas', async () => {
      const notificacoes = await listarNotificacoes();

      expect(notificacoes).toHaveLength(5);
    });

    it('cada notificação tem o shape que a página Notificacoes consome', async () => {
      const notificacoes = await listarNotificacoes();

      for (const notificacao of notificacoes) {
        expect(notificacao).toEqual({
          id: expect.any(Number),
          titulo: expect.any(String),
          mensagem: expect.any(String),
          detalhes: expect.any(String),
          dataHora: expect.any(String),
          lida: expect.any(Boolean),
          tipo: expect.any(String),
        });
        expect(Number.isNaN(Date.parse(notificacao.dataHora))).toBe(false);
      }
    });

    it('só expõe os campos do shape normalizado', async () => {
      const [notificacao] = await listarNotificacoes();

      expect(Object.keys(notificacao).sort()).toEqual([
        'dataHora',
        'detalhes',
        'id',
        'lida',
        'mensagem',
        'tipo',
        'titulo',
      ]);
    });

    it('os tipos batem com os ícones esperados pela página', async () => {
      const notificacoes = await listarNotificacoes();

      expect(notificacoes.map((item) => item.tipo)).toEqual([
        'confirmada',
        'lembrete',
        'compatível',
        'cancelada',
        'avaliacao',
      ]);
    });

    it('ordena da mais recente para a mais antiga', async () => {
      const notificacoes = await listarNotificacoes();

      expect(notificacoes.map((item) => item.id)).toEqual([1, 2, 3, 4, 5]);

      const tempos = notificacoes.map((item) => Date.parse(item.dataHora));
      const decrescente = [...tempos].sort((a, b) => b - a);
      expect(tempos).toEqual(decrescente);
    });

    it('começa com exatamente 2 notificações não lidas', async () => {
      const notificacoes = await listarNotificacoes();

      expect(contarNaoLidas(notificacoes)).toBe(2);
      expect(
        notificacoes.filter((item) => !item.lida).map((item) => item.id),
      ).toEqual([1, 2]);
    });

    it('devolve cópias: mutar o resultado não contamina a listagem seguinte', async () => {
      const primeira = await listarNotificacoes();
      primeira[0].lida = true;
      primeira[0].titulo = 'Adulterado';

      const segunda = await listarNotificacoes();

      expect(segunda[0].lida).toBe(false);
      expect(segunda[0].titulo).toBe('Vaga confirmada');
    });

    it('devolve um array novo a cada chamada', async () => {
      const primeira = await listarNotificacoes();
      const segunda = await listarNotificacoes();

      expect(segunda).not.toBe(primeira);
      expect(segunda).toEqual(primeira);
    });
  });

  describe('marcarNotificacaoComoLida', () => {
    it('não toca na rede', async () => {
      await marcarNotificacaoComoLida(1);

      expect(fetch).not.toHaveBeenCalled();
    });

    it('devolve { id, lida: true }', async () => {
      await expect(marcarNotificacaoComoLida(1)).resolves.toEqual({
        id: 1,
        lida: true,
      });
    });

    it('marca a notificação e a mudança aparece na listagem seguinte', async () => {
      expect(contarNaoLidas(await listarNotificacoes())).toBe(2);

      await marcarNotificacaoComoLida(1);

      const notificacoes = await listarNotificacoes();
      expect(notificacoes.find((item) => item.id === 1).lida).toBe(true);
      expect(contarNaoLidas(notificacoes)).toBe(1);
    });

    it('não mexe nas outras notificações', async () => {
      await marcarNotificacaoComoLida(1);

      const notificacoes = await listarNotificacoes();
      expect(notificacoes.find((item) => item.id === 2).lida).toBe(false);
    });

    it('é idempotente: marcar duas vezes não muda a contagem', async () => {
      await marcarNotificacaoComoLida(1);
      const depoisDaPrimeira = contarNaoLidas(await listarNotificacoes());

      await expect(marcarNotificacaoComoLida(1)).resolves.toEqual({
        id: 1,
        lida: true,
      });

      expect(contarNaoLidas(await listarNotificacoes())).toBe(depoisDaPrimeira);
    });

    it('marcar uma que já vinha lida mantém tudo igual', async () => {
      await marcarNotificacaoComoLida(3);

      const notificacoes = await listarNotificacoes();
      expect(notificacoes.find((item) => item.id === 3).lida).toBe(true);
      expect(contarNaoLidas(notificacoes)).toBe(2);
    });

    // Correção da refatoração: id inexistente agora LANÇA em vez de fingir sucesso.
    it('id inexistente lança "Notificação não encontrada." e não altera nada', async () => {
      await expect(marcarNotificacaoComoLida(999)).rejects.toThrow(
        'Notificação não encontrada.',
      );

      const notificacoes = await listarNotificacoes();
      expect(notificacoes).toHaveLength(5);
      expect(contarNaoLidas(notificacoes)).toBe(2);
    });

    // Compara com === sem coerção, então '1' não casa com o id 1 e cai no
    // caminho de "não encontrada".
    it('id numérico em string não casa com o id numérico e lança', async () => {
      await expect(marcarNotificacaoComoLida('1')).rejects.toThrow(
        'Notificação não encontrada.',
      );

      const notificacoes = await listarNotificacoes();
      expect(notificacoes.find((item) => item.id === 1).lida).toBe(false);
    });
  });

  describe('marcarTodasNotificacoesComoLidas', () => {
    it('não toca na rede', async () => {
      await marcarTodasNotificacoesComoLidas();

      expect(fetch).not.toHaveBeenCalled();
    });

    it('devolve o total de notificações afetadas', async () => {
      await expect(marcarTodasNotificacoesComoLidas()).resolves.toEqual({
        total: 5,
      });
    });

    it('zera a contagem de não lidas', async () => {
      await marcarTodasNotificacoesComoLidas();

      const notificacoes = await listarNotificacoes();
      expect(contarNaoLidas(notificacoes)).toBe(0);
      expect(notificacoes.every((item) => item.lida === true)).toBe(true);
    });

    it('é idempotente', async () => {
      await marcarTodasNotificacoesComoLidas();
      await expect(marcarTodasNotificacoesComoLidas()).resolves.toEqual({
        total: 5,
      });

      expect(contarNaoLidas(await listarNotificacoes())).toBe(0);
    });

    it('não altera a ordenação nem os demais campos', async () => {
      const antes = await listarNotificacoes();

      await marcarTodasNotificacoesComoLidas();

      const depois = await listarNotificacoes();
      expect(depois.map((item) => item.id)).toEqual(antes.map((item) => item.id));
      expect(depois.map((item) => item.titulo)).toEqual(
        antes.map((item) => item.titulo),
      );
    });
  });

  describe('estado do store mock (constante de módulo)', () => {
    it('o estado vive no módulo e persiste entre chamadas', async () => {
      await marcarNotificacaoComoLida(1);
      await marcarNotificacaoComoLida(2);

      expect(contarNaoLidas(await listarNotificacoes())).toBe(0);
    });

    // Como o store é uma constante do módulo (e não o localStorage), recarregar
    // o módulo devolve tudo ao estado inicial: nada é persistido de verdade.
    it('recarregar o módulo descarta o que foi marcado como lido', async () => {
      await marcarTodasNotificacoesComoLidas();
      expect(contarNaoLidas(await listarNotificacoes())).toBe(0);

      vi.resetModules();
      ({ listarNotificacoes } = await import('./notificationService.js'));

      expect(contarNaoLidas(await listarNotificacoes())).toBe(2);
    });
  });
});
