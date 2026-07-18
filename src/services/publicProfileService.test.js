import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let obterPerfilPublicoUsuario;

beforeEach(async () => {
  localStorage.clear();
  vi.resetModules();
  // O serviço é mock-only: o fetch fica stubado só para provar que ninguém o chama.
  vi.stubGlobal('fetch', vi.fn());

  ({ obterPerfilPublicoUsuario } = await import('./publicProfileService.js'));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('contrato offline', () => {
  it('não toca na rede ao buscar um perfil existente', async () => {
    await obterPerfilPublicoUsuario('marina');

    expect(fetch).not.toHaveBeenCalled();
  });

  it('não toca na rede nem quando o perfil não existe', async () => {
    await expect(obterPerfilPublicoUsuario('ninguem')).resolves.toMatchObject({
      nome: 'Usuário UniCar',
    });

    expect(fetch).not.toHaveBeenCalled();
  });

  it('não exige sessão: funciona com o localStorage vazio', async () => {
    await expect(obterPerfilPublicoUsuario('marina')).resolves.toMatchObject({
      id: 'marina',
    });

    expect(localStorage.length).toBe(0);
  });
});

describe('obterPerfilPublicoUsuario — busca por id', () => {
  it.each([
    ['marina', 'Marina Souza'],
    ['beatriz', 'Beatriz Lima'],
    ['rafael', 'Rafael Costa'],
    ['ana', 'Ana Paula'],
  ])('encontra o perfil %s', async (id, nome) => {
    const perfil = await obterPerfilPublicoUsuario(id);

    expect(perfil.id).toBe(id);
    expect(perfil.nome).toBe(nome);
  });

  it('encontra o novo perfil ana-clara', async () => {
    const perfil = await obterPerfilPublicoUsuario('ana-clara');

    expect(perfil).toMatchObject({ id: 'ana-clara', nome: 'Ana Clara' });
  });

  it('devolve o shape que a página PerfilPublico consome', async () => {
    const perfil = await obterPerfilPublicoUsuario('marina');

    expect(perfil).toEqual({
      id: 'marina',
      nome: 'Marina Souza',
      curso: 'Eng. Computação',
      instituicao: 'UFCG',
      verificado: true,
      avaliacao: 4.9,
      totalCaronas: 24,
      membroDesde: 2023,
      biografia: expect.any(String),
      avaliacoes: expect.any(Array),
    });
  });

  it('os tipos dos campos batem em todos os perfis', async () => {
    for (const id of ['marina', 'beatriz', 'rafael', 'ana']) {
      const perfil = await obterPerfilPublicoUsuario(id);

      expect(perfil).toMatchObject({
        id: expect.any(String),
        nome: expect.any(String),
        curso: expect.any(String),
        instituicao: expect.any(String),
        verificado: expect.any(Boolean),
        avaliacao: expect.any(Number),
        totalCaronas: expect.any(Number),
        membroDesde: expect.any(Number),
        biografia: expect.any(String),
      });
      expect(Array.isArray(perfil.avaliacoes)).toBe(true);
    }
  });

  it('cada avaliação tem o shape que a página renderiza', async () => {
    const perfil = await obterPerfilPublicoUsuario('marina');

    expect(perfil.avaliacoes).toHaveLength(3);

    for (const avaliacao of perfil.avaliacoes) {
      expect(avaliacao).toEqual({
        id: expect.any(Number),
        autor: expect.any(String),
        nota: expect.any(Number),
        comentario: expect.any(String),
        data: expect.any(String),
      });
      expect(avaliacao.nota).toBeGreaterThanOrEqual(1);
      expect(avaliacao.nota).toBeLessThanOrEqual(5);
    }
  });

  // A página faz `perfil.avaliacoes.map(...)` sem guarda: a lista nunca pode faltar.
  it('nenhum perfil vem sem lista de avaliações', async () => {
    for (const id of ['marina', 'beatriz', 'rafael', 'ana']) {
      const perfil = await obterPerfilPublicoUsuario(id);

      expect(perfil.avaliacoes.length).toBeGreaterThan(0);
    }
  });

  it('a nota média fica na escala de 0 a 5', async () => {
    for (const id of ['marina', 'beatriz', 'rafael', 'ana']) {
      const perfil = await obterPerfilPublicoUsuario(id);

      expect(perfil.avaliacao).toBeGreaterThanOrEqual(0);
      expect(perfil.avaliacao).toBeLessThanOrEqual(5);
    }
  });
});

describe('obterPerfilPublicoUsuario — normalização do id', () => {
  it.each([
    ['1', 'marina'],
    ['marina-souza', 'marina'],
    ['2', 'beatriz'],
    ['beatriz-lima', 'beatriz'],
    ['3', 'rafael'],
    ['rafael-costa', 'rafael'],
    ['4', 'ana'],
    ['ana-paula', 'ana'],
  ])('resolve o alias %s para o perfil %s', async (alias, esperado) => {
    expect((await obterPerfilPublicoUsuario(alias)).id).toBe(esperado);
  });

  it('aceita id numérico além da string', async () => {
    expect((await obterPerfilPublicoUsuario(1)).id).toBe('marina');
  });

  it('ignora caixa alta', async () => {
    expect((await obterPerfilPublicoUsuario('MARINA')).id).toBe('marina');
    expect((await obterPerfilPublicoUsuario('Marina-Souza')).id).toBe('marina');
  });

  it('ignora espaços em volta', async () => {
    expect((await obterPerfilPublicoUsuario('  marina  ')).id).toBe('marina');
  });

  it('combina espaços e caixa alta', async () => {
    expect((await obterPerfilPublicoUsuario('  ANA-PAULA ')).id).toBe('ana');
  });
});

describe('obterPerfilPublicoUsuario — id desconhecido devolve perfil genérico', () => {
  const ANO_ATUAL = new Date().getFullYear();

  // Mudança de comportamento: um id fora do mock não lança mais; devolve um
  // perfil público genérico e gracioso, para o link sempre abrir uma página
  // válida em vez de um erro.
  it('devolve o perfil genérico completo para um id desconhecido, sem lançar', async () => {
    const perfil = await obterPerfilPublicoUsuario('ninguem');

    expect(perfil).toEqual({
      id: 'ninguem',
      nome: 'Usuário UniCar',
      curso: 'Comunidade UniCar',
      instituicao: 'UFCG',
      verificado: false,
      avaliacao: 0,
      totalCaronas: 0,
      membroDesde: ANO_ATUAL,
      biografia: 'Membro da comunidade UniCar.',
      avaliacoes: [],
    });
  });

  it.each([
    ['undefined', undefined, 'undefined'],
    ['null', null, 'null'],
    ['string vazia', '', ''],
    ['só espaços', '   ', '   '],
    ['zero', 0, '0'],
    ['id numérico fora da tabela', 99, '99'],
    ['objeto', {}, '[object Object]'],
    ['array vazio', [], ''],
  ])('devolve o genérico para id inválido: %s', async (_rotulo, id, esperado) => {
    const perfil = await obterPerfilPublicoUsuario(id);

    expect(perfil.nome).toBe('Usuário UniCar');
    expect(perfil.id).toBe(esperado);
  });

  it('devolve o genérico quando chamada sem argumento', async () => {
    expect((await obterPerfilPublicoUsuario()).nome).toBe('Usuário UniCar');
  });

  // Regressão de segurança: a tabela de aliases é um objeto literal, então chaves
  // herdadas do Object.prototype não podem vazar o construtor nem o protótipo.
  // Antes elas escapavam; agora caem no perfil genérico ('Usuário UniCar'), o que
  // prova que nada do prototype é devolvido.
  it.each(['constructor', 'toString', 'hasOwnProperty', '__proto__'])(
    'não vaza propriedade herdada do prototype: %s',
    async (id) => {
      const perfil = await obterPerfilPublicoUsuario(id);

      expect(perfil.nome).toBe('Usuário UniCar');
      expect(perfil.avaliacoes).toEqual([]);
      expect(typeof perfil).toBe('object');
    },
  );

  it('nunca lança para um id desconhecido', async () => {
    await expect(obterPerfilPublicoUsuario('ninguem')).resolves.toBeInstanceOf(
      Object,
    );
  });

  // A página faz `perfil.avaliacoes.map(...)`: o genérico precisa trazer a lista.
  it('o perfil genérico sempre traz uma lista de avaliações vazia', async () => {
    const perfil = await obterPerfilPublicoUsuario('ninguem');

    expect(Array.isArray(perfil.avaliacoes)).toBe(true);
    expect(perfil.avaliacoes).toHaveLength(0);
  });
});

describe('obterPerfilPublicoUsuario — identidade do objeto', () => {
  // Comportamento ATUAL: devolve a referência do store mockado, sem copiar. Ver relatório.
  it('devolve sempre a mesma referência do mock', async () => {
    const primeiro = await obterPerfilPublicoUsuario('marina');
    const segundo = await obterPerfilPublicoUsuario('1');

    expect(segundo).toBe(primeiro);
  });

  it('mutar o perfil devolvido contamina a busca seguinte', async () => {
    const perfil = await obterPerfilPublicoUsuario('marina');
    perfil.nome = 'Adulterado';

    expect((await obterPerfilPublicoUsuario('marina')).nome).toBe('Adulterado');

    perfil.nome = 'Marina Souza';
  });
});
