import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const BASE_URL = 'http://localhost:8080';
const TOKEN = 'token-simulado';

function respostaJson(body) {
  return {
    ok: true,
    status: 200,
    headers: {
      get: (chave) =>
        chave.toLowerCase() === 'content-type' ? 'application/json' : null,
    },
    json: async () => body,
  };
}

// Formato do contrato US10: a carona vem com origem/destino em texto e SEM
// dataHoraSaida.
const ENVIADAS = [
  {
    id: 50,
    carona: { id: 10, origem: 'Bodocongó', destino: 'UFCG' },
    status: 'ACEITA',
    quantidadePassageiros: 2,
    valorContribuicao: 8,
  },
  {
    id: 51,
    carona: { id: 11, origem: 'Catolé', destino: 'UFCG' },
    status: 'PENDENTE',
    quantidadePassageiros: 1,
    valorContribuicao: 6,
  },
  {
    id: 52,
    carona: { id: 12, origem: 'Centenário', destino: 'UFCG' },
    status: 'RECUSADA',
    quantidadePassageiros: 1,
    valorContribuicao: 4,
  },
];

async function importarService() {
  vi.resetModules();
  return import('./reservaService.js');
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(
    'unicar.session',
    JSON.stringify({ token: TOKEN, usuario: { nome: 'Passageira' } }),
  );
  vi.stubGlobal('fetch', vi.fn());
  vi.stubEnv('VITE_API_URL', BASE_URL);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('listarReservasEnviadas', () => {
  it('busca /reservas/enviadas autenticado e normaliza a resposta', async () => {
    fetch.mockResolvedValue(respostaJson(ENVIADAS));

    const { listarReservasEnviadas } = await importarService();
    const reservas = await listarReservasEnviadas();

    const [url, opcoes] = fetch.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/reservas/enviadas`);
    expect(opcoes.headers.Authorization).toBe(`Bearer ${TOKEN}`);

    expect(reservas[0]).toEqual({
      id: 50,
      status: 'ACEITA',
      quantidadePassageiros: 2,
      valorContribuicao: 8,
      carona: { id: 10, origem: 'Bodocongó', destino: 'UFCG' },
    });
  });

  it('aceita origem/destino como objeto, como no resto da API', async () => {
    fetch.mockResolvedValue(
      respostaJson([
        {
          id: 50,
          carona: {
            id: 10,
            origem: { descricao: 'Bodocongó' },
            destino: { descricao: 'UFCG' },
          },
          status: 'ACEITA',
        },
      ]),
    );

    const { listarReservasEnviadas } = await importarService();
    const [reserva] = await listarReservasEnviadas();

    expect(reserva.carona.origem).toBe('Bodocongó');
    expect(reserva.carona.destino).toBe('UFCG');
  });
});

describe('listarReservasAceitas', () => {
  it('mantém só as ACEITAS — pendente e recusada não põem ninguém no carro', async () => {
    fetch.mockResolvedValue(respostaJson(ENVIADAS));

    const { listarReservasAceitas } = await importarService();
    const aceitas = await listarReservasAceitas();

    expect(aceitas.map((reserva) => reserva.id)).toEqual([50]);
  });
});
