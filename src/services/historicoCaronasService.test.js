import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const BASE_URL = 'http://localhost:8080';
const TOKEN = 'token-simulado';

let listarHistoricoComoMotorista;

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

// Resposta não-ok e sem content-type JSON: o apiRequest nem tenta parsear.
function respostaSemJson({ status = 500 } = {}) {
  return {
    ok: false,
    status,
    headers: { get: () => 'text/html' },
    json: async () => {
      throw new SyntaxError('Unexpected end of JSON input');
    },
  };
}

function comSessao() {
  localStorage.setItem(
    'unicar.session',
    JSON.stringify({ token: TOKEN, usuario: { id: 1, nome: 'Fulano' } }),
  );
}

// Ids do HISTORICO_MOTORISTA_MOCK embutido no serviço. Servem de sentinela:
// se o resultado tem esses ids, o fallback mockado entrou em ação.
const IDS_DO_MOCK = [101, 102, 103];

function ehDadoMockado(resultado) {
  return resultado.map((carona) => carona.id).join(',') === IDS_DO_MOCK.join(',');
}

beforeEach(async () => {
  localStorage.clear();
  vi.resetModules();
  vi.stubGlobal('fetch', vi.fn());
  vi.stubEnv('VITE_API_URL', BASE_URL);
  vi.stubEnv('VITE_ENABLE_MOCKS', 'false');

  ({ listarHistoricoComoMotorista } = await import('./historicoCaronasService.js'));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('listarHistoricoComoMotorista — chamada à API', () => {
  it('faz GET /historico/motorista', async () => {
    comSessao();
    fetch.mockResolvedValue(respostaJson([{ id: 1 }]));

    await listarHistoricoComoMotorista();

    expect(fetch).toHaveBeenCalledTimes(1);

    const [url, options] = fetch.mock.calls[0];

    expect(url).toBe(`${BASE_URL}/historico/motorista?size=100`);
    // O apiRequest não passa `method`, então o fetch usa o GET padrão.
    expect(options.method).toBeUndefined();
    expect(options.body).toBeUndefined();
  });

  it('envia Authorization: Bearer <token> quando há sessão', async () => {
    comSessao();
    fetch.mockResolvedValue(respostaJson([{ id: 1 }]));

    await listarHistoricoComoMotorista();

    expect(fetch.mock.calls[0][1].headers.Authorization).toBe(`Bearer ${TOKEN}`);
  });

  it('chama a API mesmo sem sessão, só que sem Authorization', async () => {
    fetch.mockResolvedValue(respostaJson([{ id: 1 }]));

    await listarHistoricoComoMotorista();

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('não envia Authorization quando a sessão não tem token', async () => {
    localStorage.setItem('unicar.session', JSON.stringify({ usuario: {} }));
    fetch.mockResolvedValue(respostaJson([{ id: 1 }]));

    await listarHistoricoComoMotorista();

    expect(fetch.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('não envia Authorization quando a sessão é um JSON corrompido', async () => {
    localStorage.setItem('unicar.session', '{ não é json');
    fetch.mockResolvedValue(respostaJson([{ id: 1 }]));

    await listarHistoricoComoMotorista();

    expect(fetch.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('devolve os dados do backend quando a lista vem preenchida', async () => {
    comSessao();
    fetch.mockResolvedValue(
      respostaJson([
        {
          id: 55,
          status: 'FINALIZADA',
          dataHoraSaida: '2026-06-01T07:00:00',
          origem: 'Bodocongó',
          destino: 'UFCG',
          pontoEncontro: 'Bloco CN',
          vagasOcupadas: 2,
          vagasTotal: 4,
          passageiros: [{ id: 9, nome: 'Marina Souza' }],
        },
      ]),
    );

    const resultado = await listarHistoricoComoMotorista();

    expect(resultado).toEqual([
      {
        id: 55,
        status: 'FINALIZADA',
        dataHoraSaida: '2026-06-01T07:00:00',
        origem: 'Bodocongó',
        destino: 'UFCG',
        pontoEncontro: 'Bloco CN',
        vagasOcupadas: 2,
        vagasTotal: 4,
        passageiros: [{ id: 9, nome: 'Marina Souza' }],
      },
    ]);
    expect(ehDadoMockado(resultado)).toBe(false);
  });

  it('normaliza o DTO de histórico do motorista', async () => {
    comSessao();
    fetch.mockResolvedValue(respostaJson({
      content: [{
        caronaId: 55,
        origem: 'Bodocongó',
        destino: 'UFCG',
        status: 'FINALIZADA',
        dataViagem: '2026-06-01T07:00:00',
        totalPassageiros: 2,
      }],
    }));

    await expect(listarHistoricoComoMotorista()).resolves.toEqual([{
      id: 55,
      status: 'FINALIZADA',
      dataHoraSaida: '2026-06-01T07:00:00',
      origem: 'Bodocongó',
      destino: 'UFCG',
      pontoEncontro: '',
      vagasOcupadas: 2,
      vagasTotal: 3,
      passageiros: [],
    }]);
  });
});

describe('listarHistoricoComoMotorista — erros propagam, sem fallback', () => {
  // O fallback de mock foi removido: qualquer erro do backend sobe até a página.
  it('propaga o erro quando a API responde 500', async () => {
    comSessao();
    fetch.mockResolvedValue(respostaSemJson({ status: 500 }));

    await expect(listarHistoricoComoMotorista()).rejects.toThrow(
      'Erro ao comunicar com o servidor.',
    );
  });

  it('propaga o erro quando a API responde 404', async () => {
    comSessao();
    fetch.mockResolvedValue(
      respostaJson({ message: 'Não encontrado' }, { ok: false, status: 404 }),
    );

    await expect(listarHistoricoComoMotorista()).rejects.toThrow('Não encontrado');
  });

  it('propaga o erro quando a API responde 403', async () => {
    comSessao();
    fetch.mockResolvedValue(
      respostaJson({ message: 'Acesso negado' }, { ok: false, status: 403 }),
    );

    const erro = await listarHistoricoComoMotorista().catch((e) => e);

    expect(erro.message).toBe('Acesso negado');
    expect(erro.status).toBe(403);
  });

  it('propaga o erro quando a conexão falha', async () => {
    comSessao();
    fetch.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(listarHistoricoComoMotorista()).rejects.toThrow(
      'Não foi possível conectar ao servidor. Tente novamente.',
    );
  });
});

describe('listarHistoricoComoMotorista — listas vazias/ausentes viram []', () => {
  // Sem fallback, um motorista que nunca ofertou carona recebe uma lista vazia
  // real, e não mais 3 caronas inventadas.
  it('devolve [] quando o corpo de sucesso não é JSON (data = null)', async () => {
    comSessao();
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'text/html' },
      json: async () => {
        throw new SyntaxError('Unexpected end of JSON input');
      },
    });

    await expect(listarHistoricoComoMotorista()).resolves.toEqual([]);
  });

  it('devolve [] quando o backend manda uma lista vazia legítima', async () => {
    comSessao();
    fetch.mockResolvedValue(respostaJson([]));

    const resultado = await listarHistoricoComoMotorista();

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(resultado).toEqual([]);
  });

  it('devolve [] quando o backend manda um envelope paginado vazio', async () => {
    comSessao();
    fetch.mockResolvedValue(respostaJson({ content: [] }));

    await expect(listarHistoricoComoMotorista()).resolves.toEqual([]);
  });

  it('devolve [] quando a resposta é null', async () => {
    comSessao();
    fetch.mockResolvedValue(respostaJson(null));

    await expect(listarHistoricoComoMotorista()).resolves.toEqual([]);
  });

  it('devolve [] quando a resposta é um objeto sem lista reconhecível', async () => {
    comSessao();
    fetch.mockResolvedValue(respostaJson({ total: 0 }));

    await expect(listarHistoricoComoMotorista()).resolves.toEqual([]);
  });
});

describe('listarHistoricoComoMotorista — modo mockado (VITE_ENABLE_MOCKS)', () => {
  it('devolve o histórico simulado sem tocar na rede', async () => {
    vi.stubEnv('VITE_ENABLE_MOCKS', 'true');
    vi.resetModules();
    ({ listarHistoricoComoMotorista } = await import(
      './historicoCaronasService.js'
    ));

    const resultado = await listarHistoricoComoMotorista();

    expect(fetch).not.toHaveBeenCalled();
    expect(ehDadoMockado(resultado)).toBe(true);
  });
});

describe('listarHistoricoComoMotorista — extração da lista', () => {
  it.each([
    ['array puro', (lista) => lista],
    ['envelope content (Spring Page)', (lista) => ({ content: lista })],
    ['envelope items', (lista) => ({ items: lista })],
    ['envelope caronas', (lista) => ({ caronas: lista })],
    ['envelope data', (lista) => ({ data: lista })],
  ])('lê a lista de um %s', async (_formato, envelopar) => {
    comSessao();
    fetch.mockResolvedValue(respostaJson(envelopar([{ id: 77 }])));

    const resultado = await listarHistoricoComoMotorista();

    expect(resultado).toHaveLength(1);
    expect(resultado[0].id).toBe(77);
  });
});

describe('listarHistoricoComoMotorista — normalização de campos', () => {
  async function normalizar(carona) {
    comSessao();
    fetch.mockResolvedValue(respostaJson([carona]));

    const [resultado] = await listarHistoricoComoMotorista();

    return resultado;
  }

  it('assume status ATIVA quando o backend não manda status', async () => {
    expect((await normalizar({ id: 1 })).status).toBe('ATIVA');
  });

  it('aceita `dataHora` como alias de `dataHoraSaida`', async () => {
    expect(
      (await normalizar({ id: 1, dataHora: '2026-06-01T07:00:00' }))
        .dataHoraSaida,
    ).toBe('2026-06-01T07:00:00');
  });

  it('devolve string vazia quando não há data alguma', async () => {
    expect((await normalizar({ id: 1 })).dataHoraSaida).toBe('');
  });

  it('aceita `pontoReferencia` como alias de `pontoEncontro`', async () => {
    expect(
      (await normalizar({ id: 1, pontoReferencia: 'Bloco CN' })).pontoEncontro,
    ).toBe('Bloco CN');
  });

  describe('origem/destino — texto ou objeto EnderecoDTO', () => {
    it('aceita string', async () => {
      const carona = await normalizar({ id: 1, origem: 'Centenário' });

      expect(carona.origem).toBe('Centenário');
    });

    it('extrai `descricao` do objeto', async () => {
      const carona = await normalizar({
        id: 1,
        origem: { descricao: 'Centenário', latitude: -7.2, longitude: -35.9 },
      });

      expect(carona.origem).toBe('Centenário');
    });

    it('aceita `nome` como alias de `descricao`', async () => {
      expect((await normalizar({ id: 1, destino: { nome: 'UFCG' } })).destino).toBe(
        'UFCG',
      );
    });

    it('devolve string vazia quando o local é nulo', async () => {
      const carona = await normalizar({ id: 1, origem: null, destino: undefined });

      expect(carona.origem).toBe('');
      expect(carona.destino).toBe('');
    });

    it('devolve string vazia quando o objeto não tem descricao nem nome', async () => {
      expect(
        (await normalizar({ id: 1, origem: { latitude: -7.2 } })).origem,
      ).toBe('');
    });
  });

  describe('passageiros', () => {
    it('aceita a lista `passageiros`', async () => {
      const carona = await normalizar({
        id: 1,
        passageiros: [{ id: 5, nome: 'Marina' }],
      });

      expect(carona.passageiros).toEqual([{ id: 5, nome: 'Marina' }]);
    });

    it('aceita `usuarios` como alias de `passageiros`', async () => {
      const carona = await normalizar({
        id: 1,
        usuarios: [{ id: 5, nome: 'Marina' }],
      });

      expect(carona.passageiros).toEqual([{ id: 5, nome: 'Marina' }]);
    });

    it('extrai o usuário de dentro das reservas', async () => {
      const carona = await normalizar({
        id: 1,
        reservas: [
          { id: 'r1', status: 'ACEITA', usuario: { id: 5, nome: 'Marina' } },
        ],
      });

      expect(carona.passageiros).toEqual([{ id: 5, nome: 'Marina' }]);
    });

    it('descarta reservas CANCELADA e RECUSADA', async () => {
      const carona = await normalizar({
        id: 1,
        reservas: [
          { status: 'ACEITA', usuario: { id: 5, nome: 'Marina' } },
          { status: 'CANCELADA', usuario: { id: 6, nome: 'Cancelado' } },
          { status: 'RECUSADA', usuario: { id: 7, nome: 'Recusado' } },
        ],
      });

      expect(carona.passageiros).toEqual([{ id: 5, nome: 'Marina' }]);
    });

    it('aceita `passageiro` dentro da reserva', async () => {
      const carona = await normalizar({
        id: 1,
        reservas: [{ status: 'ACEITA', passageiro: { id: 5, nome: 'Marina' } }],
      });

      expect(carona.passageiros).toEqual([{ id: 5, nome: 'Marina' }]);
    });

    it('usa a própria reserva quando ela não aninha usuário', async () => {
      const carona = await normalizar({
        id: 1,
        reservas: [{ id: 5, nome: 'Marina', status: 'ACEITA' }],
      });

      expect(carona.passageiros).toEqual([{ id: 5, nome: 'Marina' }]);
    });

    it('aceita passageiro como string simples', async () => {
      const carona = await normalizar({ id: 1, passageiros: ['Marina'] });

      expect(carona.passageiros).toEqual([{ id: 'Marina', nome: 'Marina' }]);
    });

    it('descarta passageiros sem nome', async () => {
      const carona = await normalizar({
        id: 1,
        passageiros: [{ id: 5, nome: 'Marina' }, { id: 6 }],
      });

      expect(carona.passageiros).toEqual([{ id: 5, nome: 'Marina' }]);
    });

    it.each([
      ['nome', { id: 5, nome: 'Marina' }],
      ['name', { id: 5, name: 'Marina' }],
      ['nomeCompleto', { id: 5, nomeCompleto: 'Marina' }],
    ])('resolve o nome do passageiro a partir de %s', async (_campo, passageiro) => {
      const carona = await normalizar({ id: 1, passageiros: [passageiro] });

      expect(carona.passageiros[0].nome).toBe('Marina');
    });

    it.each([
      ['id', { id: 5, nome: 'Marina' }],
      ['usuarioId', { usuarioId: 5, nome: 'Marina' }],
      ['passageiroId', { passageiroId: 5, nome: 'Marina' }],
    ])('resolve o id do passageiro a partir de %s', async (_campo, passageiro) => {
      const carona = await normalizar({ id: 1, passageiros: [passageiro] });

      expect(carona.passageiros[0].id).toBe(5);
    });

    it('devolve id vazio quando o passageiro não tem identificador', async () => {
      const carona = await normalizar({ id: 1, passageiros: [{ nome: 'Marina' }] });

      expect(carona.passageiros[0].id).toBe('');
    });

    it('devolve lista vazia quando não há passageiros de forma alguma', async () => {
      expect((await normalizar({ id: 1 })).passageiros).toEqual([]);
    });
  });

  describe('vagas', () => {
    it.each([
      ['vagasOcupadas', { vagasOcupadas: 2 }],
      ['reservasConfirmadas', { reservasConfirmadas: 2 }],
      ['quantidadeReservas', { quantidadeReservas: 2 }],
      ['quantidadePassageiros', { quantidadePassageiros: 2 }],
    ])('resolve vagasOcupadas a partir de %s', async (_campo, campos) => {
      const carona = await normalizar({ id: 1, vagasTotal: 4, ...campos });

      expect(carona.vagasOcupadas).toBe(2);
    });

    it.each([
      ['vagasTotal', { vagasTotal: 4 }],
      ['totalVagas', { totalVagas: 4 }],
      ['quantidadeVagas', { quantidadeVagas: 4 }],
      ['capacidadePassageiros', { capacidadePassageiros: 4 }],
      ['vagas', { vagas: 4 }],
    ])('resolve vagasTotal a partir de %s', async (_campo, campos) => {
      const carona = await normalizar({ id: 1, ...campos });

      expect(carona.vagasTotal).toBe(4);
    });

    it('usa a quantidade de passageiros quando vagasOcupadas não vem', async () => {
      const carona = await normalizar({
        id: 1,
        vagasTotal: 4,
        passageiros: [{ id: 5, nome: 'Marina' }, { id: 6, nome: 'João' }],
      });

      expect(carona.vagasOcupadas).toBe(2);
    });

    it('zera vagasOcupadas quando o valor é inválido e não há passageiros', async () => {
      const carona = await normalizar({ id: 1, vagasOcupadas: 'muitas', vagasTotal: 4 });

      expect(carona.vagasOcupadas).toBe(0);
    });

    it('trata vagasOcupadas negativa como 0', async () => {
      const carona = await normalizar({ id: 1, vagasOcupadas: -3, vagasTotal: 4 });

      expect(carona.vagasOcupadas).toBe(0);
    });

    // COMPORTAMENTO ATUAL (duvidoso): sem vagasTotal, o serviço inventa um
    // piso de 3 vagas em vez de admitir que não sabe. Uma carona de 1 vaga
    // ocupada aparece na tela como "1 de 3".
    it('inventa um mínimo de 3 vagas totais quando o backend não manda o total', async () => {
      const carona = await normalizar({
        id: 1,
        passageiros: [{ id: 5, nome: 'Marina' }],
      });

      expect(carona.vagasTotal).toBe(3);
    });

    it('usa as vagas ocupadas como total quando elas passam do piso de 3', async () => {
      const carona = await normalizar({ id: 1, vagasOcupadas: 5 });

      expect(carona.vagasTotal).toBe(5);
    });

    it('preserva vagasTotal 0 do backend virando o piso de 3', async () => {
      const carona = await normalizar({ id: 1, vagasTotal: 0 });

      expect(carona.vagasTotal).toBe(3);
    });
  });

  it('preserva o id tal como veio, inclusive undefined', async () => {
    expect((await normalizar({ status: 'FINALIZADA' })).id).toBeUndefined();
  });

  it('não vaza campos desconhecidos do backend', async () => {
    const carona = await normalizar({ id: 1, campoInesperado: 'xpto' });

    expect(carona).not.toHaveProperty('campoInesperado');
    expect(Object.keys(carona).sort()).toEqual([
      'dataHoraSaida',
      'destino',
      'id',
      'origem',
      'passageiros',
      'pontoEncontro',
      'status',
      'vagasOcupadas',
      'vagasTotal',
    ]);
  });
});
