import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const BASE_URL = 'http://localhost:8080';
const MOCK_KEY = 'unicar.mock.interesses';

let registrarInteresse;
let listarInteresses;
let removerInteresse;

// O api.js lê response.headers.get('content-type') antes do json().
function respostaJson(body, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    headers: { get: () => 'application/json' },
    json: async () => body,
  };
}

function respostaSemCorpo({ status = 204 } = {}) {
  return {
    ok: true,
    status,
    headers: { get: () => null },
    json: async () => {
      throw new Error('sem corpo');
    },
  };
}

beforeEach(async () => {
  localStorage.clear();
  vi.resetModules();
  vi.stubGlobal('fetch', vi.fn());
  vi.stubEnv('VITE_API_URL', BASE_URL);
  vi.stubEnv('VITE_ENABLE_MOCKS', 'false');

  ({ registrarInteresse, listarInteresses, removerInteresse } = await import(
    './interesseService.js'
  ));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('registrarInteresse — caminho de rede', () => {
  it('faz POST /interesses com origem e destino no corpo', async () => {
    fetch.mockResolvedValue(respostaJson({ id: 7, origem: 'Centro', destino: 'UFCG' }));

    const resultado = await registrarInteresse({ origem: 'Centro', destino: 'UFCG' });

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/interesses`);
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({ origem: 'Centro', destino: 'UFCG' });
    expect(resultado).toEqual({ id: 7, origem: 'Centro', destino: 'UFCG' });
  });

  it('propaga o erro da API', async () => {
    fetch.mockResolvedValue(
      respostaJson({ message: 'Interesse duplicado.' }, { ok: false, status: 409 }),
    );

    await expect(
      registrarInteresse({ origem: 'Centro', destino: 'UFCG' }),
    ).rejects.toThrow('Interesse duplicado.');
  });

  it('traduz falha de conexão', async () => {
    fetch.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(
      registrarInteresse({ origem: 'Centro', destino: 'UFCG' }),
    ).rejects.toThrow('Não foi possível conectar ao servidor. Tente novamente.');
  });
});

describe('listarInteresses — caminho de rede', () => {
  it('faz GET /interesses e devolve o array', async () => {
    const lista = [{ id: 1 }, { id: 2 }];
    fetch.mockResolvedValue(respostaJson(lista));

    const resultado = await listarInteresses();

    expect(fetch.mock.calls[0][0]).toBe(`${BASE_URL}/interesses`);
    expect(fetch.mock.calls[0][1]?.method ?? 'GET').toBe('GET');
    expect(resultado).toEqual(lista);
  });

  it('desembrulha o envelope paginado (.content)', async () => {
    fetch.mockResolvedValue(respostaJson({ content: [{ id: 3 }] }));

    expect(await listarInteresses()).toEqual([{ id: 3 }]);
  });

  it('desembrulha .items', async () => {
    fetch.mockResolvedValue(respostaJson({ items: [{ id: 4 }] }));

    expect(await listarInteresses()).toEqual([{ id: 4 }]);
  });

  it('devolve [] quando a resposta não tem lista reconhecível', async () => {
    fetch.mockResolvedValue(respostaJson({ total: 0 }));

    expect(await listarInteresses()).toEqual([]);
  });

  it('propaga o erro da API', async () => {
    fetch.mockResolvedValue(respostaJson(null, { ok: false, status: 500 }));

    await expect(listarInteresses()).rejects.toThrow();
  });
});

describe('removerInteresse — caminho de rede', () => {
  it('faz DELETE /interesses/{id}', async () => {
    fetch.mockResolvedValue(respostaSemCorpo());

    await removerInteresse(42);

    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/interesses/42`);
    expect(options.method).toBe('DELETE');
  });

  it('propaga o erro da API', async () => {
    fetch.mockResolvedValue(
      respostaJson({ message: 'Não encontrado.' }, { ok: false, status: 404 }),
    );

    await expect(removerInteresse(42)).rejects.toThrow('Não encontrado.');
  });
});

describe('modo mock local (VITE_ENABLE_MOCKS=true)', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_ENABLE_MOCKS', 'true');
  });

  it('registrarInteresse grava no localStorage sem tocar na rede', async () => {
    const interesse = await registrarInteresse({ origem: 'Centro', destino: 'UFCG' });

    expect(fetch).not.toHaveBeenCalled();
    expect(interesse).toMatchObject({ origem: 'Centro', destino: 'UFCG' });
    expect(interesse.id).toEqual(expect.anything());
    expect(interesse.dataCadastro).toEqual(expect.any(String));

    const salvos = JSON.parse(localStorage.getItem(MOCK_KEY));
    expect(salvos).toHaveLength(1);
    expect(salvos[0]).toMatchObject({ origem: 'Centro', destino: 'UFCG' });
  });

  it('listarInteresses devolve o que foi registrado, sem rede', async () => {
    await registrarInteresse({ origem: 'A', destino: 'B' });
    await registrarInteresse({ origem: 'C', destino: 'D' });

    const lista = await listarInteresses();

    expect(fetch).not.toHaveBeenCalled();
    expect(lista).toHaveLength(2);
    expect(lista.map((i) => i.origem)).toEqual(['A', 'C']);
  });

  it('listarInteresses devolve [] quando não há nada salvo', async () => {
    expect(await listarInteresses()).toEqual([]);
  });

  it('listarInteresses tolera store corrompido', async () => {
    localStorage.setItem(MOCK_KEY, '{ não é json');

    expect(await listarInteresses()).toEqual([]);
  });

  it('removerInteresse tira o item pelo id (comparação por string) e persiste', async () => {
    // O service usa Date.now() como id; dois cadastros no mesmo milissegundo
    // colidiriam (fragilidade real do modo mock). Forçamos ids distintos e
    // determinísticos para poder isolar a remoção de um item específico.
    let proximoId = 1000;
    vi.spyOn(Date, 'now').mockImplementation(() => proximoId++);

    const a = await registrarInteresse({ origem: 'A', destino: 'B' });
    const b = await registrarInteresse({ origem: 'C', destino: 'D' });
    expect(a.id).not.toBe(b.id);

    // id numérico no store x string na chamada: o service compara como string
    await removerInteresse(String(a.id));

    const lista = await listarInteresses();
    expect(fetch).not.toHaveBeenCalled();
    expect(lista).toHaveLength(1);
    expect(lista[0].origem).toBe('C');
  });

  it('removerInteresse é inócuo para id inexistente', async () => {
    await registrarInteresse({ origem: 'A', destino: 'B' });

    await removerInteresse(999999);

    expect(await listarInteresses()).toHaveLength(1);
  });
});
