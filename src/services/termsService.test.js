import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const STORAGE_KEY = 'unicar.terms.acceptance';

// Versão vigente dos termos. Se este teste quebrar porque a constante do
// service mudou, a quebra é intencional: bumpar a versão invalida todos os
// aceites anteriores e é isso que o describe "gate de versão" trava.
const VERSAO_ATUAL = '1.1';

let hasAcceptedTerms;
let acceptTerms;
let getTermsVersion;

function aceiteSalvo() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY));
}

beforeEach(async () => {
  localStorage.clear();
  vi.resetModules();
  vi.stubGlobal('fetch', vi.fn());

  ({ hasAcceptedTerms, acceptTerms, getTermsVersion } = await import(
    './termsService.js'
  ));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('getTermsVersion', () => {
  it('devolve a versão vigente dos termos', () => {
    expect(getTermsVersion()).toBe(VERSAO_ATUAL);
  });
});

describe('hasAcceptedTerms', () => {
  it('é falso quando não há aceite gravado', () => {
    expect(hasAcceptedTerms()).toBe(false);
  });

  it('é verdadeiro com um aceite válido da versão vigente', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ accepted: true, version: VERSAO_ATUAL }),
    );

    expect(hasAcceptedTerms()).toBe(true);
  });

  it('é falso quando accepted é false', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ accepted: false, version: VERSAO_ATUAL }),
    );

    expect(hasAcceptedTerms()).toBe(false);
  });

  it('é falso quando accepted não existe', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: VERSAO_ATUAL }),
    );

    expect(hasAcceptedTerms()).toBe(false);
  });

  it('não faz nenhuma chamada de rede', () => {
    hasAcceptedTerms();

    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('hasAcceptedTerms — gate de versão', () => {
  // O ponto central do service: o RequireAuthAndTerms do App.jsx usa isto para
  // barrar a navegação. Bumpar TERMS_VERSION tem que invalidar todo aceite
  // antigo, senão o usuário nunca vê os termos novos.
  it('invalida aceite de uma versão anterior', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ accepted: true, version: '1.0' }),
    );

    expect(hasAcceptedTerms()).toBe(false);
  });

  it('invalida aceite de uma versão futura', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ accepted: true, version: '2.0' }),
    );

    expect(hasAcceptedTerms()).toBe(false);
  });

  it('invalida aceite sem versão nenhuma', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ accepted: true }));

    expect(hasAcceptedTerms()).toBe(false);
  });

  it('exige a versão como string, não número', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ accepted: true, version: 1.1 }),
    );

    expect(hasAcceptedTerms()).toBe(false);
  });
});

describe('hasAcceptedTerms — dado corrompido', () => {
  it('é falso quando o aceite é um JSON corrompido', () => {
    localStorage.setItem(STORAGE_KEY, '{ não é json');

    expect(hasAcceptedTerms()).toBe(false);
  });

  it('é falso quando o aceite é o literal null', () => {
    localStorage.setItem(STORAGE_KEY, 'null');

    expect(hasAcceptedTerms()).toBe(false);
  });

  it('é falso quando o aceite é uma string solta', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify('sim'));

    expect(hasAcceptedTerms()).toBe(false);
  });

  it('é falso quando o aceite é um array', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));

    expect(hasAcceptedTerms()).toBe(false);
  });

  // Regressão: a comparação é `accepted === true`, não um truthy check.
  // Um 'true' string vindo de storage legado não pode valer como aceite.
  it('é falso quando accepted é a string "true"', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ accepted: 'true', version: VERSAO_ATUAL }),
    );

    expect(hasAcceptedTerms()).toBe(false);
  });

  it('é falso quando accepted é o número 1', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ accepted: 1, version: VERSAO_ATUAL }),
    );

    expect(hasAcceptedTerms()).toBe(false);
  });
});

describe('acceptTerms', () => {
  it('grava o aceite na versão vigente', () => {
    acceptTerms();

    expect(aceiteSalvo()).toMatchObject({
      accepted: true,
      version: VERSAO_ATUAL,
    });
  });

  it('devolve o aceite que gravou', () => {
    const aceite = acceptTerms();

    expect(aceite).toEqual(aceiteSalvo());
  });

  it('carimba acceptedAt com um ISO válido', () => {
    const aceite = acceptTerms();

    expect(aceite.acceptedAt).toEqual(expect.any(String));
    expect(Number.isNaN(Date.parse(aceite.acceptedAt))).toBe(false);
  });

  it('faz o hasAcceptedTerms passar a valer', () => {
    expect(hasAcceptedTerms()).toBe(false);

    acceptTerms();

    expect(hasAcceptedTerms()).toBe(true);
  });

  it('sobrescreve um aceite de versão antiga', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ accepted: true, version: '1.0' }),
    );

    acceptTerms();

    expect(aceiteSalvo().version).toBe(VERSAO_ATUAL);
    expect(hasAcceptedTerms()).toBe(true);
  });

  it('grava exatamente a versão que o getTermsVersion anuncia', () => {
    acceptTerms();

    expect(aceiteSalvo().version).toBe(getTermsVersion());
  });

  it('não faz nenhuma chamada de rede', () => {
    acceptTerms();

    expect(fetch).not.toHaveBeenCalled();
  });
});
