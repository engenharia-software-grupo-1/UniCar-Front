import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const BASE_URL = 'http://localhost:8080';
const TOKEN = 'token-simulado';

let login;
let logout;
let getSession;
let isAuthenticated;
let normalizeUsuario;

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

function sessaoSalva() {
  // A sessão agora é gravada em sessionStorage (sessionStore.saveSession);
  // o localStorage só é lido como fallback legado.
  return JSON.parse(sessionStorage.getItem('unicar.session'));
}

beforeEach(async () => {
  localStorage.clear();
  sessionStorage.clear();
  vi.resetModules();
  vi.stubGlobal('fetch', vi.fn());
  vi.stubEnv('VITE_API_URL', BASE_URL);
  vi.stubEnv('VITE_ENABLE_MOCKS', 'false');

  ({ login, logout, getSession, isAuthenticated, normalizeUsuario } =
    await import('./authService.js'));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('login — validação de entrada', () => {
  it('rejeita sem identificação e não chama fetch', async () => {
    await expect(login({ senha: 'segredo' })).rejects.toThrow(
      'Informe matrícula e senha institucional.',
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejeita sem senha e não chama fetch', async () => {
    await expect(login({ matricula: '121110111' })).rejects.toThrow(
      'Informe matrícula e senha institucional.',
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejeita quando a matrícula é só espaço em branco', async () => {
    await expect(login({ matricula: '   ', senha: 'segredo' })).rejects.toThrow(
      'Informe matrícula e senha institucional.',
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejeita quando chamado sem argumento nenhum', async () => {
    await expect(login({})).rejects.toThrow(
      'Informe matrícula e senha institucional.',
    );
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('login — chamada à API', () => {
  it('faz POST /auth/login enviando usuario e senha', async () => {
    fetch.mockResolvedValue(
      respostaJson({ token: TOKEN, usuario: { nome: 'Fulano' } }),
    );

    await login({ matricula: '121110111', senha: 'segredo' });

    expect(fetch).toHaveBeenCalledTimes(1);

    const [url, options] = fetch.mock.calls[0];

    expect(url).toBe(`${BASE_URL}/auth/login`);
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({
      usuario: '121110111',
      senha: 'segredo',
    });
  });

  it('aceita `usuario` como alias de `matricula`', async () => {
    fetch.mockResolvedValue(respostaJson({ token: TOKEN, usuario: {} }));

    await login({ usuario: '121110111', senha: 'segredo' });

    expect(JSON.parse(fetch.mock.calls[0][1].body).usuario).toBe('121110111');
  });

  it('remove espaços em volta da identificação antes de enviar', async () => {
    fetch.mockResolvedValue(respostaJson({ token: TOKEN, usuario: {} }));

    await login({ matricula: '  121110111  ', senha: 'segredo' });

    expect(JSON.parse(fetch.mock.calls[0][1].body).usuario).toBe('121110111');
  });

  it('propaga a mensagem da API quando as credenciais são inválidas', async () => {
    fetch.mockResolvedValue(
      respostaJson(
        { message: 'Matrícula ou senha inválida.' },
        { ok: false, status: 401 },
      ),
    );

    await expect(
      login({ matricula: '121110111', senha: 'errada' }),
    ).rejects.toThrow('Matrícula ou senha inválida.');

    expect(sessionStorage.getItem('unicar.session')).toBeNull();
  });

  it('usa mensagem genérica quando o corpo do erro não é JSON', async () => {
    fetch.mockResolvedValue(respostaSemJson({ status: 500 }));

    await expect(
      login({ matricula: '121110111', senha: 'segredo' }),
    ).rejects.toThrow('Erro ao comunicar com o servidor.');
  });

  it('traduz falha de conexão em mensagem amigável', async () => {
    fetch.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(
      login({ matricula: '121110111', senha: 'segredo' }),
    ).rejects.toThrow('Não foi possível conectar ao servidor. Tente novamente.');
  });

  it('rejeita quando a resposta vem sem token e não grava sessão', async () => {
    fetch.mockResolvedValue(respostaJson({ usuario: { nome: 'Fulano' } }));

    await expect(
      login({ matricula: '121110111', senha: 'segredo' }),
    ).rejects.toThrow('Resposta de autenticação inválida.');

    expect(sessionStorage.getItem('unicar.session')).toBeNull();
  });

  it('rejeita quando a resposta é nula', async () => {
    fetch.mockResolvedValue(respostaJson(null));

    await expect(
      login({ matricula: '121110111', senha: 'segredo' }),
    ).rejects.toThrow('Resposta de autenticação inválida.');
  });
});

describe('login — persistência da sessão', () => {
  it('grava a sessão normalizada em sessionStorage', async () => {
    fetch.mockResolvedValue(
      respostaJson({
        token: TOKEN,
        usuario: { nome: 'Fulano de Tal', email: 'fulano@ufcg.edu.br' },
      }),
    );

    const sessao = await login({ matricula: '121110111', senha: 'segredo' });

    expect(sessao.token).toBe(TOKEN);
    expect(sessao.usuario.nomeCompleto).toBe('Fulano de Tal');
    expect(sessao.usuario.emailInstitucional).toBe('fulano@ufcg.edu.br');
    expect(sessaoSalva()).toEqual(sessao);
  });

  it('usa a identificação do login como matrícula quando a API não devolve uma', async () => {
    fetch.mockResolvedValue(respostaJson({ token: TOKEN, usuario: {} }));

    const sessao = await login({ matricula: '121110111', senha: 'segredo' });

    expect(sessao.usuario.matricula).toBe('121110111');
  });

  it('carimba authenticatedAt com um ISO válido', async () => {
    fetch.mockResolvedValue(respostaJson({ token: TOKEN, usuario: {} }));

    const sessao = await login({ matricula: '121110111', senha: 'segredo' });

    expect(sessao.authenticatedAt).toEqual(expect.any(String));
    expect(Number.isNaN(Date.parse(sessao.authenticatedAt))).toBe(false);
  });

  it('preserva campos extras devolvidos pela API', async () => {
    fetch.mockResolvedValue(
      respostaJson({ token: TOKEN, usuario: {}, refreshToken: 'refresh-123' }),
    );

    const sessao = await login({ matricula: '121110111', senha: 'segredo' });

    expect(sessao.refreshToken).toBe('refresh-123');
  });
});

describe('login — modo mockado (VITE_ENABLE_MOCKS)', () => {
  it('devolve sessão simulada sem tocar na rede', async () => {
    vi.stubEnv('VITE_ENABLE_MOCKS', 'true');

    const sessao = await login({ matricula: '121110111', senha: 'qualquer' });

    expect(fetch).not.toHaveBeenCalled();
    expect(sessao.token).toBe('mocked-unicar-token');
    expect(sessao.usuario.matricula).toBe('121110111');
    expect(sessao.usuario.emailInstitucional).toBe(
      '121110111@academico.ufcg.edu.br',
    );
    expect(sessaoSalva().token).toBe('mocked-unicar-token');
  });

  it('continua exigindo matrícula e senha mesmo mockado', async () => {
    vi.stubEnv('VITE_ENABLE_MOCKS', 'true');

    await expect(login({ matricula: '121110111' })).rejects.toThrow(
      'Informe matrícula e senha institucional.',
    );
  });
});

describe('logout', () => {
  it('limpa a sessão do localStorage e do sessionStorage', async () => {
    localStorage.setItem('unicar.session', JSON.stringify({ token: TOKEN }));
    sessionStorage.setItem('unicar.session', JSON.stringify({ token: TOKEN }));

    await logout();

    expect(localStorage.getItem('unicar.session')).toBeNull();
    expect(sessionStorage.getItem('unicar.session')).toBeNull();
  });

  it('não quebra quando não há sessão', async () => {
    await expect(logout()).resolves.toBeUndefined();
  });
});

describe('getSession', () => {
  it('devolve null quando não há sessão', () => {
    expect(getSession()).toBeNull();
  });

  it('devolve null quando a sessão é um JSON corrompido', () => {
    localStorage.setItem('unicar.session', '{ não é json');

    expect(getSession()).toBeNull();
  });

  it('devolve null quando a sessão não tem token', () => {
    localStorage.setItem('unicar.session', JSON.stringify({ usuario: {} }));

    expect(getSession()).toBeNull();
  });

  it('normaliza o usuário da sessão armazenada', () => {
    localStorage.setItem(
      'unicar.session',
      JSON.stringify({ token: TOKEN, usuario: { nome: 'Fulano' } }),
    );

    expect(getSession().usuario.nomeCompleto).toBe('Fulano');
  });

  it('tolera sessão sem o campo usuario', () => {
    localStorage.setItem('unicar.session', JSON.stringify({ token: TOKEN }));

    const sessao = getSession();

    expect(sessao.token).toBe(TOKEN);
    expect(sessao.usuario.nomeCompleto).toBe('');
  });
});

describe('isAuthenticated', () => {
  it('é falso sem sessão', () => {
    expect(isAuthenticated()).toBe(false);
  });

  it('é falso quando a sessão está corrompida', () => {
    localStorage.setItem('unicar.session', '{ não é json');

    expect(isAuthenticated()).toBe(false);
  });

  it('é falso quando a sessão não tem token', () => {
    localStorage.setItem('unicar.session', JSON.stringify({ usuario: {} }));

    expect(isAuthenticated()).toBe(false);
  });

  it('é verdadeiro com uma sessão válida', () => {
    localStorage.setItem('unicar.session', JSON.stringify({ token: TOKEN }));

    expect(isAuthenticated()).toBe(true);
  });
});

describe('normalizeUsuario', () => {
  it('devolve campos vazios quando chamado sem usuário', () => {
    expect(normalizeUsuario()).toEqual({
      nomeCompleto: '',
      matricula: '',
      emailInstitucional: '',
      curso: '',
      recebeEmails: true,
    });
  });

  it('aceita `nome` como alias de `nomeCompleto`', () => {
    expect(normalizeUsuario({ nome: 'Fulano' }).nomeCompleto).toBe('Fulano');
  });

  it('prefere `nomeCompleto` quando os dois vêm', () => {
    expect(
      normalizeUsuario({ nomeCompleto: 'Oficial', nome: 'Apelido' })
        .nomeCompleto,
    ).toBe('Oficial');
  });

  it('aceita `usuario` como alias de `matricula`', () => {
    expect(normalizeUsuario({ usuario: '121110111' }).matricula).toBe(
      '121110111',
    );
  });

  it('cai na identificação quando não há matrícula nem usuario', () => {
    expect(normalizeUsuario({}, '121110111').matricula).toBe('121110111');
  });

  it('aceita `email` como alias de `emailInstitucional`', () => {
    expect(normalizeUsuario({ email: 'f@ufcg.edu.br' }).emailInstitucional).toBe(
      'f@ufcg.edu.br',
    );
  });

  it('preserva campos desconhecidos do usuário', () => {
    expect(normalizeUsuario({ telefone: '83999999999' }).telefone).toBe(
      '83999999999',
    );
  });

  describe('curso — cadeia de fallbacks do Eureca', () => {
    it.each([
      ['curso', { curso: 'Ciência da Computação' }],
      ['nomeCurso', { nomeCurso: 'Ciência da Computação' }],
      ['nomeDoCurso', { nomeDoCurso: 'Ciência da Computação' }],
      ['programa', { programa: 'Ciência da Computação' }],
      ['attributes.curso', { attributes: { curso: 'Ciência da Computação' } }],
      [
        'attributes.nomeCurso',
        { attributes: { nomeCurso: 'Ciência da Computação' } },
      ],
      [
        'attributes.nomeDoCurso',
        { attributes: { nomeDoCurso: 'Ciência da Computação' } },
      ],
      [
        'attributes.programa',
        { attributes: { programa: 'Ciência da Computação' } },
      ],
    ])('resolve o curso a partir de %s', (_campo, usuario) => {
      expect(normalizeUsuario(usuario).curso).toBe('Ciência da Computação');
    });

    it('devolve string vazia quando nenhuma variante existe', () => {
      expect(normalizeUsuario({ attributes: {} }).curso).toBe('');
    });
  });

  describe('recebeEmails', () => {
    it('assume true quando o campo não vem', () => {
      expect(normalizeUsuario({}).recebeEmails).toBe(true);
    });

    // Regressão: o operador aqui é ?? e não ||, senão um opt-out explícito
    // viraria silenciosamente opt-in.
    it('preserva false explícito', () => {
      expect(normalizeUsuario({ recebeEmails: false }).recebeEmails).toBe(false);
    });

    it('aceita `receberEmail` como alias', () => {
      expect(normalizeUsuario({ receberEmail: false }).recebeEmails).toBe(false);
    });

    it('prefere `recebeEmails` quando os dois vêm', () => {
      expect(
        normalizeUsuario({ recebeEmails: true, receberEmail: false })
          .recebeEmails,
      ).toBe(true);
    });
  });
});
