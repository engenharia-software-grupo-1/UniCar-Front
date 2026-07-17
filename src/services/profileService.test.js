import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const BASE_URL = 'http://localhost:8080';
const TOKEN = 'token-simulado';
const FOTO = 'data:image/png;base64,iVBORw0KGgo=';
const OUTRA_FOTO = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';

let getPerfilUsuarioAutenticado;
let atualizarPerfilUsuarioAutenticado;
let excluirContaUsuarioAutenticado;

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
function respostaSemJson({ status = 500, ok = false } = {}) {
  return {
    ok,
    status,
    headers: { get: () => 'text/html' },
    json: async () => {
      throw new SyntaxError('Unexpected end of JSON input');
    },
  };
}

// Resposta 204 (DELETE): sem content-type, o apiRequest devolve null sem parsear.
function respostaSemConteudo() {
  return {
    ok: true,
    status: 204,
    headers: { get: () => null },
    json: vi.fn(),
  };
}

function comSessao(usuario = { id: 1, nome: 'Fulano' }) {
  localStorage.setItem('unicar.session', JSON.stringify({ token: TOKEN, usuario }));
}

function sessaoSalva() {
  return JSON.parse(localStorage.getItem('unicar.session'));
}

function chaveFoto(identificador) {
  return `unicar.profile.photo.${identificador}`;
}

beforeEach(async () => {
  localStorage.clear();
  vi.resetModules();
  vi.stubGlobal('fetch', vi.fn());
  vi.stubEnv('VITE_API_URL', BASE_URL);
  vi.stubEnv('VITE_ENABLE_MOCKS', 'false');

  ({
    getPerfilUsuarioAutenticado,
    atualizarPerfilUsuarioAutenticado,
    excluirContaUsuarioAutenticado,
  } = await import('./profileService.js'));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('autenticação', () => {
  const chamadas = [
    ['getPerfilUsuarioAutenticado', () => getPerfilUsuarioAutenticado()],
    ['atualizarPerfilUsuarioAutenticado', () => atualizarPerfilUsuarioAutenticado({})],
    ['excluirContaUsuarioAutenticado', () => excluirContaUsuarioAutenticado()],
  ];

  it.each(chamadas)('%s rejeita sem sessão e não chama fetch', async (_nome, chamada) => {
    await expect(chamada()).rejects.toThrow('Usuário não autenticado.');
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(chamadas)(
    '%s rejeita quando a sessão não tem token',
    async (_nome, chamada) => {
      localStorage.setItem('unicar.session', JSON.stringify({ usuario: { id: 1 } }));

      await expect(chamada()).rejects.toThrow('Usuário não autenticado.');
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it.each(chamadas)(
    '%s rejeita quando a sessão é um JSON corrompido',
    async (_nome, chamada) => {
      localStorage.setItem('unicar.session', '{ não é json');

      await expect(chamada()).rejects.toThrow('Usuário não autenticado.');
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it('envia Authorization: Bearer <token> em todas as funções', async () => {
    for (const [, chamada] of chamadas) {
      localStorage.clear();
      comSessao();
      fetch.mockReset();
      fetch.mockResolvedValue(respostaJson({ id: 1 }));

      await chamada();

      const [, options] = fetch.mock.calls[0];
      expect(options.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    }
  });
});

describe('getPerfilUsuarioAutenticado — request', () => {
  beforeEach(() => {
    comSessao();
  });

  it('faz GET /usuarios/me sem body', async () => {
    fetch.mockResolvedValue(respostaJson({ id: 1, nome: 'Fulano' }));

    await getPerfilUsuarioAutenticado();

    expect(fetch).toHaveBeenCalledTimes(1);

    const [url, options] = fetch.mock.calls[0];

    expect(url).toBe(`${BASE_URL}/usuarios/me`);
    // O apiRequest não passa method: o fetch usa GET por padrão.
    expect(options.method).toBeUndefined();
    expect(options.body).toBeUndefined();
    expect(options.headers['Content-Type']).toBe('application/json');
  });
});

describe('getPerfilUsuarioAutenticado — mapeamento do perfil', () => {
  beforeEach(() => {
    comSessao();
  });

  it('mapeia os campos da API para o formato do perfil', async () => {
    fetch.mockResolvedValue(
      respostaJson({
        id: 42,
        nome: 'Fulano de Tal',
        matricula: '121110111',
        cpf: '12345678901',
        email: 'fulano@ufcg.edu.br',
        telefone: '83999999999',
        curso: 'Ciência da Computação',
        genero: 'FEMININO',
        recebeEmails: false,
        matriculaValidada: true,
        motoristaVerificado: true,
        avaliacao: 4.8,
        totalCaronas: 12,
        isBlocked: true,
      }),
    );

    const perfil = await getPerfilUsuarioAutenticado();

    expect(perfil).toEqual({
      id: 42,
      nomeCompleto: 'Fulano de Tal',
      matricula: '121110111',
      cpf: '12345678901',
      emailInstitucional: 'fulano@ufcg.edu.br',
      telefone: '83999999999',
      curso: 'Ciência da Computação',
      genero: 'Feminino',
      recebeEmails: false,
      matriculaValidada: true,
      motoristaVerificado: true,
      avaliacao: 4.8,
      totalCaronas: 12,
      isBlocked: true,
      fotoUrl: '',
    });
  });

  it('usa "Não informado" para matrícula, cpf e email ausentes', async () => {
    fetch.mockResolvedValue(respostaJson({ id: 1 }));

    const perfil = await getPerfilUsuarioAutenticado();

    expect(perfil.matricula).toBe('Não informado');
    expect(perfil.cpf).toBe('Não informado');
    expect(perfil.emailInstitucional).toBe('Não informado');
  });

  it('aplica os padrões dos campos opcionais quando a API só devolve o id', async () => {
    fetch.mockResolvedValue(respostaJson({ id: 1 }));

    const perfil = await getPerfilUsuarioAutenticado();

    expect(perfil.nomeCompleto).toBe('');
    expect(perfil.telefone).toBe('');
    expect(perfil.curso).toBe('');
    expect(perfil.genero).toBe('Não informado');
    expect(perfil.recebeEmails).toBe(true);
    expect(perfil.matriculaValidada).toBe(false);
    expect(perfil.motoristaVerificado).toBe(false);
    expect(perfil.avaliacao).toBe('');
    expect(perfil.totalCaronas).toBe('');
    expect(perfil.isBlocked).toBe(false);
  });

  it.each([
    ['usuarioId', { usuarioId: 7 }],
    ['userId', { userId: 7 }],
  ])('resolve o id a partir de %s', async (_campo, corpo) => {
    fetch.mockResolvedValue(respostaJson(corpo));

    expect((await getPerfilUsuarioAutenticado()).id).toBe(7);
  });

  it('devolve id vazio quando nenhuma variante existe', async () => {
    fetch.mockResolvedValue(respostaJson({ matricula: '121110111' }));

    expect((await getPerfilUsuarioAutenticado()).id).toBe('');
  });

  it('aceita `celular` como alias de telefone', async () => {
    fetch.mockResolvedValue(respostaJson({ id: 1, celular: '83988888888' }));

    expect((await getPerfilUsuarioAutenticado()).telefone).toBe('83988888888');
  });

  it('prefere `telefone` quando os dois vêm', async () => {
    fetch.mockResolvedValue(
      respostaJson({ id: 1, telefone: '83911111111', celular: '83922222222' }),
    );

    expect((await getPerfilUsuarioAutenticado()).telefone).toBe('83911111111');
  });

  it.each([
    ['validado', { validado: true }],
    ['verified', { verified: true }],
  ])('aceita %s como alias de matriculaValidada', async (_campo, corpo) => {
    fetch.mockResolvedValue(respostaJson({ id: 1, ...corpo }));

    expect((await getPerfilUsuarioAutenticado()).matriculaValidada).toBe(true);
  });

  it('aceita `driverVerified` como alias de motoristaVerificado', async () => {
    fetch.mockResolvedValue(respostaJson({ id: 1, driverVerified: true }));

    expect((await getPerfilUsuarioAutenticado()).motoristaVerificado).toBe(true);
  });

  it('aceita `rating` como alias de avaliacao', async () => {
    fetch.mockResolvedValue(respostaJson({ id: 1, rating: 4.2 }));

    expect((await getPerfilUsuarioAutenticado()).avaliacao).toBe(4.2);
  });

  it.each([
    ['ridesCount', { ridesCount: 3 }],
    ['quantidadeCaronas', { quantidadeCaronas: 3 }],
  ])('aceita %s como alias de totalCaronas', async (_campo, corpo) => {
    fetch.mockResolvedValue(respostaJson({ id: 1, ...corpo }));

    expect((await getPerfilUsuarioAutenticado()).totalCaronas).toBe(3);
  });

  it.each([
    ['bloqueado', { bloqueado: true }],
    ['blocked', { blocked: true }],
  ])('aceita %s como alias de isBlocked', async (_campo, corpo) => {
    fetch.mockResolvedValue(respostaJson({ id: 1, ...corpo }));

    expect((await getPerfilUsuarioAutenticado()).isBlocked).toBe(true);
  });

  // Regressão: os operadores aqui são ?? e não ||, senão um zero ou um false
  // explícito da API viraria silenciosamente o valor padrão.
  it('preserva zero em avaliacao e totalCaronas', async () => {
    fetch.mockResolvedValue(respostaJson({ id: 1, avaliacao: 0, totalCaronas: 0 }));

    const perfil = await getPerfilUsuarioAutenticado();

    expect(perfil.avaliacao).toBe(0);
    expect(perfil.totalCaronas).toBe(0);
  });

  it('preserva recebeEmails false explícito', async () => {
    fetch.mockResolvedValue(respostaJson({ id: 1, recebeEmails: false }));

    expect((await getPerfilUsuarioAutenticado()).recebeEmails).toBe(false);
  });

  it('aceita `receberEmail` como alias de recebeEmails', async () => {
    fetch.mockResolvedValue(respostaJson({ id: 1, receberEmail: false }));

    expect((await getPerfilUsuarioAutenticado()).recebeEmails).toBe(false);
  });

  describe('genero — enum da API para rótulo da UI', () => {
    it.each([
      ['FEMININO', 'Feminino'],
      ['MASCULINO', 'Masculino'],
      ['OUTRO', 'Outro'],
      ['NAO_INFORMADO', 'Não informado'],
    ])('traduz %s para %s', async (enumApi, rotulo) => {
      fetch.mockResolvedValue(respostaJson({ id: 1, genero: enumApi }));

      expect((await getPerfilUsuarioAutenticado()).genero).toBe(rotulo);
    });

    it('devolve o valor cru quando o enum é desconhecido', async () => {
      fetch.mockResolvedValue(respostaJson({ id: 1, genero: 'NAO_BINARIO' }));

      expect((await getPerfilUsuarioAutenticado()).genero).toBe('NAO_BINARIO');
    });

    it('devolve "Não informado" quando o genero vem nulo', async () => {
      fetch.mockResolvedValue(respostaJson({ id: 1, genero: null }));

      expect((await getPerfilUsuarioAutenticado()).genero).toBe('Não informado');
    });
  });
});

describe('getPerfilUsuarioAutenticado — sessão', () => {
  it('regrava a sessão com o usuário vindo da API, preservando o token', async () => {
    comSessao({ id: 1, nome: 'Nome Antigo' });
    fetch.mockResolvedValue(respostaJson({ id: 1, nome: 'Nome Novo' }));

    await getPerfilUsuarioAutenticado();

    expect(sessaoSalva().token).toBe(TOKEN);
    expect(sessaoSalva().usuario.nomeCompleto).toBe('Nome Novo');
  });

  it('não regrava a sessão quando o GET falha', async () => {
    comSessao({ id: 1, nome: 'Nome Antigo' });
    fetch.mockResolvedValue(
      respostaJson({ message: 'Erro' }, { ok: false, status: 500 }),
    );

    await expect(getPerfilUsuarioAutenticado()).rejects.toThrow('Erro');

    expect(sessaoSalva().usuario.nome).toBe('Nome Antigo');
  });
});

describe('getPerfilUsuarioAutenticado — foto de perfil', () => {
  it('usa a foto devolvida pela API', async () => {
    comSessao();
    fetch.mockResolvedValue(respostaJson({ id: 1, fotoUrl: FOTO }));

    expect((await getPerfilUsuarioAutenticado()).fotoUrl).toBe(FOTO);
  });

  it.each([
    ['fotoPerfil'],
    ['avatarUrl'],
    ['avatar'],
    ['imagemPerfil'],
    ['profileImage'],
  ])('aceita %s como alias da foto', async (campo) => {
    comSessao();
    fetch.mockResolvedValue(respostaJson({ id: 1, [campo]: FOTO }));

    expect((await getPerfilUsuarioAutenticado()).fotoUrl).toBe(FOTO);
  });

  it('aceita uma URL http como foto', async () => {
    comSessao();
    fetch.mockResolvedValue(
      respostaJson({ id: 1, fotoUrl: 'https://cdn.exemplo.com/f.png' }),
    );

    expect((await getPerfilUsuarioAutenticado()).fotoUrl).toBe(
      'https://cdn.exemplo.com/f.png',
    );
  });

  it('descarta foto que não é data:image nem http(s)', async () => {
    comSessao();
    fetch.mockResolvedValue(respostaJson({ id: 1, fotoUrl: 'javascript:alert(1)' }));

    expect((await getPerfilUsuarioAutenticado()).fotoUrl).toBe('');
  });

  it('cai na foto salva no localStorage quando a API não devolve nenhuma', async () => {
    comSessao();
    localStorage.setItem(chaveFoto(1), FOTO);
    fetch.mockResolvedValue(respostaJson({ id: 1 }));

    expect((await getPerfilUsuarioAutenticado()).fotoUrl).toBe(FOTO);
  });

  it('prefere a foto da API à foto salva no localStorage', async () => {
    comSessao();
    localStorage.setItem(chaveFoto(1), OUTRA_FOTO);
    fetch.mockResolvedValue(respostaJson({ id: 1, fotoUrl: FOTO }));

    expect((await getPerfilUsuarioAutenticado()).fotoUrl).toBe(FOTO);
  });

  it('acha a foto salva pelo identificador do usuário da sessão quando a API não manda id', async () => {
    comSessao({ id: 9 });
    localStorage.setItem(chaveFoto(9), FOTO);
    fetch.mockResolvedValue(respostaJson({ nome: 'Fulano' }));

    expect((await getPerfilUsuarioAutenticado()).fotoUrl).toBe(FOTO);
  });

  it('cai na foto que já estava na sessão quando não há nada salvo', async () => {
    comSessao({ id: 1, fotoUrl: FOTO });
    fetch.mockResolvedValue(respostaJson({ id: 1 }));

    expect((await getPerfilUsuarioAutenticado()).fotoUrl).toBe(FOTO);
  });

  it('ignora foto salva com conteúdo inválido', async () => {
    comSessao();
    localStorage.setItem(chaveFoto(1), 'foto-corrompida');
    fetch.mockResolvedValue(respostaJson({ id: 1 }));

    expect((await getPerfilUsuarioAutenticado()).fotoUrl).toBe('');
  });

  it('não vaza a foto de um usuário para outro', async () => {
    comSessao({ id: 2 });
    localStorage.setItem(chaveFoto(1), FOTO);
    fetch.mockResolvedValue(respostaJson({ id: 2 }));

    expect((await getPerfilUsuarioAutenticado()).fotoUrl).toBe('');
  });

  it('usa a matrícula como identificador quando não há id', async () => {
    comSessao({ matricula: '121110111' });
    localStorage.setItem(chaveFoto('121110111'), FOTO);
    fetch.mockResolvedValue(respostaJson({ matricula: '121110111' }));

    expect((await getPerfilUsuarioAutenticado()).fotoUrl).toBe(FOTO);
  });
});

describe('atualizarPerfilUsuarioAutenticado — request', () => {
  beforeEach(() => {
    comSessao();
  });

  it('faz PATCH /usuarios/me com Content-Type e body JSON', async () => {
    fetch.mockResolvedValue(respostaJson({ id: 1 }));

    await atualizarPerfilUsuarioAutenticado({
      genero: 'Feminino',
      recebeEmails: false,
      curso: 'Ciência da Computação',
    });

    const [url, options] = fetch.mock.calls[0];

    expect(url).toBe(`${BASE_URL}/usuarios/me`);
    expect(options.method).toBe('PATCH');
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(options.body)).toEqual({
      genero: 'FEMININO',
      receberEmail: false,
      curso: 'Ciência da Computação',
    });
  });

  // O backend usa @JsonIgnoreProperties(ignoreUnknown = false): qualquer campo
  // fora do DTO derruba o PATCH com 400.
  it('não envia campos fora do DTO, mesmo que venham no objeto', async () => {
    fetch.mockResolvedValue(respostaJson({ id: 1 }));

    await atualizarPerfilUsuarioAutenticado({
      genero: 'Masculino',
      recebeEmails: true,
      curso: 'Engenharia',
      nomeCompleto: 'Fulano',
      matricula: '121110111',
      cpf: '12345678901',
      emailInstitucional: 'fulano@ufcg.edu.br',
      telefone: '83999999999',
      fotoUrl: FOTO,
      id: 1,
    });

    expect(Object.keys(JSON.parse(fetch.mock.calls[0][1].body)).sort()).toEqual([
      'curso',
      'genero',
      'receberEmail',
    ]);
  });

  it.each([
    ['Feminino', 'FEMININO'],
    ['Masculino', 'MASCULINO'],
    ['Outro', 'OUTRO'],
    ['Não informado', 'NAO_INFORMADO'],
    ['Prefiro não informar', 'NAO_INFORMADO'],
  ])('traduz o rótulo %s para o enum %s', async (rotulo, enumApi) => {
    fetch.mockResolvedValue(respostaJson({ id: 1 }));

    await atualizarPerfilUsuarioAutenticado({ genero: rotulo });

    expect(JSON.parse(fetch.mock.calls[0][1].body).genero).toBe(enumApi);
  });

  // Comportamento atual (ver relatório): sem genero no objeto, o service manda
  // NAO_INFORMADO em vez de omitir o campo.
  it('manda NAO_INFORMADO quando o genero não é informado', async () => {
    fetch.mockResolvedValue(respostaJson({ id: 1 }));

    await atualizarPerfilUsuarioAutenticado({ curso: 'Engenharia' });

    expect(JSON.parse(fetch.mock.calls[0][1].body).genero).toBe('NAO_INFORMADO');
  });

  it('omite receberEmail e curso quando não são informados', async () => {
    fetch.mockResolvedValue(respostaJson({ id: 1 }));

    await atualizarPerfilUsuarioAutenticado({ genero: 'Outro' });

    const body = JSON.parse(fetch.mock.calls[0][1].body);

    expect(body).toEqual({ genero: 'OUTRO' });
  });
});

describe('atualizarPerfilUsuarioAutenticado — resultado e sessão', () => {
  beforeEach(() => {
    comSessao();
  });

  it('devolve o perfil já mapeado a partir da resposta da API', async () => {
    fetch.mockResolvedValue(
      respostaJson({
        id: 1,
        nome: 'Fulano de Tal',
        genero: 'MASCULINO',
        curso: 'Engenharia',
        receberEmail: false,
      }),
    );

    const perfil = await atualizarPerfilUsuarioAutenticado({
      genero: 'Masculino',
      recebeEmails: false,
      curso: 'Engenharia',
    });

    expect(perfil.nomeCompleto).toBe('Fulano de Tal');
    expect(perfil.genero).toBe('Masculino');
    expect(perfil.curso).toBe('Engenharia');
    expect(perfil.recebeEmails).toBe(false);
  });

  it('regrava a sessão com o usuário atualizado, preservando o token', async () => {
    fetch.mockResolvedValue(respostaJson({ id: 1, nome: 'Nome Novo' }));

    await atualizarPerfilUsuarioAutenticado({ genero: 'Outro', fotoUrl: FOTO });

    expect(sessaoSalva().token).toBe(TOKEN);
    expect(sessaoSalva().usuario.nomeCompleto).toBe('Nome Novo');
    expect(sessaoSalva().usuario.fotoUrl).toBe(FOTO);
  });

  it('não regrava a sessão nem mexe na foto quando o PATCH falha', async () => {
    localStorage.setItem(chaveFoto(1), FOTO);
    fetch.mockResolvedValue(
      respostaJson({ message: 'Erro' }, { ok: false, status: 400 }),
    );

    await expect(
      atualizarPerfilUsuarioAutenticado({ genero: 'Outro' }),
    ).rejects.toThrow('Erro');

    expect(localStorage.getItem(chaveFoto(1))).toBe(FOTO);
    expect(sessaoSalva().usuario.nome).toBe('Fulano');
  });
});

describe('atualizarPerfilUsuarioAutenticado — foto de perfil', () => {
  it('salva a foto nova em unicar.profile.photo.<id>', async () => {
    comSessao();
    fetch.mockResolvedValue(respostaJson({ id: 1 }));

    const perfil = await atualizarPerfilUsuarioAutenticado({
      genero: 'Outro',
      fotoUrl: FOTO,
    });

    expect(localStorage.getItem(chaveFoto(1))).toBe(FOTO);
    expect(perfil.fotoUrl).toBe(FOTO);
  });

  it('substitui a foto anterior do mesmo usuário', async () => {
    comSessao();
    localStorage.setItem(chaveFoto(1), FOTO);
    fetch.mockResolvedValue(respostaJson({ id: 1 }));

    await atualizarPerfilUsuarioAutenticado({ genero: 'Outro', fotoUrl: OUTRA_FOTO });

    expect(localStorage.getItem(chaveFoto(1))).toBe(OUTRA_FOTO);
  });

  it('remove a foto quando fotoUrl vem vazia', async () => {
    comSessao();
    localStorage.setItem(chaveFoto(1), FOTO);
    fetch.mockResolvedValue(respostaJson({ id: 1 }));

    const perfil = await atualizarPerfilUsuarioAutenticado({
      genero: 'Outro',
      fotoUrl: '',
    });

    expect(localStorage.getItem(chaveFoto(1))).toBeNull();
    expect(perfil.fotoUrl).toBe('');
  });

  it('não salva foto com conteúdo inválido', async () => {
    comSessao();
    fetch.mockResolvedValue(respostaJson({ id: 1 }));

    await atualizarPerfilUsuarioAutenticado({
      genero: 'Outro',
      fotoUrl: 'javascript:alert(1)',
    });

    expect(localStorage.getItem(chaveFoto(1))).toBeNull();
  });

  it('não toca na foto de outro usuário', async () => {
    comSessao({ id: 2 });
    localStorage.setItem(chaveFoto(1), FOTO);
    fetch.mockResolvedValue(respostaJson({ id: 2 }));

    await atualizarPerfilUsuarioAutenticado({ genero: 'Outro', fotoUrl: OUTRA_FOTO });

    expect(localStorage.getItem(chaveFoto(1))).toBe(FOTO);
    expect(localStorage.getItem(chaveFoto(2))).toBe(OUTRA_FOTO);
  });

  it('usa o identificador do usuário da sessão quando a API não devolve id', async () => {
    comSessao({ id: 9 });
    fetch.mockResolvedValue(respostaJson({ nome: 'Fulano' }));

    await atualizarPerfilUsuarioAutenticado({ genero: 'Outro', fotoUrl: FOTO });

    expect(localStorage.getItem(chaveFoto(9))).toBe(FOTO);
  });

  it('não grava foto nenhuma quando não há identificador em lugar algum', async () => {
    localStorage.setItem('unicar.session', JSON.stringify({ token: TOKEN, usuario: {} }));
    fetch.mockResolvedValue(respostaJson({}));

    await atualizarPerfilUsuarioAutenticado({ genero: 'Outro', fotoUrl: FOTO });

    const chavesDeFoto = Object.keys(localStorage).filter((chave) =>
      chave.startsWith('unicar.profile.photo.'),
    );

    expect(chavesDeFoto).toEqual([]);
  });

  // BUG (ver relatório): sem fotoUrl no objeto, salvarFotoPerfil recebe undefined
  // e APAGA a foto guardada — atualizar só o curso destrói a foto do usuário.
  it('apaga a foto salva quando fotoUrl não é informada (comportamento atual)', async () => {
    comSessao();
    localStorage.setItem(chaveFoto(1), FOTO);
    fetch.mockResolvedValue(respostaJson({ id: 1 }));

    await atualizarPerfilUsuarioAutenticado({ curso: 'Engenharia' });

    expect(localStorage.getItem(chaveFoto(1))).toBeNull();
  });

  // ...mas o perfil devolvido ainda mostra a foto que veio da sessão, então a
  // perda só aparece no próximo carregamento.
  it('ainda devolve a foto da sessão quando fotoUrl não é informada', async () => {
    comSessao({ id: 1, fotoUrl: FOTO });
    fetch.mockResolvedValue(respostaJson({ id: 1 }));

    const perfil = await atualizarPerfilUsuarioAutenticado({ curso: 'Engenharia' });

    expect(perfil.fotoUrl).toBe(FOTO);
  });
});

describe('foto de perfil — ciclo salvar/ler/remover', () => {
  it('salva pelo update, lê pelo get e remove pelo update seguinte', async () => {
    comSessao();

    fetch.mockResolvedValue(respostaJson({ id: 1 }));
    await atualizarPerfilUsuarioAutenticado({ genero: 'Outro', fotoUrl: FOTO });
    expect(localStorage.getItem(chaveFoto(1))).toBe(FOTO);

    fetch.mockResolvedValue(respostaJson({ id: 1 }));
    expect((await getPerfilUsuarioAutenticado()).fotoUrl).toBe(FOTO);

    fetch.mockResolvedValue(respostaJson({ id: 1 }));
    await atualizarPerfilUsuarioAutenticado({ genero: 'Outro', fotoUrl: '' });
    expect(localStorage.getItem(chaveFoto(1))).toBeNull();

    fetch.mockResolvedValue(respostaJson({ id: 1 }));
    expect((await getPerfilUsuarioAutenticado()).fotoUrl).toBe('');
  });
});

describe('excluirContaUsuarioAutenticado', () => {
  it('faz DELETE /usuarios/me sem body e não parseia o corpo (204)', async () => {
    comSessao();
    const resposta = respostaSemConteudo();
    fetch.mockResolvedValue(resposta);

    const resultado = await excluirContaUsuarioAutenticado();

    const [url, options] = fetch.mock.calls[0];

    expect(url).toBe(`${BASE_URL}/usuarios/me`);
    expect(options.method).toBe('DELETE');
    expect(options.body).toBeUndefined();
    expect(resposta.json).not.toHaveBeenCalled();
    expect(resultado).toBe(true);
  });

  it('limpa sessão, aceite de termos e foto do usuário', async () => {
    comSessao();
    localStorage.setItem(chaveFoto(1), FOTO);
    localStorage.setItem('unicar.terms.acceptance', JSON.stringify({ accepted: true }));
    fetch.mockResolvedValue(respostaSemConteudo());

    await excluirContaUsuarioAutenticado();

    expect(localStorage.getItem('unicar.session')).toBeNull();
    expect(localStorage.getItem('unicar.terms.acceptance')).toBeNull();
    expect(localStorage.getItem(chaveFoto(1))).toBeNull();
  });

  it('não apaga a foto de outro usuário', async () => {
    comSessao({ id: 2 });
    localStorage.setItem(chaveFoto(1), FOTO);
    localStorage.setItem(chaveFoto(2), OUTRA_FOTO);
    fetch.mockResolvedValue(respostaSemConteudo());

    await excluirContaUsuarioAutenticado();

    expect(localStorage.getItem(chaveFoto(1))).toBe(FOTO);
    expect(localStorage.getItem(chaveFoto(2))).toBeNull();
  });

  it('remove a foto pela matrícula quando a sessão não tem id', async () => {
    comSessao({ matricula: '121110111' });
    localStorage.setItem(chaveFoto('121110111'), FOTO);
    fetch.mockResolvedValue(respostaSemConteudo());

    await excluirContaUsuarioAutenticado();

    expect(localStorage.getItem(chaveFoto('121110111'))).toBeNull();
  });

  it('preserva sessão, termos e foto quando o DELETE falha', async () => {
    comSessao();
    localStorage.setItem(chaveFoto(1), FOTO);
    localStorage.setItem('unicar.terms.acceptance', JSON.stringify({ accepted: true }));
    fetch.mockResolvedValue(
      respostaJson({ message: 'Acesso negado' }, { ok: false, status: 403 }),
    );

    await expect(excluirContaUsuarioAutenticado()).rejects.toThrow('Acesso negado');

    expect(sessaoSalva().token).toBe(TOKEN);
    expect(localStorage.getItem('unicar.terms.acceptance')).not.toBeNull();
    expect(localStorage.getItem(chaveFoto(1))).toBe(FOTO);
  });
});

describe('tratamento de erro', () => {
  beforeEach(() => {
    comSessao();
  });

  it('propaga a mensagem de 400 do PATCH', async () => {
    fetch.mockResolvedValue(
      respostaJson({ message: 'Campo inválido.' }, { ok: false, status: 400 }),
    );

    await expect(
      atualizarPerfilUsuarioAutenticado({ genero: 'Outro' }),
    ).rejects.toThrow('Campo inválido.');
  });

  // Erros de validação da API vêm como { message, detalhes } e o apiRequest
  // concatena os dois.
  it('concatena message e detalhes no 400 do PATCH', async () => {
    fetch.mockResolvedValue(
      respostaJson(
        { message: 'Erro de validação.', detalhes: 'curso: Curso é obrigatório' },
        { ok: false, status: 400 },
      ),
    );

    await expect(
      atualizarPerfilUsuarioAutenticado({ genero: 'Outro' }),
    ).rejects.toThrow('Erro de validação. curso: Curso é obrigatório');
  });

  it('propaga a mensagem de 403 do GET', async () => {
    fetch.mockResolvedValue(
      respostaJson({ message: 'Acesso negado' }, { ok: false, status: 403 }),
    );

    await expect(getPerfilUsuarioAutenticado()).rejects.toThrow('Acesso negado');
  });

  it('propaga a mensagem de 404 do GET', async () => {
    fetch.mockResolvedValue(
      respostaJson({ message: 'Usuário não encontrado' }, { ok: false, status: 404 }),
    );

    await expect(getPerfilUsuarioAutenticado()).rejects.toThrow(
      'Usuário não encontrado',
    );
  });

  it('anexa o status HTTP ao erro lançado', async () => {
    fetch.mockResolvedValue(
      respostaJson({ message: 'Acesso negado' }, { ok: false, status: 403 }),
    );

    await expect(getPerfilUsuarioAutenticado()).rejects.toMatchObject({
      status: 403,
    });
  });

  it('usa mensagem genérica quando o corpo do erro não é JSON', async () => {
    fetch.mockResolvedValue(respostaSemJson({ status: 500 }));

    await expect(getPerfilUsuarioAutenticado()).rejects.toThrow(
      'Erro ao comunicar com o servidor.',
    );
  });

  it.each([
    ['getPerfilUsuarioAutenticado', () => getPerfilUsuarioAutenticado()],
    ['atualizarPerfilUsuarioAutenticado', () => atualizarPerfilUsuarioAutenticado({})],
    ['excluirContaUsuarioAutenticado', () => excluirContaUsuarioAutenticado()],
  ])('%s traduz falha de conexão em mensagem amigável', async (_nome, chamada) => {
    fetch.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(chamada()).rejects.toThrow(
      'Não foi possível conectar ao servidor. Tente novamente.',
    );
  });

  // BUG (ver relatório): um 200 sem corpo JSON faz o apiRequest devolver null e
  // o normalizeUsuario estoura, em vez de um erro tratado.
  it('estoura TypeError quando o GET responde 200 sem corpo JSON', async () => {
    fetch.mockResolvedValue(respostaSemJson({ status: 200, ok: true }));

    await expect(getPerfilUsuarioAutenticado()).rejects.toThrow(TypeError);
  });
});
