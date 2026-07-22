import { afterEach, describe, it, expect, vi } from 'vitest';
import {
  buscarSugestoesEndereco,
  round2HalfUp,
  calcularDistanciaKm,
  calcularTetoContribuicao,
  contribuicaoMaxima,
} from './geocodingService.js';

afterEach(() => {
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});

describe('buscarSugestoesEndereco — abrangência nacional', () => {
  it('pesquisa em todo o Brasil sem fixar Campina Grande', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [{
        display_name: 'Avenida Paulista, São Paulo, São Paulo, Brasil',
        lat: '-23.5614',
        lon: '-46.6559',
      }],
    });

    const resultados = await buscarSugestoesEndereco('Avenida Paulista');
    const url = new URL(fetchMock.mock.calls[0][0]);

    expect(url.searchParams.get('q')).toBe('Avenida Paulista, Brasil');
    expect(url.searchParams.get('countrycodes')).toBe('br');
    expect(url.searchParams.get('addressdetails')).toBe('1');
    expect(url.searchParams.get('q')).not.toContain('Campina Grande');
    expect(resultados[0]).toEqual({
      descricao: 'Avenida Paulista, São Paulo, São Paulo, Brasil',
      latitude: -23.5614,
      longitude: -46.6559,
    });
  });
});

// Coordenadas reais de Campina Grande usadas para conferir contra o backend.
const BODOCONGO = { latitude: -7.2166, longitude: -35.9095 };
const CATOLE = { latitude: -7.25, longitude: -35.87 };
const UFCG = { latitude: -7.2138, longitude: -35.9092 };

describe('round2HalfUp — espelha BigDecimal.setScale(2, HALF_UP)', () => {
  it('arredonda a 3ª casa para cima nos empates (HALF_UP)', () => {
    expect(round2HalfUp(5.735)).toBe(5.74);
    expect(round2HalfUp(0.005)).toBe(0.01);
    expect(round2HalfUp(15.005)).toBe(15.01);
  });

  it('mantém valores já com 2 casas ou menos', () => {
    expect(round2HalfUp(5.73)).toBe(5.73);
    expect(round2HalfUp(0.31)).toBe(0.31);
    expect(round2HalfUp(6)).toBe(6);
  });

  it('trunca abaixo do meio', () => {
    expect(round2HalfUp(5.734)).toBe(5.73);
    expect(round2HalfUp(0.004)).toBe(0);
  });
});

describe('calcularDistanciaKm — Haversine idêntico ao backend', () => {
  it('reproduz as distâncias que a API retorna nas mensagens de erro', () => {
    // Valores conferidos contra o backend rodando: 5,73 km e 0,31 km.
    expect(calcularDistanciaKm(BODOCONGO, CATOLE)).toBe(5.73);
    expect(calcularDistanciaKm(BODOCONGO, UFCG)).toBe(0.31);
  });

  it('é zero quando origem e destino coincidem', () => {
    expect(calcularDistanciaKm(BODOCONGO, BODOCONGO)).toBe(0);
  });
});

describe('calcularTetoContribuicao — distância × fator (1,00)', () => {
  it('teto igual à distância com o fator padrão', () => {
    expect(calcularTetoContribuicao(BODOCONGO, CATOLE)).toBe(5.73);
    expect(calcularTetoContribuicao(BODOCONGO, UFCG)).toBe(0.31);
  });
});

describe('contribuicaoMaxima — maior múltiplo de 0,50 <= teto', () => {
  it('fica abaixo do teto quando ele é quebrado', () => {
    expect(contribuicaoMaxima(5.73)).toBe(5.5);
    expect(contribuicaoMaxima(15.01)).toBe(15);
  });

  it('bate exatamente em múltiplos de 0,50', () => {
    expect(contribuicaoMaxima(15)).toBe(15);
    expect(contribuicaoMaxima(1)).toBe(1);
  });

  it('zera em trajetos curtos demais', () => {
    expect(contribuicaoMaxima(0.31)).toBe(0);
    expect(contribuicaoMaxima(0.49)).toBe(0);
    expect(contribuicaoMaxima(0)).toBe(0);
  });
});
