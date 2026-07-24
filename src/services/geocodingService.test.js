import { afterEach, describe, it, expect, vi } from 'vitest';
import {
  buscarSugestoesEndereco,
  round2HalfUp,
  calcularDistanciaKm,
  calcularValorSugeridoContribuicao,
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

describe('calcularValorSugeridoContribuicao — custo total do trajeto', () => {
  it('divide o custo pela ocupação estimada das vagas mais o motorista', () => {
    expect(calcularValorSugeridoContribuicao(BODOCONGO, CATOLE, 3)).toBe(0.96);
    expect(calcularValorSugeridoContribuicao(BODOCONGO, UFCG, 3)).toBe(0.05);
  });

  it('soma os pedágios ao custo de combustível', () => {
    expect(calcularValorSugeridoContribuicao(BODOCONGO, CATOLE, 3, 10)).toBe(4.29);
  });
});

describe('calcularTetoContribuicao — valor sugerido com margem de 15%', () => {
  it('aplica a margem máxima sobre o custo total estimado', () => {
    expect(calcularTetoContribuicao(BODOCONGO, CATOLE, 3)).toBe(1.1);
    expect(calcularTetoContribuicao(BODOCONGO, UFCG, 3)).toBe(0.06);
  });
});

describe('contribuicaoMaxima — permite alcançar o teto em centavos', () => {
  it('preserva tetos com duas casas decimais', () => {
    expect(contribuicaoMaxima(5.73)).toBe(5.73);
    expect(contribuicaoMaxima(15.01)).toBe(15.01);
  });

  it('preserva valores inteiros', () => {
    expect(contribuicaoMaxima(15)).toBe(15);
    expect(contribuicaoMaxima(1)).toBe(1);
  });

  it('aceita valores positivos menores que cinquenta centavos', () => {
    expect(contribuicaoMaxima(0.31)).toBe(0.31);
    expect(contribuicaoMaxima(0.49)).toBe(0.49);
    expect(contribuicaoMaxima(0)).toBe(0);
  });
});
