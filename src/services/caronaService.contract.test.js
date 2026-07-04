import { beforeEach, describe, expect, it } from 'vitest';
import { cancelarCarona, listarMinhasCaronas } from './caronaService.js';

beforeEach(() => {
  localStorage.setItem(
    'unicar.session',
    JSON.stringify({ token: 'token-simulado', usuario: { nome: 'Motorista' } }),
  );
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
