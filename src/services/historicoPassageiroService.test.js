import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let listarHistoricoComoPassageiro;
let obterResumoHistoricoPassageiro;

beforeEach(async () => {
  localStorage.clear();
  vi.resetModules();
  // O serviço é mock-only: o fetch fica stubado só para provar que ninguém o chama.
  vi.stubGlobal('fetch', vi.fn());

  ({ listarHistoricoComoPassageiro, obterResumoHistoricoPassageiro } =
    await import('./historicoPassageiroService.js'));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('contrato offline', () => {
  it('nenhuma função toca na rede', async () => {
    await listarHistoricoComoPassageiro();
    await obterResumoHistoricoPassageiro();

    expect(fetch).not.toHaveBeenCalled();
  });

  // Ao contrário dos outros serviços, este não exige token nenhum.
  it('não exige sessão nem escreve no localStorage', async () => {
    await listarHistoricoComoPassageiro();
    await obterResumoHistoricoPassageiro();

    expect(localStorage.length).toBe(0);
  });

  it('funciona mesmo com a sessão corrompida', async () => {
    localStorage.setItem('unicar.session', '{ não é json');

    await expect(listarHistoricoComoPassageiro()).resolves.toHaveLength(4);
  });
});

describe('listarHistoricoComoPassageiro', () => {
  it('devolve as 4 reservas mockadas', async () => {
    const reservas = await listarHistoricoComoPassageiro();

    expect(reservas).toHaveLength(4);
    expect(reservas.map((reserva) => reserva.id)).toEqual([1, 2, 3, 4]);
  });

  it('devolve o shape que a página HistoricoCaronas consome', async () => {
    const reservas = await listarHistoricoComoPassageiro();

    for (const reserva of reservas) {
      expect(reserva).toEqual({
        id: expect.any(Number),
        status: expect.any(String),
        dataHora: expect.any(String),
        vagasReservadas: expect.any(Number),
        totalVagas: expect.any(Number),
        origem: expect.any(String),
        destino: expect.any(String),
        pontoReferencia: expect.any(String),
        motorista: {
          id: expect.any(String),
          nome: expect.any(String),
          avaliacao: expect.any(Number),
          fotoPerfil: expect.any(String),
        },
      });
    }
  });

  it('só expõe os campos do shape normalizado', async () => {
    const [reserva] = await listarHistoricoComoPassageiro();

    expect(Object.keys(reserva).sort()).toEqual([
      'dataHora',
      'destino',
      'id',
      'motorista',
      'origem',
      'pontoReferencia',
      'status',
      'totalVagas',
      'vagasReservadas',
    ]);
    expect(Object.keys(reserva.motorista).sort()).toEqual([
      'avaliacao',
      'fotoPerfil',
      'id',
      'nome',
    ]);
  });

  it('a página avalia o motorista por id e nome: nenhum dos dois pode faltar', async () => {
    const reservas = await listarHistoricoComoPassageiro();

    for (const reserva of reservas) {
      expect(reserva.motorista.id).toBeTruthy();
      expect(reserva.motorista.nome).toBeTruthy();
    }
  });

  it('o id do motorista casa com os ids do publicProfileService', async () => {
    const reservas = await listarHistoricoComoPassageiro();

    expect(reservas.map((reserva) => reserva.motorista.id)).toEqual([
      'marina',
      'beatriz',
      'rafael',
      'ana',
    ]);
  });

  it('cobre os quatro status do ciclo de vida da reserva', async () => {
    const reservas = await listarHistoricoComoPassageiro();

    expect(reservas.map((reserva) => reserva.status)).toEqual([
      'CONFIRMADA',
      'FINALIZADA',
      'CANCELADA',
      'RECUSADA',
    ]);
  });

  it('todas as datas são parseáveis', async () => {
    const reservas = await listarHistoricoComoPassageiro();

    for (const reserva of reservas) {
      expect(Number.isNaN(Date.parse(reserva.dataHora))).toBe(false);
    }
  });

  it('as vagas reservadas nunca passam do total de vagas', async () => {
    const reservas = await listarHistoricoComoPassageiro();

    for (const reserva of reservas) {
      expect(reserva.vagasReservadas).toBeGreaterThan(0);
      expect(reserva.vagasReservadas).toBeLessThanOrEqual(reserva.totalVagas);
    }
  });

  it('todas as reservas têm a UFCG como destino', async () => {
    const reservas = await listarHistoricoComoPassageiro();

    expect(reservas.every((reserva) => reserva.destino === 'UFCG')).toBe(true);
    expect(reservas.every((reserva) => reserva.origem !== '')).toBe(true);
  });

  it('a primeira reserva é gerada com a data de hoje às 07:20', async () => {
    const [reserva] = await listarHistoricoComoPassageiro();

    const hoje = new Date();
    const pad = (valor) => String(valor).padStart(2, '0');
    const dataEsperada =
      `${hoje.getFullYear()}-${pad(hoje.getMonth() + 1)}-${pad(hoje.getDate())}` +
      'T07:20:00';

    expect(reserva.dataHora).toBe(dataEsperada);
  });

  it('devolve objetos novos: mutar o resultado não contamina a listagem seguinte', async () => {
    const primeira = await listarHistoricoComoPassageiro();
    primeira[0].status = 'ADULTERADO';
    primeira[0].origem = 'Marte';

    const segunda = await listarHistoricoComoPassageiro();

    expect(segunda[0].status).toBe('CONFIRMADA');
    expect(segunda[0].origem).toBe('Centenário');
  });

  // Comportamento ATUAL: normalizarReservaPassageiro copia a reserva mas reaproveita
  // o objeto `motorista` do mock por referência. Ver relatório.
  it('o motorista é recriado a cada chamada, mas os dados vêm do mesmo mock', async () => {
    const primeira = await listarHistoricoComoPassageiro();
    primeira[0].motorista.nome = 'Adulterado';

    const segunda = await listarHistoricoComoPassageiro();

    expect(segunda[0].motorista.nome).toBe('Marina Souza');
  });

  it('devolve um array novo a cada chamada', async () => {
    const primeira = await listarHistoricoComoPassageiro();
    const segunda = await listarHistoricoComoPassageiro();

    expect(segunda).not.toBe(primeira);
    expect(segunda).toEqual(primeira);
  });

  // Não há filtro por status, por período nem por usuário: a função é sempre a
  // lista inteira, e argumentos são ignorados.
  it('ignora qualquer argumento passado', async () => {
    const semArgumento = await listarHistoricoComoPassageiro();

    await expect(
      listarHistoricoComoPassageiro({ status: 'FINALIZADA' }),
    ).resolves.toEqual(semArgumento);
    await expect(listarHistoricoComoPassageiro('marina')).resolves.toEqual(
      semArgumento,
    );
  });

  it('devolve os dados sempre em ordem estável (não ordena por data)', async () => {
    const reservas = await listarHistoricoComoPassageiro();

    const tempos = reservas.map((reserva) => Date.parse(reserva.dataHora));
    const decrescente = [...tempos].sort((a, b) => b - a);
    expect(tempos).toEqual(decrescente);
  });
});

describe('obterResumoHistoricoPassageiro', () => {
  it('devolve o resumo hardcoded', async () => {
    await expect(obterResumoHistoricoPassageiro()).resolves.toEqual({
      avaliacaoMedia: 4.8,
      caronasConcluidas: 42,
    });
  });

  it('a avaliação média fica na escala de 0 a 5', async () => {
    const resumo = await obterResumoHistoricoPassageiro();

    expect(resumo.avaliacaoMedia).toBeGreaterThanOrEqual(0);
    expect(resumo.avaliacaoMedia).toBeLessThanOrEqual(5);
    expect(Number.isInteger(resumo.caronasConcluidas)).toBe(true);
  });

  // O resumo é fixo e não deriva da listagem: só 1 das 4 reservas está FINALIZADA,
  // mas o resumo diz 42 caronas concluídas. Ver relatório.
  it('o resumo não é derivado da listagem', async () => {
    const reservas = await listarHistoricoComoPassageiro();
    const concluidas = reservas.filter(
      (reserva) => reserva.status === 'FINALIZADA',
    ).length;

    const resumo = await obterResumoHistoricoPassageiro();

    expect(concluidas).toBe(1);
    expect(resumo.caronasConcluidas).toBe(42);
  });

  it('é estável entre chamadas', async () => {
    await expect(obterResumoHistoricoPassageiro()).resolves.toEqual(
      await obterResumoHistoricoPassageiro(),
    );
  });
});
