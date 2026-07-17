import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

beforeEach(async () => {
  localStorage.clear();
  vi.resetModules();
  // O serviço é mock-only: o fetch fica stubado só para provar que ninguém o chama.
  vi.stubGlobal('fetch', vi.fn());

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

describe('contrato offline', () => {
  it('nenhuma função toca na rede', async () => {
    comSessao();

    await listarNotificacoes();
    await marcarNotificacaoComoLida(1);
    await marcarTodasNotificacoesComoLidas();

    expect(fetch).not.toHaveBeenCalled();
  });

  it('não usa localStorage como store: só lê a sessão', async () => {
    comSessao();

    await marcarTodasNotificacoesComoLidas();
    await marcarNotificacaoComoLida(1);
    await listarNotificacoes();

    expect(localStorage.length).toBe(1);
    expect(localStorage.key(0)).toBe('unicar.session');
  });
});

describe('autenticação', () => {
  it('listarNotificacoes rejeita sem sessão', async () => {
    await expect(listarNotificacoes()).rejects.toThrow('Usuário não autenticado.');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('marcarNotificacaoComoLida rejeita sem sessão', async () => {
    await expect(marcarNotificacaoComoLida(1)).rejects.toThrow(
      'Usuário não autenticado.',
    );
  });

  it('marcarTodasNotificacoesComoLidas rejeita sem sessão', async () => {
    await expect(marcarTodasNotificacoesComoLidas()).rejects.toThrow(
      'Usuário não autenticado.',
    );
  });

  it('rejeita quando a sessão não tem token', async () => {
    localStorage.setItem('unicar.session', JSON.stringify({ usuario: {} }));

    await expect(listarNotificacoes()).rejects.toThrow('Usuário não autenticado.');
  });

  it('rejeita quando a sessão é um JSON corrompido', async () => {
    localStorage.setItem('unicar.session', '{ não é json');

    await expect(listarNotificacoes()).rejects.toThrow('Usuário não autenticado.');
  });

  // A checagem de sessão vem antes da validação do id.
  it('a sessão é checada antes do id inválido', async () => {
    await expect(marcarNotificacaoComoLida(undefined)).rejects.toThrow(
      'Usuário não autenticado.',
    );
  });
});

describe('listarNotificacoes', () => {
  beforeEach(() => {
    comSessao();
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

  // O serviço tem um `if (shouldUseLocalDataMocks())` cujos dois ramos devolvem
  // exatamente a mesma coisa: com mocks ligados ou desligados, o resultado é
  // idêntico, porque não existe caminho de rede. Ver relatório.
  it('devolve o mesmo resultado com VITE_ENABLE_MOCKS ligado ou desligado', async () => {
    // O relógio precisa estar congelado: o MOCK_NOTIFICACOES calcula `dataHora`
    // com Date.now() no momento do import, então os dois imports abaixo geram
    // timestamps diferentes se caírem em milissegundos diferentes. Sem isto o
    // teste passa isolado e falha sob a carga da suíte completa.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-17T12:00:00.000Z'));

    try {
      vi.stubEnv('VITE_ENABLE_MOCKS', 'false');
      vi.resetModules();
      const semMocks = await (
        await import('./notificationService.js')
      ).listarNotificacoes();

      vi.stubEnv('VITE_ENABLE_MOCKS', 'true');
      vi.resetModules();
      const comMocks = await (
        await import('./notificationService.js')
      ).listarNotificacoes();

      expect(comMocks).toEqual(semMocks);
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('marcarNotificacaoComoLida', () => {
  beforeEach(() => {
    comSessao();
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

  // Comportamento ATUAL: o id inexistente não acha nada e mesmo assim responde
  // { lida: true }, como se tivesse marcado. Ver relatório.
  it('id inexistente responde sucesso sem alterar nada', async () => {
    await expect(marcarNotificacaoComoLida(999)).resolves.toEqual({
      id: 999,
      lida: true,
    });

    const notificacoes = await listarNotificacoes();
    expect(notificacoes).toHaveLength(5);
    expect(contarNaoLidas(notificacoes)).toBe(2);
  });

  // Comportamento ATUAL: compara com === e sem coerção, então '1' não acha o id 1.
  it('id numérico em string não casa com o id numérico', async () => {
    await marcarNotificacaoComoLida('1');

    const notificacoes = await listarNotificacoes();
    expect(notificacoes.find((item) => item.id === 1).lida).toBe(false);
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
  });

  it('rejeita quando chamada sem argumento', async () => {
    await expect(marcarNotificacaoComoLida()).rejects.toThrow(
      'Notificação inválida.',
    );
  });
});

describe('marcarTodasNotificacoesComoLidas', () => {
  beforeEach(() => {
    comSessao();
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

describe('persistência do estado de leitura', () => {
  it('o estado vive no módulo e persiste entre chamadas', async () => {
    comSessao();

    await marcarNotificacaoComoLida(1);
    await marcarNotificacaoComoLida(2);

    expect(contarNaoLidas(await listarNotificacoes())).toBe(0);
  });

  // Como o store é uma constante do módulo (e não o localStorage), recarregar a
  // aplicação devolve tudo ao estado inicial: nada é persistido de verdade.
  it('recarregar o módulo descarta o que foi marcado como lido', async () => {
    comSessao();
    await marcarTodasNotificacoesComoLidas();
    expect(contarNaoLidas(await listarNotificacoes())).toBe(0);

    vi.resetModules();
    ({ listarNotificacoes } = await import('./notificationService.js'));

    expect(contarNaoLidas(await listarNotificacoes())).toBe(2);
  });

  it('o estado é compartilhado entre sessões de usuários diferentes', async () => {
    comSessao();
    await marcarTodasNotificacoesComoLidas();

    localStorage.setItem(
      'unicar.session',
      JSON.stringify({ token: 'outro-token', usuario: { nome: 'Outra' } }),
    );

    expect(contarNaoLidas(await listarNotificacoes())).toBe(0);
  });
});
