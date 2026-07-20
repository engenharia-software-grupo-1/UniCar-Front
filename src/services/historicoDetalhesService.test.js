import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const BASE_URL = 'http://localhost:8080';
const TOKEN = 'token-simulado';

let obterDetalhesHistorico;

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

function comSessao(usuario = { id: 1, nome: 'Estudante UniCar' }) {
  localStorage.setItem('unicar.session', JSON.stringify({ token: TOKEN, usuario }));
}

// Ids presentes no DETALHES_HISTORICO_MOCK embutido no serviço.
const ID_MOCK = '2';
const ID_INEXISTENTE = '9999';

beforeEach(async () => {
  localStorage.clear();
  vi.resetModules();
  vi.stubGlobal('fetch', vi.fn());
  vi.stubEnv('VITE_API_URL', BASE_URL);
  vi.stubEnv('VITE_ENABLE_MOCKS', 'false');

  ({ obterDetalhesHistorico } = await import('./historicoDetalhesService.js'));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('obterDetalhesHistorico — chamada à API', () => {
  it('faz GET /historico/{id}', async () => {
    comSessao();
    fetch.mockResolvedValue(respostaJson({ id: 42 }));

    await obterDetalhesHistorico(42);

    expect(fetch).toHaveBeenCalledTimes(1);

    const [url, options] = fetch.mock.calls[0];

    expect(url).toBe(`${BASE_URL}/historico/42`);
    // O apiRequest não passa `method`, então o fetch usa o GET padrão.
    expect(options.method).toBeUndefined();
    expect(options.body).toBeUndefined();
  });

  it('interpola o id na URL sem escapar nada', async () => {
    comSessao();
    fetch.mockResolvedValue(respostaJson({ id: 'abc' }));

    await obterDetalhesHistorico('abc');

    expect(fetch.mock.calls[0][0]).toBe(`${BASE_URL}/historico/abc`);
  });

  it('envia Authorization: Bearer <token> quando há sessão', async () => {
    comSessao();
    fetch.mockResolvedValue(respostaJson({ id: 1 }));

    await obterDetalhesHistorico(1);

    expect(fetch.mock.calls[0][1].headers.Authorization).toBe(`Bearer ${TOKEN}`);
  });

  it('chama a API mesmo sem sessão, só que sem Authorization', async () => {
    fetch.mockResolvedValue(respostaJson({ id: 1 }));

    await obterDetalhesHistorico(1);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('não envia Authorization quando a sessão não tem token', async () => {
    localStorage.setItem('unicar.session', JSON.stringify({ usuario: { id: 1 } }));
    fetch.mockResolvedValue(respostaJson({ id: 1 }));

    await obterDetalhesHistorico(1);

    expect(fetch.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('não envia Authorization quando a sessão é um JSON corrompido', async () => {
    localStorage.setItem('unicar.session', '{ não é json');
    fetch.mockResolvedValue(respostaJson({ id: 1 }));

    await obterDetalhesHistorico(1);

    expect(fetch.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('devolve o detalhe do backend normalizado', async () => {
    comSessao();
    fetch.mockResolvedValue(
      respostaJson({
        id: 42,
        status: 'FINALIZADA',
        dataHoraSaida: '2026-06-01T07:00:00',
        dataHoraChegada: '2026-06-01T07:40:00',
        origem: { descricao: 'Bodocongó' },
        destino: { descricao: 'UFCG' },
        pontoReferencia: 'Bloco CN',
        paradas: ['Praça'],
        valor: 4.5,
        custos: 'Combustível',
        vagasTotais: 4,
        veiculo: { modelo: 'Onix', cor: 'Prata', placa: 'ABC1D23' },
        motorista: { id: 9, nome: 'Marina Souza', avaliacao: 4.9, fotoPerfil: 'foto.png' },
        reservas: [{ id: 'r1', usuario: { id: 5, nome: 'Lucas' }, vagas: 2, status: 'FINALIZADA' }],
      }),
    );

    const detalhe = await obterDetalhesHistorico(42);

    expect(detalhe).toEqual({
      id: 42,
      status: 'FINALIZADA',
      dataHoraSaida: '2026-06-01T07:00:00',
      dataHoraChegada: '2026-06-01T07:40:00',
      origem: 'Bodocongó',
      destino: 'UFCG',
      pontoReferencia: 'Bloco CN',
      paradas: ['Praça'],
      valor: 4.5,
      custos: 'Combustível',
      vagasTotais: 4,
      veiculo: { modelo: 'Onix', cor: 'Prata', placa: 'ABC1D23' },
      motorista: { id: 9, nome: 'Marina Souza', avaliacao: 4.9, fotoPerfil: 'foto.png' },
      reservas: [
        {
          id: 'r1',
          usuarioId: 5,
          nome: 'Lucas',
          vagas: 2,
          status: 'FINALIZADA',
          avaliacao: '',
          fotoPerfil: '',
        },
      ],
    });
  });

  it('normaliza o DTO do endpoint de histórico', async () => {
    comSessao();
    fetch.mockResolvedValue(respostaJson({
      caronaId: 42,
      origem: 'Bodocongó',
      destino: 'UFCG',
      motorista: { id: 9, nome: 'Marina Souza' },
      status: 'FINALIZADA',
      dataViagem: '2026-06-01T07:00:00',
      passageiros: [{ id: 5, nome: 'Lucas' }],
    }));

    await expect(obterDetalhesHistorico(42)).resolves.toMatchObject({
      id: 42,
      origem: 'Bodocongó',
      destino: 'UFCG',
      status: 'FINALIZADA',
      dataHoraSaida: '2026-06-01T07:00:00',
      motorista: { id: 9, nome: 'Marina Souza' },
      reservas: [{ usuarioId: 5, nome: 'Lucas', status: 'CONFIRMADA' }],
    });
  });

  it('preserva coordenadas quando a carona vem aninhada na resposta do histórico', async () => {
    comSessao();
    fetch.mockResolvedValue(respostaJson({
      id: 'historico-7',
      status: 'FINALIZADA',
      carona: {
        id: 7,
        origem: { descricao: 'Bodocongó', latitude: -7.2166, longitude: -35.9095 },
        destino: { descricao: 'UFCG', latitude: -7.2138, longitude: -35.9092 },
      },
    }));

    await expect(obterDetalhesHistorico(7)).resolves.toMatchObject({
      id: 7,
      origem: 'Bodocongó',
      destino: 'UFCG',
      origemCoordenadas: { latitude: -7.2166, longitude: -35.9095 },
      destinoCoordenadas: { latitude: -7.2138, longitude: -35.9092 },
    });
  });

  it('não valida participação quando o dado vem do backend', async () => {
    // Sem sessão e sem validarAcesso: quem autoriza é a API, não o front.
    fetch.mockResolvedValue(respostaJson({ id: 42, motorista: { id: 'outro' } }));

    await expect(obterDetalhesHistorico(42)).resolves.toMatchObject({ id: 42 });
  });
});

describe('obterDetalhesHistorico — 403 é a exceção da regra de fallback', () => {
  // Regressão crítica: todo erro cai para o mock, MENOS o 403. Se o 403
  // também caísse, o front entregaria o histórico de outra pessoa a quem o
  // backend acabou de negar acesso.
  it('re-lança o erro 403 em vez de cair para o mock', async () => {
    comSessao();
    fetch.mockResolvedValue(
      respostaJson({ message: 'Acesso negado.' }, { ok: false, status: 403 }),
    );

    await expect(obterDetalhesHistorico(ID_MOCK)).rejects.toThrow('Acesso negado.');
  });

  it('preserva o status 403 no erro re-lançado', async () => {
    comSessao();
    fetch.mockResolvedValue(
      respostaJson({ message: 'Acesso negado.' }, { ok: false, status: 403 }),
    );

    const erro = await obterDetalhesHistorico(ID_MOCK).catch((e) => e);

    expect(erro.status).toBe(403);
  });

  it('re-lança o 403 mesmo para um id que existe no mock', async () => {
    // O id '2' está no DETALHES_HISTORICO_MOCK: se o fallback rodasse, a
    // chamada resolveria com dado mockado em vez de rejeitar.
    comSessao();
    fetch.mockResolvedValue(
      respostaJson({ message: 'Acesso negado.' }, { ok: false, status: 403 }),
    );

    await expect(obterDetalhesHistorico(ID_MOCK)).rejects.toMatchObject({
      status: 403,
    });
  });

  it('re-lança o 403 mesmo quando o corpo do erro não é JSON', async () => {
    comSessao();
    fetch.mockResolvedValue(respostaSemJson({ status: 403 }));

    await expect(obterDetalhesHistorico(ID_MOCK)).rejects.toThrow(
      'Erro ao comunicar com o servidor.',
    );
  });
});

describe('obterDetalhesHistorico — sem fallback em teste: demais erros propagam', () => {
  // O fallback de mock é gated por shouldUseDevelopmentFallbacks(), que exige
  // import.meta.env.DEV — sempre false em teste. Logo, todo erro que não seja
  // 403 sobe até a página em vez de virar um detalhe mockado.
  it('propaga o erro quando a API responde 500', async () => {
    comSessao();
    fetch.mockResolvedValue(respostaSemJson({ status: 500 }));

    const erro = await obterDetalhesHistorico(ID_MOCK).catch((e) => e);

    expect(erro.message).toBe('Erro ao comunicar com o servidor.');
    expect(erro.status).toBe(500);
  });

  it('propaga o erro quando a API responde 404 para um id que existe no mock', async () => {
    comSessao();
    fetch.mockResolvedValue(
      respostaJson({ message: 'Não encontrado' }, { ok: false, status: 404 }),
    );

    const erro = await obterDetalhesHistorico(ID_MOCK).catch((e) => e);

    expect(erro.message).toBe('Não encontrado');
    expect(erro.status).toBe(404);
  });

  it('propaga o erro quando a API responde 401', async () => {
    comSessao();
    fetch.mockResolvedValue(
      respostaJson({ message: 'Não autenticado' }, { ok: false, status: 401 }),
    );

    const erro = await obterDetalhesHistorico(ID_MOCK).catch((e) => e);

    expect(erro.message).toBe('Não autenticado');
    expect(erro.status).toBe(401);
  });

  it('propaga o erro quando a conexão falha (erro sem status)', async () => {
    comSessao();
    fetch.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(obterDetalhesHistorico(ID_MOCK)).rejects.toThrow(
      'Não foi possível conectar ao servidor. Tente novamente.',
    );
  });

  it('propaga o erro mesmo sem sessão', async () => {
    fetch.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(obterDetalhesHistorico(ID_MOCK)).rejects.toThrow(
      'Não foi possível conectar ao servidor. Tente novamente.',
    );
  });

  it('propaga o 500 tal como veio, mesmo para um id que nem o mock tem', async () => {
    comSessao();
    fetch.mockResolvedValue(respostaSemJson({ status: 500 }));

    const erro = await obterDetalhesHistorico(ID_INEXISTENTE).catch((e) => e);

    // Sem fallback, o 500 não é mais mascarado como "não encontrado".
    expect(erro.message).toBe('Erro ao comunicar com o servidor.');
    expect(erro.status).toBe(500);
  });
});

describe('obterDetalhesHistorico — modo mockado (VITE_ENABLE_MOCKS)', () => {
  async function comMocksLigados() {
    vi.stubEnv('VITE_ENABLE_MOCKS', 'true');
    vi.resetModules();
    ({ obterDetalhesHistorico } = await import('./historicoDetalhesService.js'));
  }

  it('devolve o detalhe simulado sem tocar na rede', async () => {
    comSessao({ id: 1 });
    await comMocksLigados();

    const detalhe = await obterDetalhesHistorico(ID_MOCK);

    expect(fetch).not.toHaveBeenCalled();
    expect(detalhe.id).toBe(ID_MOCK);
    expect(detalhe.origem).toBe('Prata');
  });

  it('lança 404 para um id inexistente', async () => {
    comSessao({ id: 1 });
    await comMocksLigados();

    const erro = await obterDetalhesHistorico(ID_INEXISTENTE).catch((e) => e);

    expect(erro.message).toBe('Detalhes da carona não encontrados.');
    expect(erro.status).toBe(404);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('lança 403 quando o usuário não é participante da carona', async () => {
    comSessao({ id: 1 });
    await comMocksLigados();

    // Participantes do id '403': 'outro-motorista' e 'outro-passageiro'.
    const erro = await obterDetalhesHistorico('403').catch((e) => e);

    expect(erro.message).toBe('Acesso negado.');
    expect(erro.status).toBe(403);
  });

  it('lança 403 quando não há sessão nenhuma', async () => {
    await comMocksLigados();

    await expect(obterDetalhesHistorico(ID_MOCK)).rejects.toThrow('Acesso negado.');
  });

  it('lança 403 quando a sessão está corrompida', async () => {
    localStorage.setItem('unicar.session', '{ não é json');
    await comMocksLigados();

    await expect(obterDetalhesHistorico(ID_MOCK)).rejects.toThrow('Acesso negado.');
  });

  it('aceita a matrícula como identificação do participante', async () => {
    comSessao({ matricula: 'marina', nome: 'Marina Souza' });
    await comMocksLigados();

    // Participantes do id '1': 1, 'marina', 'lucas'.
    await expect(obterDetalhesHistorico('1')).resolves.toMatchObject({ id: '1' });
  });

  it('aceita usuarioId como identificação do participante', async () => {
    comSessao({ usuarioId: 'lucas', nome: 'Lucas Pereira' });
    await comMocksLigados();

    await expect(obterDetalhesHistorico('1')).resolves.toMatchObject({ id: '1' });
  });

  it('compara participante como string (id numérico vs string)', async () => {
    comSessao({ id: '1' });
    await comMocksLigados();

    // O mock lista o participante como número 1; a sessão traz a string '1'.
    await expect(obterDetalhesHistorico(ID_MOCK)).resolves.toMatchObject({
      id: ID_MOCK,
    });
  });

  it('o 404 tem precedência sobre o 403: id inexistente nem chega a validar acesso', async () => {
    await comMocksLigados();

    await expect(obterDetalhesHistorico(ID_INEXISTENTE)).rejects.toThrow(
      'Detalhes da carona não encontrados.',
    );
  });
});

describe('obterDetalhesHistorico — normalização do detalhe', () => {
  async function normalizar(detalhe) {
    comSessao();
    fetch.mockResolvedValue(respostaJson(detalhe));

    return obterDetalhesHistorico(1);
  }

  it('assume status FINALIZADA quando o backend não manda status', async () => {
    expect((await normalizar({ id: 1 })).status).toBe('FINALIZADA');
  });

  it('aceita `statusFinal` como alias de `status`', async () => {
    expect((await normalizar({ id: 1, statusFinal: 'CANCELADA' })).status).toBe(
      'CANCELADA',
    );
  });

  it('aceita `dataHora` como alias de `dataHoraSaida`', async () => {
    expect(
      (await normalizar({ id: 1, dataHora: '2026-06-01T07:00:00' })).dataHoraSaida,
    ).toBe('2026-06-01T07:00:00');
  });

  it('aceita `chegadaPrevista` como alias de `dataHoraChegada`', async () => {
    expect(
      (await normalizar({ id: 1, chegadaPrevista: '2026-06-01T07:40:00' }))
        .dataHoraChegada,
    ).toBe('2026-06-01T07:40:00');
  });

  it('devolve datas vazias quando nada vem', async () => {
    const detalhe = await normalizar({ id: 1 });

    expect(detalhe.dataHoraSaida).toBe('');
    expect(detalhe.dataHoraChegada).toBe('');
  });

  it('aceita `pontoEncontro` como alias de `pontoReferencia`', async () => {
    expect(
      (await normalizar({ id: 1, pontoEncontro: 'Campus Sede' })).pontoReferencia,
    ).toBe('Campus Sede');
  });

  describe('origem/destino', () => {
    it('aceita string', async () => {
      expect((await normalizar({ id: 1, origem: 'Prata' })).origem).toBe('Prata');
    });

    it.each([
      ['descricao', { descricao: 'Prata' }],
      ['nome', { nome: 'Prata' }],
      ['endereco', { endereco: 'Prata' }],
    ])('extrai o local a partir de %s', async (_campo, local) => {
      expect((await normalizar({ id: 1, origem: local })).origem).toBe('Prata');
    });

    it('devolve string vazia quando o local é nulo', async () => {
      const detalhe = await normalizar({ id: 1, origem: null });

      expect(detalhe.origem).toBe('');
      expect(detalhe.destino).toBe('');
    });
  });

  describe('paradas', () => {
    it('aceita uma lista de strings', async () => {
      expect((await normalizar({ id: 1, paradas: ['Praça', 'Terminal'] })).paradas)
        .toEqual(['Praça', 'Terminal']);
    });

    it('aceita `pontosParada` como alias', async () => {
      expect(
        (await normalizar({ id: 1, pontosParada: ['Praça'] })).paradas,
      ).toEqual(['Praça']);
    });

    it('extrai a descrição de paradas em objeto', async () => {
      expect(
        (await normalizar({ id: 1, paradas: [{ descricao: 'Praça' }] })).paradas,
      ).toEqual(['Praça']);
    });

    it('aceita um envelope paginado de paradas', async () => {
      expect(
        (await normalizar({ id: 1, paradas: { content: ['Praça'] } })).paradas,
      ).toEqual(['Praça']);
    });

    it('descarta paradas que normalizam para vazio', async () => {
      expect(
        (await normalizar({ id: 1, paradas: ['Praça', null, {}] })).paradas,
      ).toEqual(['Praça']);
    });

    it('devolve lista vazia quando não há paradas', async () => {
      expect((await normalizar({ id: 1 })).paradas).toEqual([]);
    });
  });

  describe('valor', () => {
    it.each([
      ['valor', { valor: 7 }],
      ['custo', { custo: 7 }],
      ['preco', { preco: 7 }],
    ])('resolve o valor a partir de %s', async (_campo, campos) => {
      expect((await normalizar({ id: 1, ...campos })).valor).toBe(7);
    });

    it('assume 0 quando nenhum campo de valor vem', async () => {
      expect((await normalizar({ id: 1 })).valor).toBe(0);
    });

    it('preserva o valor 0 explícito em vez de cair no custo', async () => {
      expect((await normalizar({ id: 1, valor: 0, custo: 9 })).valor).toBe(0);
    });

    it('converte string numérica para número', async () => {
      expect((await normalizar({ id: 1, valor: '5.5' })).valor).toBe(5.5);
    });

    // COMPORTAMENTO ATUAL: um valor não numérico vira NaN e vaza para a tela.
    it('vira NaN quando o valor não é numérico', async () => {
      expect((await normalizar({ id: 1, valor: 'grátis' })).valor).toBeNaN();
    });
  });

  it('aceita `descricaoCustos` como alias de `custos`', async () => {
    expect(
      (await normalizar({ id: 1, descricaoCustos: 'Combustível' })).custos,
    ).toBe('Combustível');
  });

  it.each([
    ['vagasTotais', { vagasTotais: 4 }],
    ['quantidadeVagas', { quantidadeVagas: 4 }],
    ['totalVagas', { totalVagas: 4 }],
  ])('resolve vagasTotais a partir de %s', async (_campo, campos) => {
    expect((await normalizar({ id: 1, ...campos })).vagasTotais).toBe(4);
  });

  it('assume vagasTotais 0 quando nada vem', async () => {
    expect((await normalizar({ id: 1 })).vagasTotais).toBe(0);
  });

  describe('veículo', () => {
    it('é null quando o backend não manda veículo', async () => {
      expect((await normalizar({ id: 1 })).veiculo).toBeNull();
    });

    it('normaliza os campos do veículo', async () => {
      expect(
        (await normalizar({ id: 1, veiculo: { modelo: 'Onix', cor: 'Prata', placa: 'ABC1D23' } }))
          .veiculo,
      ).toEqual({ modelo: 'Onix', cor: 'Prata', placa: 'ABC1D23' });
    });

    it('preenche com string vazia os campos ausentes do veículo', async () => {
      expect((await normalizar({ id: 1, veiculo: { modelo: 'Onix' } })).veiculo)
        .toEqual({ modelo: 'Onix', cor: '', placa: '' });
    });
  });

  describe('motorista', () => {
    it('aceita `condutor` como alias', async () => {
      expect(
        (await normalizar({ id: 1, condutor: { id: 9, nome: 'Marina' } })).motorista
          .nome,
      ).toBe('Marina');
    });

    it('usa "Motorista" como nome padrão', async () => {
      expect((await normalizar({ id: 1 })).motorista).toEqual({
        id: '',
        nome: 'Motorista',
        avaliacao: '',
        fotoPerfil: '',
      });
    });

    it.each([
      ['nome', { nome: 'Marina' }],
      ['nomeCompleto', { nomeCompleto: 'Marina' }],
    ])('resolve o nome do motorista a partir de %s', async (_campo, motorista) => {
      expect((await normalizar({ id: 1, motorista })).motorista.nome).toBe('Marina');
    });

    it.each([
      ['id', { id: 9 }],
      ['usuarioId', { usuarioId: 9 }],
    ])('resolve o id do motorista a partir de %s', async (_campo, motorista) => {
      expect((await normalizar({ id: 1, motorista })).motorista.id).toBe(9);
    });

    it('aceita `motoristaId` no nível do detalhe', async () => {
      expect((await normalizar({ id: 1, motoristaId: 9 })).motorista.id).toBe(9);
    });

    it('aceita `rating` como alias de `avaliacao`', async () => {
      expect(
        (await normalizar({ id: 1, motorista: { rating: 4.9 } })).motorista.avaliacao,
      ).toBe(4.9);
    });

    it.each([
      ['fotoPerfil', { fotoPerfil: 'foto.png' }],
      ['avatarUrl', { avatarUrl: 'foto.png' }],
      ['avatar', { avatar: 'foto.png' }],
    ])('resolve a foto do motorista a partir de %s', async (_campo, motorista) => {
      expect((await normalizar({ id: 1, motorista })).motorista.fotoPerfil).toBe(
        'foto.png',
      );
    });
  });

  describe('reservas', () => {
    it('devolve lista vazia quando não há reservas', async () => {
      expect((await normalizar({ id: 1 })).reservas).toEqual([]);
    });

    it.each([
      ['reservas', 'reservas'],
      ['passageiros', 'passageiros'],
      ['participantesReserva', 'participantesReserva'],
    ])('aceita a lista em `%s`', async (_campo, chave) => {
      const detalhe = await normalizar({
        id: 1,
        [chave]: [{ id: 'r1', usuario: { id: 5, nome: 'Lucas' } }],
      });

      expect(detalhe.reservas).toHaveLength(1);
      expect(detalhe.reservas[0].nome).toBe('Lucas');
    });

    it('aceita um envelope paginado de reservas', async () => {
      const detalhe = await normalizar({
        id: 1,
        reservas: { items: [{ id: 'r1', usuario: { id: 5, nome: 'Lucas' } }] },
      });

      expect(detalhe.reservas[0].nome).toBe('Lucas');
    });

    it('aceita `passageiro` aninhado na reserva', async () => {
      const detalhe = await normalizar({
        id: 1,
        reservas: [{ id: 'r1', passageiro: { id: 5, nome: 'Lucas' } }],
      });

      expect(detalhe.reservas[0].usuarioId).toBe(5);
    });

    it('assume status CONFIRMADA e 1 vaga quando a reserva não diz', async () => {
      const detalhe = await normalizar({
        id: 1,
        reservas: [{ id: 'r1', usuario: { id: 5, nome: 'Lucas' } }],
      });

      expect(detalhe.reservas[0].status).toBe('CONFIRMADA');
      expect(detalhe.reservas[0].vagas).toBe(1);
    });

    it.each([
      ['vagas', { vagas: 2 }],
      ['quantidadePassageiros', { quantidadePassageiros: 2 }],
      ['vagasReservadas', { vagasReservadas: 2 }],
    ])('resolve as vagas da reserva a partir de %s', async (_campo, campos) => {
      const detalhe = await normalizar({
        id: 1,
        reservas: [{ id: 'r1', usuario: { id: 5, nome: 'Lucas' }, ...campos }],
      });

      expect(detalhe.reservas[0].vagas).toBe(2);
    });

    it('usa "Passageiro" como nome padrão', async () => {
      const detalhe = await normalizar({ id: 1, reservas: [{ id: 'r1' }] });

      expect(detalhe.reservas[0].nome).toBe('Passageiro');
    });

    it('cai para o nome do usuário como id quando não há id nenhum', async () => {
      const detalhe = await normalizar({
        id: 1,
        reservas: [{ usuario: { nome: 'Lucas' } }],
      });

      expect(detalhe.reservas[0].id).toBe('Lucas');
    });

    it('resolve avaliação e foto de dentro do usuário', async () => {
      const detalhe = await normalizar({
        id: 1,
        reservas: [
          {
            id: 'r1',
            usuario: { id: 5, nome: 'Lucas', rating: 4.7, avatarUrl: 'foto.png' },
          },
        ],
      });

      expect(detalhe.reservas[0].avaliacao).toBe(4.7);
      expect(detalhe.reservas[0].fotoPerfil).toBe('foto.png');
    });

    // BUG (comportamento atual, travado aqui de propósito): numa reserva
    // "achatada" (sem usuario/passageiro aninhado), `usuario` vira a própria
    // reserva, então usuario.id é o ID DA RESERVA e o usuarioId declarado é
    // ignorado. Quem consome usuarioId para abrir o perfil pega o id errado.
    it('confunde o id da reserva com o id do usuário em reserva achatada', async () => {
      const detalhe = await normalizar({
        id: 1,
        reservas: [{ id: 'r1', usuarioId: 5, nome: 'Lucas', status: 'FINALIZADA' }],
      });

      expect(detalhe.reservas[0].id).toBe('r1');
      expect(detalhe.reservas[0].usuarioId).toBe('r1'); // deveria ser 5
    });

    it('devolve usuarioId vazio quando não há identificador algum', async () => {
      const detalhe = await normalizar({
        id: 1,
        reservas: [{ usuario: { nome: 'Lucas' } }],
      });

      expect(detalhe.reservas[0].usuarioId).toBe('');
    });
  });

  it('preserva o id tal como veio, inclusive undefined', async () => {
    expect((await normalizar({ status: 'FINALIZADA' })).id).toBeUndefined();
  });

  it('não vaza campos desconhecidos do backend', async () => {
    const detalhe = await normalizar({ id: 1, campoInesperado: 'xpto' });

    expect(detalhe).not.toHaveProperty('campoInesperado');
    expect(Object.keys(detalhe).sort()).toEqual([
      'custos',
      'dataHoraChegada',
      'dataHoraSaida',
      'destino',
      'id',
      'motorista',
      'origem',
      'paradas',
      'pontoReferencia',
      'reservas',
      'status',
      'vagasTotais',
      'valor',
      'veiculo',
    ]);
  });
});
