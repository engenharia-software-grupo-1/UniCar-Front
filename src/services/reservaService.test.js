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
      dataViagem: '',
      carona: {
        id: 10,
        origem: 'Bodocongó',
        destino: 'UFCG',
        origemCoordenadas: null,
        destinoCoordenadas: null,
      },
    });
  });

  it('usa dataCarona para preencher a data exibida no card da reserva', async () => {
    fetch.mockResolvedValue(respostaJson([{ ...ENVIADAS[0], dataCarona: '2026-07-20T07:30:00' }]));

    const { listarReservasEnviadas } = await importarService();
    const [reserva] = await listarReservasEnviadas();

    expect(reserva.dataViagem).toBe('2026-07-20T07:30:00');
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

describe('listarReservasPendentesDaCarona', () => {
  it('busca as recebidas e mantém apenas as pendentes da carona informada', async () => {
    fetch.mockImplementation((url) => {
      if (url.endsWith('/reservas/recebidas')) {
        return Promise.resolve(respostaJson([
          { id: 70, status: 'PENDENTE', usuario: { id: 5, nome: 'Maria' } },
          { id: 71, status: 'PENDENTE', usuario: { id: 6, nome: 'José' } },
          { id: 72, status: 'ACEITA', usuario: { id: 7, nome: 'Ana' } },
        ]));
      }
      if (url.endsWith('/reservas/70')) {
        return Promise.resolve(respostaJson({ carona: { id: 10 } }));
      }
      if (url.endsWith('/reservas/71')) {
        return Promise.resolve(respostaJson({ carona: { id: 11 } }));
      }
      throw new Error(`URL inesperada: ${url}`);
    });

    const { listarReservasPendentesDaCarona } = await importarService();
    const reservas = await listarReservasPendentesDaCarona(10);

    expect(reservas).toEqual([
      expect.objectContaining({ id: 70, status: 'PENDENTE', caronaId: 10 }),
    ]);
    expect(fetch.mock.calls.map(([url]) => url)).not.toContain(`${BASE_URL}/reservas/72`);
  });
});

describe('obterDetalhesReserva', () => {
  it('preenche os detalhes da reserva com os dados completos da carona', async () => {
    fetch.mockImplementation((url) => {
      if (url.endsWith('/reservas/42')) {
        return Promise.resolve(respostaJson({
          id: 42,
          status: 'PENDENTE',
          quantidadePassageiros: 1,
          carona: { id: 10, origem: 'Bodocongó', destino: 'UFCG' },
        }));
      }
      if (url.endsWith('/caronas/10')) {
        return Promise.resolve(respostaJson({
          id: 10,
          origem: { descricao: 'Prata', latitude: -7.2349, longitude: -35.8692 },
          destino: { descricao: 'UFCG — Campus Sede', latitude: -7.2145, longitude: -35.9087 },
          dataCarona: '2026-07-20T07:30:00',
          valorContribuicao: 6,
          quantidadeVagas: 4,
          paradas: ['Shopping Partage'],
          motorista: { id: 3, nome: 'João Silva' },
        }));
      }
      throw new Error(`URL inesperada: ${url}`);
    });

    const { obterDetalhesReserva } = await importarService();
    const reserva = await obterDetalhesReserva(42);

    expect(reserva.motorista).toEqual({
      id: 3,
      nome: 'João Silva',
      fotoPerfil: '',
      avaliacao: null,
    });
    expect(reserva.carona).toMatchObject({
      origem: 'Prata',
      destino: 'UFCG — Campus Sede',
      origemCoordenadas: { latitude: -7.2349, longitude: -35.8692 },
      destinoCoordenadas: { latitude: -7.2145, longitude: -35.9087 },
      dataViagem: '2026-07-20T07:30:00',
      valor: 6,
      vagasTotais: 4,
      paradas: ['Shopping Partage'],
    });
  });
});
