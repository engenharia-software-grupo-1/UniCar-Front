import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const BASE_URL = 'http://localhost:8080';
const TOKEN = 'token-simulado';

function comSessao() {
  localStorage.setItem(
    'unicar.session',
    JSON.stringify({ token: TOKEN, usuario: { nome: 'Motorista' } }),
  );
}

function respostaJson(body, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    headers: {
      get: (chave) =>
        chave.toLowerCase() === 'content-type' ? 'application/json' : null,
    },
    json: async () => body,
  };
}

const DETALHE_10 = {
  id: 10,
  origem: { descricao: 'Bodocongó' },
  destino: { descricao: 'UFCG' },
  pontoEncontro: 'Campus Sede',
  dataHoraSaida: '2026-06-25T13:30:00',
  quantidadeVagas: 3,
  vagasDisponiveis: 1,
  valorContribuicao: 5,
  status: 'CRIADA',
  motorista: { id: 1, nome: 'João Silva', avaliacao: 4.8 },
  veiculo: { id: 1, modelo: 'Onix', cor: 'Prata' },
};

async function importarService() {
  vi.resetModules();
  return import('./caronaService.js');
}

beforeEach(() => {
  localStorage.clear();
  comSessao();
  vi.stubGlobal('fetch', vi.fn());
  vi.stubEnv('VITE_API_URL', BASE_URL);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('listarMinhasCaronas', () => {
  it('busca /caronas/minhas e enriquece cada item com /caronas/{id}', async () => {
    fetch.mockImplementation((url) => {
      if (url.endsWith('/caronas/minhas')) {
        return Promise.resolve(
          respostaJson([
            {
              id: 10,
              origem: { descricao: 'Bodocongó' },
              destino: { descricao: 'UFCG' },
              status: 'CRIADA',
              dataHoraSaida: '2026-06-25T13:30:00',
            },
          ]),
        );
      }

      if (url.endsWith('/caronas/10')) {
        return Promise.resolve(respostaJson(DETALHE_10));
      }

      return Promise.reject(new Error(`URL inesperada: ${url}`));
    });

    const { listarMinhasCaronas } = await importarService();
    const resultado = await listarMinhasCaronas();

    const urlsChamadas = fetch.mock.calls.map(([url]) => url);
    expect(urlsChamadas).toContain(`${BASE_URL}/caronas/minhas`);
    expect(urlsChamadas).toContain(`${BASE_URL}/caronas/10`);

    const [, opcoesMinhas] = fetch.mock.calls[0];
    expect(opcoesMinhas.headers.Authorization).toBe(`Bearer ${TOKEN}`);

    expect(resultado).toEqual([
      {
        id: 10,
        status: 'CRIADA',
        dataHoraSaida: '2026-06-25T13:30:00',
        origem: 'Bodocongó',
        destino: 'UFCG',
        pontoEncontro: 'Campus Sede',
        valorContribuicao: 5,
        quantidadeVagas: 3,
        vagasDisponiveis: 1,
        passageirosConfirmados: 2,
        motorista: {
          id: 1,
          nome: 'João Silva',
          avaliacao: 4.8,
        },
        veiculo: {
          id: 1,
          modelo: 'Onix',
          cor: 'Prata',
          placa: '',
        },
      },
    ]);
  });

  it('usa os dados da lista quando o detalhe falha', async () => {
    fetch.mockImplementation((url) => {
      if (url.endsWith('/caronas/minhas')) {
        return Promise.resolve(
          respostaJson([
            {
              id: 20,
              origem: { descricao: 'Centro' },
              destino: { descricao: 'UFCG' },
              status: 'CRIADA',
              dataHoraSaida: '2026-06-26T08:00:00',
            },
          ]),
        );
      }

      return Promise.resolve(
        respostaJson({ message: 'Carona não encontrada' }, { ok: false, status: 404 }),
      );
    });

    const { listarMinhasCaronas } = await importarService();
    const resultado = await listarMinhasCaronas();

    expect(resultado).toEqual([
      {
        id: 20,
        status: 'CRIADA',
        dataHoraSaida: '2026-06-26T08:00:00',
        origem: 'Centro',
        destino: 'UFCG',
        pontoEncontro: '',
        valorContribuicao: null,
        quantidadeVagas: null,
        vagasDisponiveis: null,
        passageirosConfirmados: null,
        motorista: {
          id: '',
          nome: '',
          avaliacao: '',
        },
        veiculo: {
          id: '',
          modelo: '',
          cor: '',
          placa: '',
        },
      },
    ]);
  });

  it('propaga erro quando /caronas/minhas falha', async () => {
    fetch.mockResolvedValue(
      respostaJson({ message: 'Acesso negado' }, { ok: false, status: 403 }),
    );

    const { listarMinhasCaronas } = await importarService();

    await expect(listarMinhasCaronas()).rejects.toThrow('Acesso negado');
  });
});

describe('mock local (dev / VITE_ENABLE_MOCKS)', () => {
  it('lista caronas simuladas sem chamar fetch', async () => {
    vi.stubEnv('VITE_ENABLE_MOCKS', 'true');

    const { listarMinhasCaronas } = await importarService();
    const resultado = await listarMinhasCaronas();

    expect(fetch).not.toHaveBeenCalled();
    expect(resultado).toHaveLength(2);
    expect(resultado[0]).toMatchObject({
      origem: 'Bodocongó',
      destino: 'UFCG',
      pontoEncontro: 'Campus Sede',
      quantidadeVagas: 3,
      valorContribuicao: 5,
      passageirosConfirmados: 2,
      veiculo: {
        modelo: 'Onix',
        cor: 'Prata',
      },
      motorista: {
        nome: 'Estudante UniCar',
      },
    });
  });

  it('obterCarona simulado devolve o detalhe e erra para id inexistente', async () => {
    vi.stubEnv('VITE_ENABLE_MOCKS', 'true');

    const { obterCarona } = await importarService();

    await expect(obterCarona(10)).resolves.toMatchObject({ pontoEncontro: 'Campus Sede' });
    await expect(obterCarona(999)).rejects.toThrow('Carona não encontrada.');
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('cancelarCarona', () => {
  it('faz PATCH /caronas/{id}/cancelar com o token e sem corpo', async () => {
    fetch.mockResolvedValue(respostaJson({ id: 10, status: 'CANCELADA' }));

    const { cancelarCarona } = await importarService();
    const resultado = await cancelarCarona(10);

    const [url, opcoes] = fetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/caronas/10/cancelar`);
    expect(opcoes.method).toBe('PATCH');
    expect(opcoes.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(opcoes.body).toBeUndefined();
    expect(resultado).toEqual({ id: 10, status: 'CANCELADA' });
  });

  it('propaga erro quando o backend recusa o cancelamento', async () => {
    fetch.mockResolvedValue(
      respostaJson({ message: 'Acesso negado' }, { ok: false, status: 403 }),
    );

    const { cancelarCarona } = await importarService();

    await expect(cancelarCarona(10)).rejects.toThrow('Acesso negado');
  });

  it('no modo mock devolve status CANCELADA sem chamar fetch', async () => {
    vi.stubEnv('VITE_ENABLE_MOCKS', 'true');

    const { cancelarCarona } = await importarService();
    const resultado = await cancelarCarona(10);

    expect(fetch).not.toHaveBeenCalled();
    expect(resultado).toEqual({ id: 10, status: 'CANCELADA' });
  });
});

describe('obterCarona', () => {
  it('faz GET /caronas/{id} e normaliza o detalhe', async () => {
    fetch.mockResolvedValue(respostaJson(DETALHE_10));

    const { obterCarona } = await importarService();
    const carona = await obterCarona(10);

    const [url, opcoes] = fetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/caronas/10`);
    expect(opcoes.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(carona).toEqual({
      id: 10,
      status: 'CRIADA',
      dataHoraSaida: '2026-06-25T13:30:00',
      origem: 'Bodocongó',
      destino: 'UFCG',
      pontoEncontro: 'Campus Sede',
      valorContribuicao: 5,
      quantidadeVagas: 3,
      vagasDisponiveis: 1,
      passageirosConfirmados: 2,
      motorista: {
        id: 1,
        nome: 'João Silva',
        avaliacao: 4.8,
      },
      veiculo: {
        id: 1,
        modelo: 'Onix',
        cor: 'Prata',
        placa: '',
      },
    });
  });
});
