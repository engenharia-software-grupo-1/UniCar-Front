import { beforeEach, describe, expect, it } from 'vitest';
import {
  cancelarCarona,
  criarCarona,
  listarMinhasCaronas,
  obterCarona,
  removerReservaCarona,
} from './caronaService.js';

beforeEach(() => {
  localStorage.setItem(
    'unicar.session',
    JSON.stringify({ token: 'token-simulado', usuario: { nome: 'Motorista' } }),
  );
});

const CARONA_VALIDA = {
  veiculoId: 1,
  origem: 'Bodocongó',
  destino: 'UFCG',
  pontoEncontro: 'Portão principal',
  dataHoraSaida: '2026-08-25T07:00:00',
  quantidadeVagas: 4,
  valorContribuicao: 5,
};

describe('POST /caronas', () => {
  it('cria com 201 e devolve a lista das caronas criadas', async () => {
    const resultado = await criarCarona(CARONA_VALIDA);

    expect(resultado).toEqual([{ id: expect.any(Number), status: 'CRIADA' }]);
  });

  // A recorrência não é um campo da carona: os dias marcados viram datas, e o
  // back materializa uma carona independente por data. 25/08/2026 é uma terça.
  it('cria uma carona por data quando há recorrência', async () => {
    const resultado = await criarCarona({
      ...CARONA_VALIDA,
      recorrente: true,
      diasRecorrencia: ['Ter', 'Qui'],
    });

    expect(resultado).toHaveLength(2);

    const caronas = await listarMinhasCaronas();
    const criadas = resultado.map(({ id }) =>
      caronas.find((carona) => carona.id === id),
    );

    expect(criadas.map((carona) => carona.dataHoraSaida)).toEqual([
      '2026-08-25T07:00:00',
      '2026-08-27T07:00:00',
    ]);
  });

  it('rejeita quando nenhuma data é informada', async () => {
    await expect(
      criarCarona({ ...CARONA_VALIDA, dataHoraSaida: '' }),
    ).rejects.toThrow('Informe ao menos uma data de saída');
  });

  it('inclui a carona criada ao relistar as caronas do motorista', async () => {
    const [{ id }] = await criarCarona(CARONA_VALIDA);

    const caronas = await listarMinhasCaronas();

    expect(caronas.some((carona) => carona.id === id)).toBe(true);
  });

  it('rejeita quantidade de vagas igual a zero (RN-CAR-03)', async () => {
    await expect(
      criarCarona({ ...CARONA_VALIDA, quantidadeVagas: 0 }),
    ).rejects.toThrow('A quantidade de vagas deve ser maior que zero');
  });

  it('rejeita quando origem ou destino não têm descrição (RN-CAR-05/06)', async () => {
    await expect(
      criarCarona({ ...CARONA_VALIDA, destino: '' }),
    ).rejects.toThrow('Origem e destino são obrigatórios');
  });

  it('rejeita com 403 "Acesso negado" quando não há sessão', async () => {
    localStorage.clear();

    await expect(criarCarona(CARONA_VALIDA)).rejects.toThrow('Acesso negado');
  });
});

describe('PATCH /caronas/{id}/cancelar', () => {
  it('cancela com 200 e devolve { id, status: CANCELADA }', async () => {
    const resultado = await cancelarCarona(10);

    expect(resultado).toEqual({ id: 10, status: 'CANCELADA' });
  });

  it('reflete o novo status ao relistar as caronas do motorista', async () => {
    await cancelarCarona(10);

    const caronas = await listarMinhasCaronas();
    const cancelada = caronas.find((carona) => carona.id === 10);

    expect(cancelada.status).toBe('CANCELADA');
  });

  it('rejeita carona inexistente com 404 "Carona não encontrada"', async () => {
    await expect(cancelarCarona(9999)).rejects.toThrow('Carona não encontrada');
  });

  it('rejeita com 403 "Acesso negado" quando não há sessão', async () => {
    localStorage.clear();

    await expect(cancelarCarona(10)).rejects.toThrow('Acesso negado');
  });
});

describe('DELETE /caronas/{id}/reservas/{reservaId}', () => {
  it('remove reserva com 200 e devolve { id, status: REMOVIDA }', async () => {
    const resultado = await removerReservaCarona(10, 101);

    expect(resultado).toEqual({ id: 101, status: 'REMOVIDA' });
  });

  it('reflete a lista de reservas atualizada ao consultar a carona', async () => {
    await removerReservaCarona(10, 101);

    const carona = await obterCarona(10);

    expect(carona.passageiros.some((passageiro) => passageiro.reservaId === 101)).toBe(false);
    expect(carona.vagasDisponiveis).toBe(2);
  });

  it('rejeita reserva inexistente com 404 "Reserva não encontrada"', async () => {
    await expect(removerReservaCarona(10, 9999)).rejects.toThrow('Reserva não encontrada');
  });

  it('rejeita com 403 "Acesso negado" quando não há sessão', async () => {
    localStorage.clear();

    await expect(removerReservaCarona(10, 101)).rejects.toThrow('Acesso negado');
  });
});
