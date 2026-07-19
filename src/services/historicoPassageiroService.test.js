import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const BASE_URL = 'http://localhost:8080';
const TOKEN = 'token-simulado';

let listarHistoricoComoPassageiro;

// Resposta fake no formato que o apiRequest consome: ele checa o content-type
// antes de tentar o json(), então o header é obrigatório aqui.
function respostaJson(body, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    headers: { get: () => 'application/json' },
    json: async () => body,
  };
}

function comSessao() {
  localStorage.setItem(
    'unicar.session',
    JSON.stringify({ token: TOKEN, usuario: { id: 1, nome: 'Fulano' } }),
  );
}

beforeEach(async () => {
  localStorage.clear();
  vi.resetModules();
  vi.stubGlobal('fetch', vi.fn());
  vi.stubEnv('VITE_API_URL', BASE_URL);
  vi.stubEnv('VITE_ENABLE_MOCKS', 'false');

  ({ listarHistoricoComoPassageiro } = await import('./historicoPassageiroService.js'));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('listarHistoricoComoPassageiro — chamada à API', () => {
  it('faz GET /reservas/enviadas, disponível no backend atual', async () => {
    comSessao();
    fetch.mockResolvedValue(respostaJson([{ id: 1 }]));

    await listarHistoricoComoPassageiro();

    expect(fetch).toHaveBeenCalledTimes(1);

    const [url, options] = fetch.mock.calls[0];

    expect(url).toBe(`${BASE_URL}/reservas/enviadas`);
    // O apiRequest não passa `method`, então o fetch usa o GET padrão.
    expect(options.method).toBeUndefined();
    expect(options.body).toBeUndefined();
  });

  it('envia Authorization: Bearer <token> quando há sessão', async () => {
    comSessao();
    fetch.mockResolvedValue(respostaJson([{ id: 1 }]));

    await listarHistoricoComoPassageiro();

    expect(fetch.mock.calls[0][1].headers.Authorization).toBe(`Bearer ${TOKEN}`);
  });

  it('chama a API mesmo sem sessão, só que sem Authorization', async () => {
    fetch.mockResolvedValue(respostaJson([{ id: 1 }]));

    await listarHistoricoComoPassageiro();

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('não envia Authorization quando a sessão é um JSON corrompido', async () => {
    localStorage.setItem('unicar.session', '{ não é json');
    fetch.mockResolvedValue(respostaJson([{ id: 1 }]));

    await listarHistoricoComoPassageiro();

    expect(fetch.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('propaga o erro quando a API responde 500', async () => {
    comSessao();
    fetch.mockResolvedValue(
      respostaJson({ message: 'Erro interno' }, { ok: false, status: 500 }),
    );

    await expect(listarHistoricoComoPassageiro()).rejects.toThrow('Erro interno');
  });

  it('propaga o erro quando a conexão falha', async () => {
    comSessao();
    fetch.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(listarHistoricoComoPassageiro()).rejects.toThrow(
      'Não foi possível conectar ao servidor. Tente novamente.',
    );
  });
});

describe('listarHistoricoComoPassageiro — extração da lista', () => {
  it.each([
    ['array puro', (lista) => lista],
    ['envelope content (Spring Page)', (lista) => ({ content: lista })],
    ['envelope items', (lista) => ({ items: lista })],
    ['envelope reservas', (lista) => ({ reservas: lista })],
  ])('lê a lista de um %s', async (_formato, envelopar) => {
    comSessao();
    fetch.mockResolvedValue(respostaJson(envelopar([{ id: 77 }])));

    const reservas = await listarHistoricoComoPassageiro();

    expect(reservas).toHaveLength(1);
    expect(reservas[0].id).toBe(77);
  });

  it('devolve lista vazia quando o backend não manda reservas', async () => {
    comSessao();
    fetch.mockResolvedValue(respostaJson([]));

    await expect(listarHistoricoComoPassageiro()).resolves.toEqual([]);
  });

  it('devolve lista vazia quando a resposta é null', async () => {
    comSessao();
    fetch.mockResolvedValue(respostaJson(null));

    await expect(listarHistoricoComoPassageiro()).resolves.toEqual([]);
  });

  it('devolve lista vazia quando a resposta é um objeto sem lista reconhecível', async () => {
    comSessao();
    fetch.mockResolvedValue(respostaJson({ total: 0 }));

    await expect(listarHistoricoComoPassageiro()).resolves.toEqual([]);
  });
});

describe('listarHistoricoComoPassageiro — normalização de campos', () => {
  async function normalizar(reserva) {
    comSessao();
    fetch.mockResolvedValue(respostaJson([reserva]));

    const [resultado] = await listarHistoricoComoPassageiro();

    return resultado;
  }

  it('normaliza uma reserva completa do backend', async () => {
    const reserva = await normalizar({
      id: 42,
      status: 'CONFIRMADA',
      dataHora: '2026-06-01T07:00:00',
      vagasReservadas: 2,
      totalVagas: 4,
      origem: { descricao: 'Bodocongó' },
      destino: 'UFCG',
      pontoReferencia: 'Bloco CN',
      motorista: { id: 9, nome: 'Marina Souza', avaliacao: 4.9, fotoPerfil: 'foto.png' },
    });

    expect(reserva).toEqual({
      id: 42,
      status: 'CONFIRMADA',
      dataHora: '2026-06-01T07:00:00',
      vagasReservadas: 2,
      totalVagas: 4,
      origem: 'Bodocongó',
      destino: 'UFCG',
      pontoReferencia: 'Bloco CN',
      motorista: {
        id: 9,
        nome: 'Marina Souza',
        avaliacao: 4.9,
        fotoPerfil: 'foto.png',
      },
    });
  });

  it('assume status PENDENTE quando o backend não manda status', async () => {
    expect((await normalizar({ id: 1 })).status).toBe('PENDENTE');
  });

  it('cai para a data da carona aninhada quando não há dataHora direta', async () => {
    expect(
      (await normalizar({ id: 1, carona: { dataHoraSaida: '2026-06-01T07:00:00' } }))
        .dataHora,
    ).toBe('2026-06-01T07:00:00');
  });

  it('assume 1 vaga reservada e total nulo quando nada vem', async () => {
    const reserva = await normalizar({ id: 1 });

    expect(reserva.vagasReservadas).toBe(1);
    expect(reserva.totalVagas).toBeNull();
  });

  it('extrai origem/destino da carona aninhada quando não vêm na reserva', async () => {
    const reserva = await normalizar({
      id: 1,
      carona: { origem: { descricao: 'Prata' }, destino: 'UFCG' },
    });

    expect(reserva.origem).toBe('Prata');
    expect(reserva.destino).toBe('UFCG');
  });

  it('resolve o nome do motorista a partir de nomeCompleto', async () => {
    expect(
      (await normalizar({ id: 1, motorista: { nomeCompleto: 'Marina Souza' } }))
        .motorista.nome,
    ).toBe('Marina Souza');
  });

  it('usa "Motorista" como nome padrão quando não vem nada', async () => {
    expect((await normalizar({ id: 1 })).motorista.nome).toBe('Motorista');
  });

  it('não vaza campos desconhecidos do backend', async () => {
    const reserva = await normalizar({ id: 1, campoInesperado: 'xpto' });

    expect(reserva).not.toHaveProperty('campoInesperado');
    expect(Object.keys(reserva).sort()).toEqual([
      'dataHora',
      'destino',
      'id',
      'motorista',
      'origem',
      'pontoReferencia',
      'status',
      'totalVagas',
      'vagasReservadas',
    ]);
    expect(Object.keys(reserva.motorista).sort()).toEqual([
      'avaliacao',
      'fotoPerfil',
      'id',
      'nome',
    ]);
  });
});
