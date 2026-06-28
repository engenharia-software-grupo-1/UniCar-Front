import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  listarVeiculos,
  obterVeiculo,
  criarVeiculo,
  atualizarVeiculo,
  deletarVeiculo,
} from './vehicleService.js';

const BASE_URL = 'http://localhost:8080';
const TOKEN = 'token-simulado';

function comSessao() {
  localStorage.setItem(
    'unicar.session',
    JSON.stringify({ token: TOKEN, usuario: { nome: 'Fulano' } }),
  );
}

// Resposta fake no formato mínimo que o vehicleService consome (ok, status, json()).
function respostaJson(body, { ok = true, status = 200 } = {}) {
  return { ok, status, json: async () => body };
}

// Resposta não-ok cujo corpo NÃO é JSON parseável (json() rejeita).
function respostaSemJson({ status = 500 } = {}) {
  return {
    ok: false,
    status,
    json: async () => {
      throw new SyntaxError('Unexpected end of JSON input');
    },
  };
}

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('autenticação', () => {
  it('rejeita sem sessão e não chama fetch', async () => {
    await expect(listarVeiculos()).rejects.toThrow('Usuário não autenticado.');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejeita quando a sessão não tem token', async () => {
    localStorage.setItem('unicar.session', JSON.stringify({ usuario: {} }));

    await expect(listarVeiculos()).rejects.toThrow('Usuário não autenticado.');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejeita quando a sessão é um JSON corrompido', async () => {
    localStorage.setItem('unicar.session', '{ não é json');

    await expect(listarVeiculos()).rejects.toThrow('Usuário não autenticado.');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('envia Authorization: Bearer <token> em todas as funções', async () => {
    comSessao();
    fetch.mockResolvedValue(respostaJson([]));

    const chamadas = [
      () => listarVeiculos(),
      () => obterVeiculo(1),
      () => criarVeiculo({ modelo: 'Onix', placa: 'ABC1D23', cor: 'Prata' }),
      () => atualizarVeiculo(1, { modelo: 'Onix', placa: 'ABC1D23', cor: 'Preto' }),
      () => deletarVeiculo(1),
    ];

    for (const chamada of chamadas) {
      fetch.mockClear();
      await chamada();
      const [, options] = fetch.mock.calls[0];
      expect(options.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    }
  });
});

describe('requests', () => {
  beforeEach(() => {
    comSessao();
  });

  it('listarVeiculos faz GET /veiculos e retorna o array', async () => {
    const veiculos = [{ id: 1, modelo: 'Onix', placa: 'ABC1D23', cor: 'Prata' }];
    fetch.mockResolvedValue(respostaJson(veiculos));

    const resultado = await listarVeiculos();

    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/veiculos`);
    expect(options.method).toBe('GET');
    expect(options.body).toBeUndefined();
    expect(options.headers['Content-Type']).toBeUndefined();
    expect(resultado).toEqual(veiculos);
  });

  it('obterVeiculo faz GET /veiculos/{id} e retorna o objeto', async () => {
    const veiculo = { id: 7, modelo: 'HB20', placa: 'XYZ9A87', cor: 'Branco' };
    fetch.mockResolvedValue(respostaJson(veiculo));

    const resultado = await obterVeiculo(7);

    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/veiculos/7`);
    expect(options.method).toBe('GET');
    expect(options.body).toBeUndefined();
    expect(resultado).toEqual(veiculo);
  });

  it('criarVeiculo faz POST com Content-Type e body JSON', async () => {
    const dados = { modelo: 'Onix', placa: 'ABC1D23', cor: 'Prata' };
    fetch.mockResolvedValue(respostaJson({ id: 1, ...dados }, { status: 201 }));

    const resultado = await criarVeiculo(dados);

    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/veiculos`);
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(options.body)).toEqual(dados);
    expect(resultado).toEqual({ id: 1, ...dados });
  });

  it('atualizarVeiculo faz PUT /veiculos/{id} com body JSON', async () => {
    const dados = { modelo: 'Onix Plus', placa: 'ABC1D23', cor: 'Preto' };
    fetch.mockResolvedValue(respostaJson({ id: 1, ...dados }));

    const resultado = await atualizarVeiculo(1, dados);

    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/veiculos/1`);
    expect(options.method).toBe('PUT');
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(options.body)).toEqual(dados);
    expect(resultado).toEqual({ id: 1, ...dados });
  });

  it('deletarVeiculo faz DELETE /veiculos/{id} e não parseia o corpo (204)', async () => {
    const resposta = {
      ok: true,
      status: 204,
      json: vi.fn(),
    };
    fetch.mockResolvedValue(resposta);

    const resultado = await deletarVeiculo(1);

    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/veiculos/1`);
    expect(options.method).toBe('DELETE');
    expect(options.body).toBeUndefined();
    expect(resposta.json).not.toHaveBeenCalled();
    expect(resultado).toBeUndefined();
  });
});

describe('tratamento de erro', () => {
  beforeEach(() => {
    comSessao();
  });

  it('mapeia 400 {message} para a mensagem da API', async () => {
    fetch.mockResolvedValue(
      respostaJson({ message: 'Placa já cadastrada' }, { ok: false, status: 400 }),
    );

    await expect(
      criarVeiculo({ modelo: 'Onix', placa: 'ABC1D23', cor: 'Prata' }),
    ).rejects.toThrow('Placa já cadastrada');
  });

  it('mapeia 403 {message} para a mensagem da API', async () => {
    fetch.mockResolvedValue(
      respostaJson({ message: 'Acesso negado' }, { ok: false, status: 403 }),
    );

    await expect(obterVeiculo(1)).rejects.toThrow('Acesso negado');
  });

  it('mapeia 404 {message} para a mensagem da API', async () => {
    fetch.mockResolvedValue(
      respostaJson(
        { message: 'Veículo não encontrado' },
        { ok: false, status: 404 },
      ),
    );

    await expect(obterVeiculo(99)).rejects.toThrow('Veículo não encontrado');
  });

  it('usa mensagem padrão quando o corpo de erro não é JSON', async () => {
    fetch.mockResolvedValue(respostaSemJson({ status: 500 }));

    await expect(listarVeiculos()).rejects.toThrow(
      'Não foi possível carregar os veículos.',
    );
  });

  it('usa mensagem padrão quando o corpo é JSON mas sem campo message', async () => {
    fetch.mockResolvedValue(respostaJson({ erro: 'algo' }, { ok: false, status: 500 }));

    await expect(listarVeiculos()).rejects.toThrow(
      'Não foi possível carregar os veículos.',
    );
  });

  it('cada função tem sua mensagem padrão de erro sem JSON', async () => {
    const casos = [
      ['Não foi possível carregar o veículo.', () => obterVeiculo(1)],
      [
        'Não foi possível cadastrar o veículo.',
        () => criarVeiculo({ modelo: 'A', placa: 'ABC1D23', cor: 'Preto' }),
      ],
      [
        'Não foi possível atualizar o veículo.',
        () => atualizarVeiculo(1, { modelo: 'A', placa: 'ABC1D23', cor: 'Preto' }),
      ],
      ['Não foi possível remover o veículo.', () => deletarVeiculo(1)],
    ];

    for (const [mensagem, chamada] of casos) {
      fetch.mockReset();
      fetch.mockResolvedValue(respostaSemJson({ status: 400 }));
      await expect(chamada()).rejects.toThrow(mensagem);
    }
  });

  it('traduz falha de conexão no listar', async () => {
    fetch.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(listarVeiculos()).rejects.toThrow(
      'Não foi possível conectar ao servidor. Tente novamente.',
    );
  });

  it('traduz falha de conexão no criar', async () => {
    fetch.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(
      criarVeiculo({ modelo: 'Onix', placa: 'ABC1D23', cor: 'Prata' }),
    ).rejects.toThrow('Não foi possível conectar ao servidor. Tente novamente.');
  });
});
