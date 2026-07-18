import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

// Intercepta o useNavigate para observar o redirecionamento pós-finalização,
// preservando o restante do react-router-dom (MemoryRouter, Link etc.).
const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => navigateMock };
});

// Isola o componente do serviço de caronas.
vi.mock('../../services/caronaService.js', () => ({
  listarMinhasCaronas: vi.fn(),
  cancelarCarona: vi.fn(),
  iniciarCarona: vi.fn(),
  finalizarCarona: vi.fn(),
}));

// A aba "Como Passageiro" busca as reservas enviadas por este serviço.
vi.mock('../../services/reservaService.js', () => ({
  listarReservasEnviadas: vi.fn(),
}));

import MinhasCaronas from './index.jsx';
import {
  listarMinhasCaronas,
  cancelarCarona,
  iniciarCarona,
  finalizarCarona,
} from '../../services/caronaService.js';
import { listarReservasEnviadas } from '../../services/reservaService.js';

// Data/hora de saída relativa ao "agora" real, para exercitar o filtro por
// tolerância de forma determinística. Offset em minutos (negativo = passado).
function saidaEm(minutos) {
  const d = new Date(Date.now() + minutos * 60 * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:00`
  );
}

const CARONAS = [
  {
    id: 10,
    status: 'CRIADA',
    dataHoraSaida: saidaEm(120),
    origem: 'Bodocongó',
    destino: 'UFCG',
    pontoEncontro: 'Campus Sede',
    quantidadeVagas: 3,
    vagasDisponiveis: 1,
    passageirosConfirmados: 2,
  },
];

function renderPagina() {
  return render(
    <MemoryRouter>
      <MinhasCaronas />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  listarMinhasCaronas.mockResolvedValue([]);
  // A aba "Passageiro" carrega sob demanda; sem dados por padrão.
  listarReservasEnviadas.mockResolvedValue([]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('carregamento e listagem', () => {
  it('exibe estado de carregando antes de resolver', async () => {
    let resolver;
    listarMinhasCaronas.mockReturnValue(
      new Promise((resolve) => {
        resolver = resolve;
      }),
    );

    renderPagina();

    expect(screen.getByText('Carregando suas caronas...')).toBeInTheDocument();

    resolver([]);
    await waitFor(() =>
      expect(screen.queryByText('Carregando suas caronas...')).not.toBeInTheDocument(),
    );
  });

  it('exibe estado vazio quando não há caronas', async () => {
    renderPagina();

    expect(
      await screen.findByText('Você ainda não criou nenhuma carona.'),
    ).toBeInTheDocument();
  });

  it('renderiza o card com status, rota, ponto de encontro e passageiros', async () => {
    listarMinhasCaronas.mockResolvedValue(CARONAS);

    renderPagina();

    expect(await screen.findByText('Aguardando')).toBeInTheDocument();
    expect(screen.getByText('Bodocongó')).toBeInTheDocument();
    expect(screen.getByText('UFCG • Campus Sede')).toBeInTheDocument();
    expect(screen.getByText('2 de 3 passageiros confirmados')).toBeInTheDocument();
  });

  it('habilita "Iniciar", "Editar", "Cancelar" e "Ver detalhes" para caronas CRIADA', async () => {
    listarMinhasCaronas.mockResolvedValue(CARONAS);

    renderPagina();

    expect(await screen.findByRole('button', { name: /iniciar/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /cancelar carona/i })).toBeEnabled();

    const editar = screen.getByRole('link', { name: /editar carona/i });
    expect(editar).toHaveAttribute('aria-disabled', 'false');
    expect(editar).toHaveAttribute('href', '/minhas-caronas/10/editar');

    expect(
      screen.getByRole('link', { name: /ver detalhes da carona/i }),
    ).toHaveAttribute('href', '/minhas-caronas/10');
  });

  it('troca as ações por "Finalizar carona" quando a carona está EM_ANDAMENTO', async () => {
    listarMinhasCaronas.mockResolvedValue([{ ...CARONAS[0], status: 'EM_ANDAMENTO' }]);

    renderPagina();

    await screen.findByText('Em andamento');

    expect(screen.getByRole('button', { name: /finalizar carona/i })).toBeEnabled();

    // Uma carona já iniciada não pode mais ser iniciada, editada nem cancelada:
    // as ações deixam de ser renderizadas.
    expect(screen.queryByRole('button', { name: /iniciar/i })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /cancelar carona/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /editar carona/i })).not.toBeInTheDocument();

    // "Ver detalhes" continua acessível em qualquer status.
    expect(
      screen.getByRole('link', { name: /ver detalhes da carona/i }),
    ).toBeInTheDocument();
  });
});

describe('filtro e ordenação da lista', () => {
  it('mostra apenas CRIADA e EM_ANDAMENTO, ocultando canceladas, finalizadas e expiradas', async () => {
    listarMinhasCaronas.mockResolvedValue([
      { ...CARONAS[0], id: 1, status: 'EM_ANDAMENTO', dataHoraSaida: saidaEm(30) },
      { ...CARONAS[0], id: 2, status: 'CANCELADA', dataHoraSaida: saidaEm(60) },
      { ...CARONAS[0], id: 3, status: 'FINALIZADA', dataHoraSaida: saidaEm(90) },
      { ...CARONAS[0], id: 4, status: 'EXPIRADA', dataHoraSaida: saidaEm(120) },
    ]);

    renderPagina();

    expect(await screen.findByText('Em andamento')).toBeInTheDocument();
    expect(screen.queryByText('Cancelada')).not.toBeInTheDocument();
    expect(screen.queryByText('Finalizada')).not.toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(1);
  });

  it('mantém uma CRIADA por até 30 min após o horário e a remove depois', async () => {
    listarMinhasCaronas.mockResolvedValue([
      { ...CARONAS[0], dataHoraSaida: saidaEm(-10) },
    ]);

    const { unmount } = renderPagina();
    expect(await screen.findByText('Aguardando')).toBeInTheDocument();
    unmount();

    listarMinhasCaronas.mockResolvedValue([
      { ...CARONAS[0], dataHoraSaida: saidaEm(-40) },
    ]);

    renderPagina();
    expect(
      await screen.findByText('Você ainda não criou nenhuma carona.'),
    ).toBeInTheDocument();
  });

  it('mantém a EM_ANDAMENTO mesmo passados 30 min do horário', async () => {
    listarMinhasCaronas.mockResolvedValue([
      { ...CARONAS[0], status: 'EM_ANDAMENTO', dataHoraSaida: saidaEm(-90) },
    ]);

    renderPagina();

    expect(await screen.findByText('Em andamento')).toBeInTheDocument();
  });

  it('ordena as caronas pela data/hora de saída (mais cedo primeiro)', async () => {
    listarMinhasCaronas.mockResolvedValue([
      { ...CARONAS[0], id: 1, origem: 'Centro', dataHoraSaida: saidaEm(180) },
      { ...CARONAS[0], id: 2, origem: 'Bodocongó', dataHoraSaida: saidaEm(60) },
    ]);

    renderPagina();

    await screen.findByText('Bodocongó');

    const cards = screen.getAllByRole('article');
    expect(within(cards[0]).getByText('Bodocongó')).toBeInTheDocument();
    expect(within(cards[1]).getByText('Centro')).toBeInTheDocument();
  });
});

describe('abas', () => {
  it('alterna para "Como Passageiro" mostrando estado vazio dedicado', async () => {
    listarMinhasCaronas.mockResolvedValue(CARONAS);

    renderPagina();

    await screen.findByText('Aguardando');

    await userEvent.click(screen.getByRole('tab', { name: 'Como Passageiro' }));

    expect(
      screen.getByText('Nenhuma carona como passageiro por aqui ainda.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Aguardando')).not.toBeInTheDocument();
  });
});

describe('erro', () => {
  it('exibe mensagem de erro e permite tentar novamente', async () => {
    listarMinhasCaronas.mockRejectedValueOnce(new Error('Falha ao carregar'));

    renderPagina();

    expect(await screen.findByText('Falha ao carregar')).toBeInTheDocument();

    listarMinhasCaronas.mockResolvedValue(CARONAS);
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByText('Aguardando')).toBeInTheDocument();
  });

  it('mantém a tela de erro quando a nova tentativa também falha', async () => {
    listarMinhasCaronas.mockRejectedValueOnce(new Error('Falha ao carregar'));

    renderPagina();

    expect(await screen.findByText('Falha ao carregar')).toBeInTheDocument();

    // A segunda chamada (via `carregar`) também rejeita, com outra mensagem.
    listarMinhasCaronas.mockRejectedValueOnce(new Error('Ainda indisponível'));
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByText('Ainda indisponível')).toBeInTheDocument();
  });
});

describe('cancelamento', () => {
  it('abre o modal de confirmação sem cancelar de imediato', async () => {
    listarMinhasCaronas.mockResolvedValue(CARONAS);

    renderPagina();

    await userEvent.click(
      await screen.findByRole('button', { name: /cancelar carona/i }),
    );

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Cancelar carona' })).toBeInTheDocument();
    expect(cancelarCarona).not.toHaveBeenCalled();
  });

  it('confirma o cancelamento, atualiza o status e exibe feedback de sucesso', async () => {
    listarMinhasCaronas.mockResolvedValue(CARONAS);
    cancelarCarona.mockResolvedValue({ id: 10, status: 'CANCELADA' });

    renderPagina();

    await userEvent.click(
      await screen.findByRole('button', { name: /cancelar carona/i }),
    );

    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancelar carona' }));

    await waitFor(() => expect(cancelarCarona).toHaveBeenCalledWith(10));
    expect(
      await screen.findByText('Carona cancelada com sucesso.'),
    ).toBeInTheDocument();
    // Ao cancelar, a carona sai da listagem (vai para o histórico).
    expect(screen.queryByText('Aguardando')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('esconde a mensagem de sucesso automaticamente após alguns segundos', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    try {
      listarMinhasCaronas.mockResolvedValue(CARONAS);
      cancelarCarona.mockResolvedValue({ id: 10, status: 'CANCELADA' });

      renderPagina();

      await user.click(await screen.findByRole('button', { name: /cancelar carona/i }));

      const dialog = screen.getByRole('dialog');
      await user.click(within(dialog).getByRole('button', { name: 'Cancelar carona' }));

      expect(
        await screen.findByText('Carona cancelada com sucesso.'),
      ).toBeInTheDocument();

      act(() => vi.advanceTimersByTime(4000));

      await waitFor(() =>
        expect(
          screen.queryByText('Carona cancelada com sucesso.'),
        ).not.toBeInTheDocument(),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('fechar o modal com "Voltar" não cancela a carona', async () => {
    listarMinhasCaronas.mockResolvedValue(CARONAS);

    renderPagina();

    await userEvent.click(
      await screen.findByRole('button', { name: /cancelar carona/i }),
    );

    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Voltar' }));

    expect(cancelarCarona).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('exibe mensagem de erro quando o cancelamento falha', async () => {
    listarMinhasCaronas.mockResolvedValue(CARONAS);
    cancelarCarona.mockRejectedValue(new Error('Não foi possível cancelar a carona.'));

    renderPagina();

    await userEvent.click(
      await screen.findByRole('button', { name: /cancelar carona/i }),
    );

    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancelar carona' }));

    expect(
      await screen.findByText('Não foi possível cancelar a carona.'),
    ).toBeInTheDocument();
  });
});

describe('iniciar carona', () => {
  it('abre o modal de confirmação sem iniciar de imediato', async () => {
    listarMinhasCaronas.mockResolvedValue(CARONAS);

    renderPagina();

    await userEvent.click(await screen.findByRole('button', { name: /iniciar/i }));

    const dialog = screen.getByRole('dialog');
    expect(
      within(dialog).getByRole('heading', { name: 'Iniciar carona' }),
    ).toBeInTheDocument();
    expect(iniciarCarona).not.toHaveBeenCalled();
  });

  it('confirma o início, atualiza o status para EM_ANDAMENTO e exibe feedback', async () => {
    listarMinhasCaronas.mockResolvedValue(CARONAS);
    iniciarCarona.mockResolvedValue({ id: 10, status: 'EM_ANDAMENTO' });

    renderPagina();

    await userEvent.click(await screen.findByRole('button', { name: /iniciar/i }));

    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirmar início' }));

    await waitFor(() => expect(iniciarCarona).toHaveBeenCalledWith(10));
    expect(
      await screen.findByText('Carona iniciada com sucesso.'),
    ).toBeInTheDocument();

    // O status muda: some o rótulo "Aguardando" e surge "Em andamento", com a
    // ação de finalizar no lugar de iniciar.
    expect(screen.getByText('Em andamento')).toBeInTheDocument();
    expect(screen.queryByText('Aguardando')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /finalizar carona/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^iniciar$/i })).not.toBeInTheDocument();
    // Modal fechado ao concluir.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('exibe mensagem de erro quando o início falha e mantém a carona CRIADA', async () => {
    listarMinhasCaronas.mockResolvedValue(CARONAS);
    iniciarCarona.mockRejectedValue(new Error('Não foi possível iniciar a carona.'));

    renderPagina();

    await userEvent.click(await screen.findByRole('button', { name: /iniciar/i }));

    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirmar início' }));

    expect(
      await screen.findByText('Não foi possível iniciar a carona.'),
    ).toBeInTheDocument();
    // A falha define o `erro` da página, e ConteudoMotorista substitui a lista
    // inteira pela tela de erro com "Tentar novamente" — o card some da tela.
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
    expect(screen.queryByText('Aguardando')).not.toBeInTheDocument();
  });

  it('fechar o modal com "Cancelar" não inicia a carona', async () => {
    listarMinhasCaronas.mockResolvedValue(CARONAS);

    renderPagina();

    await userEvent.click(await screen.findByRole('button', { name: /iniciar/i }));

    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

    expect(iniciarCarona).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('finalizar carona', () => {
  const CARONA_ANDAMENTO = [{ ...CARONAS[0], status: 'EM_ANDAMENTO' }];

  it('abre o modal de confirmação sem finalizar de imediato', async () => {
    listarMinhasCaronas.mockResolvedValue(CARONA_ANDAMENTO);

    renderPagina();

    await userEvent.click(
      await screen.findByRole('button', { name: /finalizar carona/i }),
    );

    const dialog = screen.getByRole('dialog');
    expect(
      within(dialog).getByRole('heading', { name: 'Finalizar carona' }),
    ).toBeInTheDocument();
    expect(finalizarCarona).not.toHaveBeenCalled();
  });

  it('confirma a finalização, exibe feedback com menção ao Histórico e redireciona', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    try {
      listarMinhasCaronas.mockResolvedValue(CARONA_ANDAMENTO);
      finalizarCarona.mockResolvedValue({ id: 10, status: 'FINALIZADA' });

      renderPagina();

      await user.click(await screen.findByRole('button', { name: /finalizar carona/i }));

      const dialog = screen.getByRole('dialog');
      await user.click(within(dialog).getByRole('button', { name: 'Finalizar carona' }));

      await waitFor(() => expect(finalizarCarona).toHaveBeenCalledWith(10));

      const feedback = await screen.findByText(/Carona finalizada com sucesso/);
      expect(feedback).toHaveTextContent(/Hist[óo]rico/i);

      // Uma FINALIZADA não é visível na lista de motorista: some o card.
      expect(screen.queryByText('Em andamento')).not.toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      // O redirecionamento acontece após o timeout de 2,5s.
      expect(navigateMock).not.toHaveBeenCalled();
      act(() => vi.advanceTimersByTime(2500));
      expect(navigateMock).toHaveBeenCalledWith('/historico-caronas');
    } finally {
      vi.useRealTimers();
    }
  });

  it('exibe mensagem de erro quando a finalização falha e não redireciona', async () => {
    listarMinhasCaronas.mockResolvedValue(CARONA_ANDAMENTO);
    finalizarCarona.mockRejectedValue(new Error('Não foi possível finalizar a carona.'));

    renderPagina();

    await userEvent.click(
      await screen.findByRole('button', { name: /finalizar carona/i }),
    );

    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Finalizar carona' }));

    expect(
      await screen.findByText('Não foi possível finalizar a carona.'),
    ).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
    // Como no início, a falha aciona o `erro` da página, que troca a lista pela
    // tela de erro — o card "Em andamento" deixa de aparecer.
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
    expect(screen.queryByText('Em andamento')).not.toBeInTheDocument();
  });

  it('fechar o modal com "Cancelar" não finaliza a carona', async () => {
    listarMinhasCaronas.mockResolvedValue(CARONA_ANDAMENTO);

    renderPagina();

    await userEvent.click(
      await screen.findByRole('button', { name: /finalizar carona/i }),
    );

    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

    expect(finalizarCarona).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // Carona segue na lista, em andamento.
    expect(screen.getByText('Em andamento')).toBeInTheDocument();
  });
});

describe('aba Passageiro — agrupamento das reservas', () => {
  const RESERVAS = [
    {
      id: 1,
      status: 'ACEITA',
      dataViagem: saidaEm(120),
      quantidadePassageiros: 1,
      motorista: { nome: 'Marina Souza' },
      carona: { id: 201, origem: 'Centenário', destino: 'UFCG' },
    },
    {
      id: 2,
      status: 'CONFIRMADA',
      dataViagem: saidaEm(180),
      quantidadePassageiros: 2,
      motorista: { nome: 'João Mendes' },
      carona: { id: 202, origem: 'Prata', destino: 'CCT' },
    },
    {
      id: 3,
      status: 'PENDENTE',
      dataViagem: saidaEm(240),
      quantidadePassageiros: 1,
      motorista: { nome: 'Ana Paula' },
      carona: { id: 203, origem: 'Centro', destino: 'Campus' },
    },
    {
      id: 4,
      status: 'CANCELADA',
      dataViagem: '',
      quantidadePassageiros: 3,
      motorista: { nome: 'Rafael Costa' },
      carona: { id: 204, origem: 'Liberdade', destino: 'Sede' },
    },
  ];

  async function irParaPassageiro() {
    await screen.findByText('Você ainda não criou nenhuma carona.');
    await userEvent.click(screen.getByRole('tab', { name: 'Como Passageiro' }));
  }

  it('agrupa em Confirmadas, Solicitações pendentes e Outras reservas', async () => {
    listarReservasEnviadas.mockResolvedValue(RESERVAS);

    renderPagina();
    await irParaPassageiro();

    const confirmadas = (await screen.findByRole('heading', { name: 'Confirmadas' }))
      .closest('.reservas-grupo');
    // ACEITA e CONFIRMADA caem em Confirmadas.
    expect(within(confirmadas).getByText('Marina Souza')).toBeInTheDocument();
    expect(within(confirmadas).getByText('João Mendes')).toBeInTheDocument();

    const pendentes = screen.getByRole('heading', { name: 'Solicitações pendentes' })
      .closest('.reservas-grupo');
    expect(within(pendentes).getByText('Ana Paula')).toBeInTheDocument();
    // Somente pendentes trazem o link de cancelar solicitação.
    expect(
      within(pendentes).getByRole('link', { name: 'Cancelar solicitação' }),
    ).toBeInTheDocument();

    const outras = screen.getByRole('heading', { name: 'Outras reservas' })
      .closest('.reservas-grupo');
    expect(within(outras).getByText('Rafael Costa')).toBeInTheDocument();
  });

  it('não renderiza grupos vazios', async () => {
    // Só reservas confirmadas: pendentes e outras não devem aparecer.
    listarReservasEnviadas.mockResolvedValue([RESERVAS[0]]);

    renderPagina();
    await irParaPassageiro();

    expect(await screen.findByRole('heading', { name: 'Confirmadas' })).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Solicitações pendentes' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Outras reservas' }),
    ).not.toBeInTheDocument();
  });

  it('renderiza os dados da reserva no card (rota, quantidade e data)', async () => {
    listarReservasEnviadas.mockResolvedValue([RESERVAS[0], RESERVAS[3]]);

    renderPagina();
    await irParaPassageiro();

    // Rota origem → destino: origem e destino ficam no mesmo <p>, separados pelo
    // ícone, então a busca precisa ser por substring.
    expect(await screen.findByText(/Centenário/)).toBeInTheDocument();
    expect(screen.getByText(/UFCG/)).toBeInTheDocument();
    // Quantidade: 1 usa singular "passageiro(a)".
    expect(screen.getByText('1 passageiro(a)')).toBeInTheDocument();
    // Quantidade > 1 usa o plural.
    expect(screen.getByText('3 passageiros(as)')).toBeInTheDocument();
    // Reserva sem dataViagem cai no texto padrão.
    expect(screen.getByText('Data não informada')).toBeInTheDocument();
    // Link de detalhes aponta para /reservas/:id.
    expect(
      screen.getByRole('link', { name: /Ver detalhes da reserva com Marina Souza/ }),
    ).toHaveAttribute('href', '/reservas/1');
  });
});

describe('aba Passageiro — carregamento, erro e lazy load', () => {
  it('exibe estado de carregando enquanto as reservas não resolvem', async () => {
    let resolver;
    listarReservasEnviadas.mockReturnValue(
      new Promise((resolve) => {
        resolver = resolve;
      }),
    );

    renderPagina();
    await screen.findByText('Você ainda não criou nenhuma carona.');
    await userEvent.click(screen.getByRole('tab', { name: 'Como Passageiro' }));

    expect(screen.getByText('Carregando suas reservas...')).toBeInTheDocument();

    resolver([]);
    await waitFor(() =>
      expect(screen.queryByText('Carregando suas reservas...')).not.toBeInTheDocument(),
    );
  });

  it('busca as reservas apenas uma vez ao alternar de aba repetidamente', async () => {
    listarReservasEnviadas.mockResolvedValue([]);

    renderPagina();
    await screen.findByText('Você ainda não criou nenhuma carona.');

    await userEvent.click(screen.getByRole('tab', { name: 'Como Passageiro' }));
    await screen.findByText('Nenhuma carona como passageiro por aqui ainda.');

    await userEvent.click(screen.getByRole('tab', { name: 'Como Motorista' }));
    await userEvent.click(screen.getByRole('tab', { name: 'Como Passageiro' }));
    await screen.findByText('Nenhuma carona como passageiro por aqui ainda.');

    expect(listarReservasEnviadas).toHaveBeenCalledTimes(1);
  });

  it('mostra o erro ao carregar as reservas', async () => {
    listarReservasEnviadas.mockRejectedValueOnce(new Error('Falha nas reservas'));

    renderPagina();
    await screen.findByText('Você ainda não criou nenhuma carona.');
    await userEvent.click(screen.getByRole('tab', { name: 'Como Passageiro' }));

    expect(await screen.findByText('Falha nas reservas')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
  });

  // Após um erro na aba Passageiro, "Tentar novamente" refaz a busca: o gatilho
  // `tentativaReservas` re-dispara o efeito mesmo com `reservasCarregadas` ainda
  // false. (Antes era um no-op — o botão fazia setReservasCarregadas(false), que
  // não mudava o valor e não re-disparava o efeito.)
  it('"Tentar novamente" na aba Passageiro refaz a busca e mostra as reservas', async () => {
    listarReservasEnviadas.mockRejectedValueOnce(new Error('Falha nas reservas'));

    renderPagina();
    await screen.findByText('Você ainda não criou nenhuma carona.');
    await userEvent.click(screen.getByRole('tab', { name: 'Como Passageiro' }));

    expect(await screen.findByText('Falha nas reservas')).toBeInTheDocument();
    expect(listarReservasEnviadas).toHaveBeenCalledTimes(1);

    // O serviço passa a resolver; o clique deve refazer a chamada e carregar.
    listarReservasEnviadas.mockResolvedValue([
      {
        id: 9,
        status: 'ACEITA',
        dataViagem: saidaEm(60),
        quantidadePassageiros: 1,
        motorista: { nome: 'Lucas Pereira' },
        carona: { id: 301, origem: 'Malvinas', destino: 'UFCG' },
      },
    ]);

    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    // A segunda busca acontece, o erro some e a reserva aparece.
    expect(await screen.findByText('Lucas Pereira')).toBeInTheDocument();
    expect(screen.queryByText('Falha nas reservas')).not.toBeInTheDocument();
    expect(listarReservasEnviadas).toHaveBeenCalledTimes(2);
  });
});

describe('formatação de data no card do motorista', () => {
  it('rotula "Amanhã" quando a saída é no dia seguinte', async () => {
    listarMinhasCaronas.mockResolvedValue([
      { ...CARONAS[0], dataHoraSaida: saidaEm(24 * 60) },
    ]);

    renderPagina();

    expect(await screen.findByText(/^Amanhã •/)).toBeInTheDocument();
  });

  it('renderiza o card mesmo sem data/hora de saída', async () => {
    listarMinhasCaronas.mockResolvedValue([
      { ...CARONAS[0], dataHoraSaida: undefined },
    ]);

    renderPagina();

    // Sem data, o card ainda aparece (rota visível) e o rótulo de quando fica vazio.
    expect(await screen.findByText('Bodocongó')).toBeInTheDocument();
  });

  it('usa dd/mm para datas além de amanhã', async () => {
    listarMinhasCaronas.mockResolvedValue([
      { ...CARONAS[0], dataHoraSaida: saidaEm(5 * 24 * 60) },
    ]);

    renderPagina();

    expect(await screen.findByText(/^\d{2}\/\d{2} •/)).toBeInTheDocument();
  });

  it('mostra o valor cru quando a data de saída é inválida', async () => {
    listarMinhasCaronas.mockResolvedValue([
      { ...CARONAS[0], dataHoraSaida: 'data-invalida' },
    ]);

    renderPagina();

    expect(await screen.findByText('data-invalida')).toBeInTheDocument();
  });
});

describe('formatação de data no card do passageiro', () => {
  async function abrirPassageiroCom(reservas) {
    listarReservasEnviadas.mockResolvedValue(reservas);
    renderPagina();
    await screen.findByText('Você ainda não criou nenhuma carona.');
    await userEvent.click(screen.getByRole('tab', { name: 'Como Passageiro' }));
  }

  const base = {
    id: 1,
    status: 'ACEITA',
    quantidadePassageiros: 1,
    motorista: { nome: 'Marina Souza' },
    carona: { id: 201, origem: 'Centenário', destino: 'UFCG' },
  };

  it('usa dd/mm para reservas fora de hoje e o valor cru para datas inválidas', async () => {
    await abrirPassageiroCom([
      { ...base, id: 1, dataViagem: saidaEm(5 * 24 * 60) },
      { ...base, id: 2, dataViagem: 'sem-formato', motorista: { nome: 'João Mendes' } },
    ]);

    expect(await screen.findByText(/^\d{2}\/\d{2}$/)).toBeInTheDocument();
    expect(screen.getByText('sem-formato')).toBeInTheDocument();
  });
});

describe('feedback vindo de outra tela', () => {
  it('exibe a mensagem de sucesso recebida via navegação (ex.: publicação)', async () => {
    listarMinhasCaronas.mockResolvedValue([]);

    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/minhas-caronas',
            state: { mensagem: 'Carona publicada com sucesso.' },
          },
        ]}
      >
        <MinhasCaronas />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText('Carona publicada com sucesso.'),
    ).toBeInTheDocument();
  });
});
