import { describe, expect, it } from 'vitest';

import { expandirDatasDaRecorrencia, formatarDataHora } from './recorrencia.js';

// Datas de referência em agosto de 2026:
//   24/08 Seg · 25/08 Ter · 26/08 Qua · 27/08 Qui · 28/08 Sex · 29/08 Sáb · 30/08 Dom
const TERCA = '2026-08-25T07:00:00';

describe('expandirDatasDaRecorrencia', () => {
  it('sem recorrência devolve apenas a data escolhida', () => {
    expect(
      expandirDatasDaRecorrencia({ dataHoraSaida: TERCA, recorrente: false }),
    ).toEqual([TERCA]);
  });

  it('recorrente sem nenhum dia marcado também devolve só a data escolhida', () => {
    expect(
      expandirDatasDaRecorrencia({
        dataHoraSaida: TERCA,
        recorrente: true,
        diasRecorrencia: [],
      }),
    ).toEqual([TERCA]);
  });

  it('ignora os dias marcados quando o motorista desmarcou "recorrente"', () => {
    expect(
      expandirDatasDaRecorrencia({
        dataHoraSaida: TERCA,
        recorrente: false,
        diasRecorrencia: ['Qui', 'Sex'],
      }),
    ).toEqual([TERCA]);
  });

  it('a data escolhida entra, e os dias marcados geram as ocorrências seguintes', () => {
    expect(
      expandirDatasDaRecorrencia({
        dataHoraSaida: TERCA,
        recorrente: true,
        diasRecorrencia: ['Qui', 'Sáb'],
      }),
    ).toEqual([
      '2026-08-25T07:00:00', // Ter — a data escolhida
      '2026-08-27T07:00:00', // Qui
      '2026-08-29T07:00:00', // Sáb
    ]);
  });

  it('não duplica a data escolhida quando o dia dela está marcado', () => {
    const datas = expandirDatasDaRecorrencia({
      dataHoraSaida: TERCA,
      recorrente: true,
      diasRecorrencia: ['Ter', 'Qui'],
    });

    // A terça seguinte (01/09) cairia fora da janela de uma semana.
    expect(datas).toEqual(['2026-08-25T07:00:00', '2026-08-27T07:00:00']);
  });

  it('com todos os dias marcados gera 7 datas, sem passar de D+6', () => {
    const datas = expandirDatasDaRecorrencia({
      dataHoraSaida: TERCA,
      recorrente: true,
      diasRecorrencia: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
    });

    expect(datas).toEqual([
      '2026-08-25T07:00:00', // Ter (D)
      '2026-08-26T07:00:00', // Qua
      '2026-08-27T07:00:00', // Qui
      '2026-08-28T07:00:00', // Sex
      '2026-08-29T07:00:00', // Sáb
      '2026-08-30T07:00:00', // Dom
      '2026-08-31T07:00:00', // Seg (D+6) — a semana fecha aqui
    ]);
  });

  it('preserva o horário da data escolhida em todas as ocorrências', () => {
    const datas = expandirDatasDaRecorrencia({
      dataHoraSaida: '2026-08-25T18:45:00',
      recorrente: true,
      diasRecorrencia: ['Qui'],
    });

    expect(datas).toEqual(['2026-08-25T18:45:00', '2026-08-27T18:45:00']);
  });

  it('atravessa a virada de mês', () => {
    const datas = expandirDatasDaRecorrencia({
      dataHoraSaida: '2026-08-30T07:00:00', // Dom
      recorrente: true,
      diasRecorrencia: ['Ter'],
    });

    expect(datas).toEqual(['2026-08-30T07:00:00', '2026-09-01T07:00:00']);
  });

  it('devolve lista vazia sem data de saída', () => {
    expect(expandirDatasDaRecorrencia({})).toEqual([]);
  });
});

describe('formatarDataHora', () => {
  it('rotula a data com o dia da semana', () => {
    expect(formatarDataHora('2026-08-25T07:00:00')).toBe('Ter, 25/08 às 07:00');
  });

  it('devolve o valor original quando a data é inválida', () => {
    expect(formatarDataHora('sem-data')).toBe('sem-data');
  });
});
