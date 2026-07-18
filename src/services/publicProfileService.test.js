import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let obterPerfilPublicoUsuario;
const BASE_URL = 'http://localhost:8080';

function respostaJson(data) {
  return {
    ok: true,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: vi.fn().mockResolvedValue(data),
  };
}

beforeEach(async () => {
  vi.resetModules();
  vi.stubEnv('VITE_ENABLE_MOCKS', 'false');
  vi.stubGlobal('fetch', vi.fn());
  ({ obterPerfilPublicoUsuario } = await import('./publicProfileService.js'));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('obterPerfilPublicoUsuario', () => {
  it('consulta o perfil público pelo id real do usuário', async () => {
    fetch.mockResolvedValue(respostaJson({
      id: 42,
      nome: 'Ana Silva',
      curso: 'Computação',
      reputacao: 4.8,
    }));

    await expect(obterPerfilPublicoUsuario(42)).resolves.toMatchObject({
      id: 42,
      nome: 'Ana Silva',
      curso: 'Computação',
      avaliacao: 4.8,
    });
    expect(fetch).toHaveBeenCalledWith(
      `${BASE_URL}/usuarios/42/perfil-publico`,
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });

  it('exibe o curso quando a API o retorna como nomeCurso', async () => {
    fetch.mockResolvedValue(respostaJson({
      id: 42,
      nome: 'Ana Silva',
      nomeCurso: 'Engenharia de Computação',
    }));

    await expect(obterPerfilPublicoUsuario(42)).resolves.toMatchObject({
      curso: 'Engenharia de Computação',
    });
  });

  it('codifica o identificador antes de montar a URL', async () => {
    fetch.mockResolvedValue(respostaJson({ id: 1, nome: 'Ana' }));

    await obterPerfilPublicoUsuario('1/2');

    expect(fetch).toHaveBeenCalledWith(
      `${BASE_URL}/usuarios/1%2F2/perfil-publico`,
      expect.any(Object),
    );
  });
});
