import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const BASE_URL = 'http://localhost:8080';
const TOKEN = 'token-simulado';
const CHAVE_MOCK = 'unicar.mock.usuariosBloqueados';
const CHAVE_VERSAO = 'unicar.mock.usuariosBloqueados.version';
const VERSAO_ATUAL = 'v2';

let listarUsuariosBloqueados;
let bloquearUsuario;
let desbloquearUsuario;

function comSessao() {
  localStorage.setItem(
    'unicar.session',
    JSON.stringify({ token: TOKEN, usuario: { nome: 'Fulano' } }),
  );
}

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

function lerStoreMockado() {
  return JSON.parse(localStorage.getItem(CHAVE_MOCK));
}

function semeadoComVersaoAtual(usuarios) {
  localStorage.setItem(CHAVE_MOCK, JSON.stringify(usuarios));
  localStorage.setItem(CHAVE_VERSAO, VERSAO_ATUAL);
}

beforeEach(async () => {
  localStorage.clear();
  vi.resetModules();
  vi.stubGlobal('fetch', vi.fn());
  vi.stubEnv('VITE_API_URL', BASE_URL);
  vi.stubEnv('VITE_ENABLE_MOCKS', 'false');

  ({ listarUsuariosBloqueados, bloquearUsuario, desbloquearUsuario } =
    await import('./blockUserService.js'));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('listarUsuariosBloqueados — chamada à API', () => {
  it('faz GET /usuarios/bloqueados com o Bearer da sessão', async () => {
    comSessao();
    fetch.mockResolvedValue(respostaJson([]));

    await listarUsuariosBloqueados();

    expect(fetch).toHaveBeenCalledTimes(1);

    const [url, options] = fetch.mock.calls[0];

    expect(url).toBe(`${BASE_URL}/usuarios/bloqueados`);
    expect(options.method).toBeUndefined();
    expect(options.body).toBeUndefined();
    expect(options.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(options.headers['Content-Type']).toBe('application/json');
  });

  // Diferente do vehicleService, este service NÃO exige sessão antes de sair
  // para a rede: manda o request sem Authorization e deixa a API decidir.
  it('chama a API mesmo sem sessão, apenas sem o header Authorization', async () => {
    fetch.mockResolvedValue(respostaJson([]));

    await listarUsuariosBloqueados();

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('omite o Authorization quando a sessão não tem token', async () => {
    localStorage.setItem('unicar.session', JSON.stringify({ usuario: {} }));
    fetch.mockResolvedValue(respostaJson([]));

    await listarUsuariosBloqueados();

    expect(fetch.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('omite o Authorization quando a sessão é um JSON corrompido', async () => {
    localStorage.setItem('unicar.session', '{ não é json');
    fetch.mockResolvedValue(respostaJson([]));

    await listarUsuariosBloqueados();

    expect(fetch.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('devolve lista vazia quando a API não responde um array', async () => {
    comSessao();
    fetch.mockResolvedValue(respostaJson({ conteudo: [] }));

    await expect(listarUsuariosBloqueados()).resolves.toEqual([]);
  });

  it('devolve lista vazia quando a resposta é nula', async () => {
    comSessao();
    fetch.mockResolvedValue(respostaJson(null));

    await expect(listarUsuariosBloqueados()).resolves.toEqual([]);
  });
});

describe('listarUsuariosBloqueados — normalização (toBlockedUser)', () => {
  async function listarUm(usuario) {
    comSessao();
    fetch.mockResolvedValue(respostaJson([usuario]));

    const [resultado] = await listarUsuariosBloqueados();

    return resultado;
  }

  it('mapeia o formato canônico da API', async () => {
    const usuario = await listarUm({
      id: '7',
      nomeCompleto: 'Marina Alves',
      curso: 'Direito',
      blockedAt: '2026-07-04T12:00:00Z',
    });

    expect(usuario).toEqual({
      id: '7',
      name: 'Marina Alves',
      course: 'Direito',
      avatar: 'MA',
      blockedAt: expect.stringMatching(/^\d{2}\/\d{2}\/\d{4}$/),
    });
  });

  it.each([
    ['id', { id: '7' }],
    ['usuarioId', { usuarioId: '7' }],
    ['userId', { userId: '7' }],
  ])('resolve o id a partir de %s', async (_campo, parcial) => {
    expect((await listarUm(parcial)).id).toBe('7');
  });

  it('devolve id vazio quando nenhuma variante existe', async () => {
    expect((await listarUm({ nome: 'Fulano' })).id).toBe('');
  });

  it.each([
    ['nomeCompleto', { nomeCompleto: 'Marina Alves' }],
    ['nome', { nome: 'Marina Alves' }],
    ['name', { name: 'Marina Alves' }],
  ])('resolve o nome a partir de %s', async (_campo, parcial) => {
    expect((await listarUm(parcial)).name).toBe('Marina Alves');
  });

  it('usa "Usuário" quando nenhuma variante de nome existe', async () => {
    const usuario = await listarUm({ id: '7' });

    expect(usuario.name).toBe('Usuário');
    expect(usuario.avatar).toBe('U');
  });

  it.each([
    ['curso', { curso: 'Direito' }],
    ['nomeCurso', { nomeCurso: 'Direito' }],
    ['course', { course: 'Direito' }],
  ])('resolve o curso a partir de %s', async (_campo, parcial) => {
    expect((await listarUm(parcial)).course).toBe('Direito');
  });

  it('usa "Curso não informado" quando nenhuma variante de curso existe', async () => {
    expect((await listarUm({ id: '7' })).course).toBe('Curso não informado');
  });

  describe('avatar (iniciais)', () => {
    it('usa as duas primeiras iniciais em maiúsculo', async () => {
      expect((await listarUm({ nome: 'marina alves' })).avatar).toBe('MA');
    });

    it('ignora nomes do meio além do segundo', async () => {
      expect((await listarUm({ nome: 'Marina Silva Alves Costa' })).avatar).toBe(
        'MS',
      );
    });

    it('tolera espaços repetidos', async () => {
      expect((await listarUm({ nome: '  Marina   Alves ' })).avatar).toBe('MA');
    });

    it('devolve uma inicial só quando o nome tem uma palavra', async () => {
      expect((await listarUm({ nome: 'Marina' })).avatar).toBe('M');
    });

    it('cai em "U" quando o nome é só espaço em branco', async () => {
      expect((await listarUm({ nome: '   ' })).avatar).toBe('U');
    });
  });

  describe('blockedAt', () => {
    it.each([
      ['blockedAt', { blockedAt: '2026-07-04T12:00:00Z' }],
      ['bloqueadoEm', { bloqueadoEm: '2026-07-04T12:00:00Z' }],
      ['createdAt', { createdAt: '2026-07-04T12:00:00Z' }],
    ])('resolve a data a partir de %s', async (_campo, parcial) => {
      expect((await listarUm(parcial)).blockedAt).toMatch(
        /^\d{2}\/\d{2}\/\d{4}$/,
      );
    });

    it('devolve "data não informada" quando não vem data', async () => {
      expect((await listarUm({ id: '7' })).blockedAt).toBe('data não informada');
    });

    it('repassa o valor cru quando a data não é parseável', async () => {
      expect((await listarUm({ blockedAt: 'ontem' })).blockedAt).toBe('ontem');
    });
  });
});

// Este bloco documenta o comportamento ATUAL do service, que NÃO é
// necessariamente o desejado: /usuarios/bloqueados não existe no backend, e o
// service disfarça essa ausência devolvendo o mock store local em vez de erro.
// Os testes abaixo travam exatamente onde o disfarce começa e onde termina.
describe('fallback silencioso para o mock store (comportamento atual)', () => {
  it('engole o 404 e devolve o mock local em vez de propagar o erro', async () => {
    comSessao();
    fetch.mockResolvedValue(
      respostaJson({ message: 'Not Found' }, { ok: false, status: 404 }),
    );

    const usuarios = await listarUsuariosBloqueados();

    // Endpoint inexistente => a UI recebe dados fabricados achando que são reais.
    expect(usuarios).toEqual([
      {
        id: '2',
        name: 'Marina Alves',
        course: 'Direito',
        avatar: 'MA',
        blockedAt: '04/07/2026',
      },
    ]);
  });

  it('engole o 405 (verbo não suportado) e devolve o mock local', async () => {
    comSessao();
    fetch.mockResolvedValue(
      respostaJson(
        { message: 'Method Not Allowed' },
        { ok: false, status: 405 },
      ),
    );

    await expect(listarUsuariosBloqueados()).resolves.toHaveLength(1);
  });

  it('engole qualquer status cuja mensagem contenha "not found"', async () => {
    comSessao();
    fetch.mockResolvedValue(
      respostaJson(
        { message: 'Handler not found for this route' },
        { ok: false, status: 500 },
      ),
    );

    await expect(listarUsuariosBloqueados()).resolves.toHaveLength(1);
  });

  it('engole qualquer status cuja mensagem contenha "not supported"', async () => {
    comSessao();
    fetch.mockResolvedValue(
      respostaJson(
        { message: 'Operation not supported' },
        { ok: false, status: 501 },
      ),
    );

    await expect(listarUsuariosBloqueados()).resolves.toHaveLength(1);
  });

  // Limite do fallback: um 500 genérico NÃO é disfarçado. Importante porque o
  // GlobalExceptionHandler da API devolve 500 (não 404) para rota inexistente,
  // então na prática o fallback quase nunca dispara contra o backend real.
  it('NÃO engole um 500 genérico — o erro propaga', async () => {
    comSessao();
    fetch.mockResolvedValue(
      respostaJson(
        { message: 'Erro interno no servidor.' },
        { ok: false, status: 500 },
      ),
    );

    await expect(listarUsuariosBloqueados()).rejects.toThrow(
      'Erro interno no servidor.',
    );
  });

  it('NÃO engole um 500 sem corpo JSON — o erro propaga', async () => {
    comSessao();
    fetch.mockResolvedValue(respostaSemJson({ status: 500 }));

    await expect(listarUsuariosBloqueados()).rejects.toThrow(
      'Erro ao comunicar com o servidor.',
    );
  });

  it('NÃO engole um 403 — o erro propaga', async () => {
    comSessao();
    fetch.mockResolvedValue(
      respostaJson({ message: 'Acesso negado.' }, { ok: false, status: 403 }),
    );

    await expect(listarUsuariosBloqueados()).rejects.toThrow('Acesso negado.');
  });

  it('NÃO engole falha de conexão — o erro propaga', async () => {
    comSessao();
    fetch.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(listarUsuariosBloqueados()).rejects.toThrow(
      'Não foi possível conectar ao servidor. Tente novamente.',
    );
  });

  it('bloquearUsuario cai no mock e persiste o bloqueio quando a API dá 404', async () => {
    comSessao();
    fetch.mockResolvedValue(
      respostaJson({ message: 'Not Found' }, { ok: false, status: 404 }),
    );

    await expect(bloquearUsuario('9')).resolves.toEqual({
      isBlocked: true,
      alreadyBlocked: false,
    });

    expect(lerStoreMockado().map((u) => u.id)).toContain('9');
  });

  it('desbloquearUsuario cai no mock e remove do store quando a API dá 404', async () => {
    comSessao();
    semeadoComVersaoAtual([{ id: '9', name: 'Fulano' }]);
    fetch.mockResolvedValue(
      respostaJson({ message: 'Not Found' }, { ok: false, status: 404 }),
    );

    await expect(desbloquearUsuario('9')).resolves.toBe(true);
    expect(lerStoreMockado()).toEqual([]);
  });

  // O fallback de escrita exige sessão (exigirSessao), o de leitura não: um 404
  // sem sessão troca o erro da API por um "Usuário não autenticado." enganoso.
  it('o fallback de bloqueio sem sessão troca o erro da API por "Usuário não autenticado."', async () => {
    fetch.mockResolvedValue(
      respostaJson({ message: 'Not Found' }, { ok: false, status: 404 }),
    );

    await expect(bloquearUsuario('9')).rejects.toThrow(
      'Usuário não autenticado.',
    );
  });

  it('o fallback de leitura funciona sem sessão nenhuma', async () => {
    fetch.mockResolvedValue(
      respostaJson({ message: 'Not Found' }, { ok: false, status: 404 }),
    );

    await expect(listarUsuariosBloqueados()).resolves.toHaveLength(1);
  });
});

describe('bloquearUsuario — validação e chamada à API', () => {
  it.each([
    ['undefined', undefined],
    ['null', null],
    ['string vazia', ''],
    ['zero', 0],
  ])('rejeita id %s e não chama fetch', async (_rotulo, id) => {
    await expect(bloquearUsuario(id)).rejects.toThrow(
      'Usuário inválido para bloqueio.',
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it('faz POST /usuarios/{id}/bloquear sem corpo', async () => {
    comSessao();
    fetch.mockResolvedValue(respostaJson(null, { status: 204 }));

    await bloquearUsuario('7');

    const [url, options] = fetch.mock.calls[0];

    expect(url).toBe(`${BASE_URL}/usuarios/7/bloquear`);
    expect(options.method).toBe('POST');
    expect(options.body).toBeUndefined();
    expect(options.headers.Authorization).toBe(`Bearer ${TOKEN}`);
  });

  it('devolve isBlocked sem alreadyBlocked quando o bloqueio é novo', async () => {
    comSessao();
    fetch.mockResolvedValue(respostaJson(null, { status: 204 }));

    await expect(bloquearUsuario('7')).resolves.toEqual({
      isBlocked: true,
      alreadyBlocked: false,
    });
  });

  it('não grava nada no mock store quando a API responde ok', async () => {
    comSessao();
    fetch.mockResolvedValue(respostaJson(null, { status: 204 }));

    await bloquearUsuario('7');

    expect(localStorage.getItem(CHAVE_MOCK)).toBeNull();
  });

  it('trata 409 como "já estava bloqueado"', async () => {
    comSessao();
    fetch.mockResolvedValue(
      respostaJson({ message: 'Conflito.' }, { ok: false, status: 409 }),
    );

    await expect(bloquearUsuario('7')).resolves.toEqual({
      isBlocked: true,
      alreadyBlocked: true,
    });
  });

  it.each([
    ['com acento', 'Usuário já bloqueado.'],
    ['sem acento', 'Usuario ja bloqueado.'],
    ['em maiúsculas', 'USUÁRIO JÁ BLOQUEADO'],
  ])('trata 400 %s como "já estava bloqueado"', async (_rotulo, mensagem) => {
    comSessao();
    fetch.mockResolvedValue(
      respostaJson({ message: mensagem }, { ok: false, status: 400 }),
    );

    await expect(bloquearUsuario('7')).resolves.toEqual({
      isBlocked: true,
      alreadyBlocked: true,
    });
  });

  it('propaga um 400 que não fala de bloqueio prévio', async () => {
    comSessao();
    fetch.mockResolvedValue(
      respostaJson(
        { message: 'Não é possível bloquear a si mesmo.' },
        { ok: false, status: 400 },
      ),
    );

    await expect(bloquearUsuario('7')).rejects.toThrow(
      'Não é possível bloquear a si mesmo.',
    );
  });

  it('propaga um 500 genérico', async () => {
    comSessao();
    fetch.mockResolvedValue(
      respostaJson(
        { message: 'Erro interno no servidor.' },
        { ok: false, status: 500 },
      ),
    );

    await expect(bloquearUsuario('7')).rejects.toThrow(
      'Erro interno no servidor.',
    );
  });

  it('propaga falha de conexão', async () => {
    comSessao();
    fetch.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(bloquearUsuario('7')).rejects.toThrow(
      'Não foi possível conectar ao servidor. Tente novamente.',
    );
  });
});

describe('desbloquearUsuario — validação e chamada à API', () => {
  it.each([
    ['undefined', undefined],
    ['null', null],
    ['string vazia', ''],
    ['zero', 0],
  ])('rejeita id %s e não chama fetch', async (_rotulo, id) => {
    await expect(desbloquearUsuario(id)).rejects.toThrow(
      'Usuário inválido para desbloqueio.',
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it('faz DELETE /usuarios/{id}/bloquear sem corpo', async () => {
    comSessao();
    fetch.mockResolvedValue(respostaJson(null, { status: 204 }));

    await desbloquearUsuario('7');

    const [url, options] = fetch.mock.calls[0];

    expect(url).toBe(`${BASE_URL}/usuarios/7/bloquear`);
    expect(options.method).toBe('DELETE');
    expect(options.body).toBeUndefined();
    expect(options.headers.Authorization).toBe(`Bearer ${TOKEN}`);
  });

  it('devolve true quando a API confirma o desbloqueio', async () => {
    comSessao();
    fetch.mockResolvedValue(respostaJson(null, { status: 204 }));

    await expect(desbloquearUsuario('7')).resolves.toBe(true);
  });

  it('não mexe no mock store quando a API responde ok', async () => {
    comSessao();
    semeadoComVersaoAtual([{ id: '7', name: 'Fulano' }]);
    fetch.mockResolvedValue(respostaJson(null, { status: 204 }));

    await desbloquearUsuario('7');

    expect(lerStoreMockado()).toEqual([{ id: '7', name: 'Fulano' }]);
  });

  it('propaga um 403', async () => {
    comSessao();
    fetch.mockResolvedValue(
      respostaJson({ message: 'Acesso negado.' }, { ok: false, status: 403 }),
    );

    await expect(desbloquearUsuario('7')).rejects.toThrow('Acesso negado.');
  });

  it('propaga um 500 genérico', async () => {
    comSessao();
    fetch.mockResolvedValue(
      respostaJson(
        { message: 'Erro interno no servidor.' },
        { ok: false, status: 500 },
      ),
    );

    await expect(desbloquearUsuario('7')).rejects.toThrow(
      'Erro interno no servidor.',
    );
  });

  it('propaga falha de conexão', async () => {
    comSessao();
    fetch.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(desbloquearUsuario('7')).rejects.toThrow(
      'Não foi possível conectar ao servidor. Tente novamente.',
    );
  });
});

describe('modo mockado (VITE_ENABLE_MOCKS=true)', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_ENABLE_MOCKS', 'true');
  });

  it('listar devolve a semente sem tocar na rede', async () => {
    const usuarios = await listarUsuariosBloqueados();

    expect(fetch).not.toHaveBeenCalled();
    expect(usuarios).toEqual([
      {
        id: '2',
        name: 'Marina Alves',
        course: 'Direito',
        avatar: 'MA',
        blockedAt: '04/07/2026',
      },
    ]);
  });

  it('bloquear grava no store local sem tocar na rede', async () => {
    comSessao();

    await expect(bloquearUsuario('9')).resolves.toEqual({
      isBlocked: true,
      alreadyBlocked: false,
    });
    expect(fetch).not.toHaveBeenCalled();

    expect(lerStoreMockado()).toEqual([
      expect.objectContaining({ id: '2' }),
      {
        id: '9',
        name: 'Usuário 9',
        course: 'Curso não informado',
        avatar: 'U',
        blockedAt: expect.stringMatching(/^\d{2}\/\d{2}\/\d{4}$/),
      },
    ]);
  });

  it('bloquear converte o id para string antes de gravar', async () => {
    comSessao();

    await bloquearUsuario(9);

    expect(lerStoreMockado()[1].id).toBe('9');
  });

  it('bloquear é idempotente: o segundo bloqueio devolve alreadyBlocked', async () => {
    comSessao();

    await bloquearUsuario('9');

    await expect(bloquearUsuario('9')).resolves.toEqual({
      isBlocked: true,
      alreadyBlocked: true,
    });
    expect(lerStoreMockado()).toHaveLength(2);
  });

  it('bloquear compara ids frouxamente: número 2 já consta como string "2"', async () => {
    comSessao();

    await expect(bloquearUsuario(2)).resolves.toEqual({
      isBlocked: true,
      alreadyBlocked: true,
    });
  });

  it('desbloquear remove do store local sem tocar na rede', async () => {
    comSessao();

    await expect(desbloquearUsuario('2')).resolves.toBe(true);
    expect(fetch).not.toHaveBeenCalled();
    expect(lerStoreMockado()).toEqual([]);
  });

  it('desbloquear um id ausente devolve true sem alterar o store', async () => {
    comSessao();
    semeadoComVersaoAtual([{ id: '2', name: 'Marina Alves' }]);

    await expect(desbloquearUsuario('999')).resolves.toBe(true);
    expect(lerStoreMockado()).toEqual([{ id: '2', name: 'Marina Alves' }]);
  });

  it.each([
    ['bloquear', () => bloquearUsuario('9')],
    ['desbloquear', () => desbloquearUsuario('2')],
  ])('%s exige sessão', async (_rotulo, acao) => {
    await expect(acao()).rejects.toThrow('Usuário não autenticado.');
  });

  it('listar NÃO exige sessão', async () => {
    await expect(listarUsuariosBloqueados()).resolves.toHaveLength(1);
  });

  it('listar não remapeia os dados mockados por toBlockedUser', async () => {
    // O store local já é gravado no formato de UI, então o caminho mockado
    // devolve o que está salvo cru — inclusive lixo que a API nunca produziria.
    semeadoComVersaoAtual([{ id: '4', campoEstranho: true }]);

    await expect(listarUsuariosBloqueados()).resolves.toEqual([
      { id: '4', campoEstranho: true },
    ]);
  });
});

describe('mock store — chave e tag de versão', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_ENABLE_MOCKS', 'true');
  });

  it('semeia store e versão quando o localStorage está limpo', async () => {
    await listarUsuariosBloqueados();

    expect(localStorage.getItem(CHAVE_VERSAO)).toBe(VERSAO_ATUAL);
    expect(lerStoreMockado()).toEqual([
      {
        id: '2',
        name: 'Marina Alves',
        course: 'Direito',
        avatar: 'MA',
        blockedAt: '04/07/2026',
      },
    ]);
  });

  it('preserva os dados salvos quando a versão bate', async () => {
    semeadoComVersaoAtual([{ id: '42', name: 'Beltrano' }]);

    await expect(listarUsuariosBloqueados()).resolves.toEqual([
      { id: '42', name: 'Beltrano' },
    ]);
  });

  // O ponto do par store/versão: mudar a constante de versão no service
  // invalida o que estava salvo. Aqui simulamos o inverso (dado gravado por uma
  // versão antiga), que é o que acontece no navegador de quem já usou o app.
  it('descarta e resemeia quando a versão salva é antiga', async () => {
    localStorage.setItem(CHAVE_MOCK, JSON.stringify([{ id: '42' }]));
    localStorage.setItem(CHAVE_VERSAO, 'v1');

    const usuarios = await listarUsuariosBloqueados();

    expect(usuarios).toEqual([expect.objectContaining({ id: '2' })]);
    expect(localStorage.getItem(CHAVE_VERSAO)).toBe(VERSAO_ATUAL);
    expect(lerStoreMockado()).toEqual([expect.objectContaining({ id: '2' })]);
  });

  it('descarta e resemeia quando a tag de versão sumiu mas o dado ficou', async () => {
    localStorage.setItem(CHAVE_MOCK, JSON.stringify([{ id: '42' }]));

    await expect(listarUsuariosBloqueados()).resolves.toEqual([
      expect.objectContaining({ id: '2' }),
    ]);
    expect(localStorage.getItem(CHAVE_VERSAO)).toBe(VERSAO_ATUAL);
  });

  it('resemeia o dado quando só a tag de versão existe', async () => {
    localStorage.setItem(CHAVE_VERSAO, VERSAO_ATUAL);

    await expect(listarUsuariosBloqueados()).resolves.toEqual([
      expect.objectContaining({ id: '2' }),
    ]);
    expect(lerStoreMockado()).toEqual([expect.objectContaining({ id: '2' })]);
  });

  it('resemeia quando o store salvo é um JSON corrompido', async () => {
    localStorage.setItem(CHAVE_MOCK, '{ não é json');
    localStorage.setItem(CHAVE_VERSAO, VERSAO_ATUAL);

    await expect(listarUsuariosBloqueados()).resolves.toEqual([
      expect.objectContaining({ id: '2' }),
    ]);
    expect(lerStoreMockado()).toEqual([expect.objectContaining({ id: '2' })]);
  });

  it('devolve a semente quando o store salvo não é um array', async () => {
    localStorage.setItem(CHAVE_MOCK, JSON.stringify({ id: '42' }));
    localStorage.setItem(CHAVE_VERSAO, VERSAO_ATUAL);

    await expect(listarUsuariosBloqueados()).resolves.toEqual([
      expect.objectContaining({ id: '2' }),
    ]);
    // Comportamento atual: o store inválido NÃO é reescrito, só ignorado em
    // memória — a próxima leitura passa pelo mesmo desvio de novo.
    expect(lerStoreMockado()).toEqual({ id: '42' });
  });

  it('escritas persistem entre chamadas', async () => {
    comSessao();

    await bloquearUsuario('9');

    await expect(listarUsuariosBloqueados()).resolves.toEqual([
      expect.objectContaining({ id: '2' }),
      expect.objectContaining({ id: '9' }),
    ]);
  });
});
