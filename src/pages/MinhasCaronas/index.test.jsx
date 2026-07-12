import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

// Isola o componente do serviço de caronas.
vi.mock('../../services/caronaService.js', () => ({
  listarMinhasCaronas: vi.fn(),
  cancelarCarona: vi.fn(),
}));

import MinhasCaronas from './index.jsx';
import { listarMinhasCaronas, cancelarCarona } from '../../services/caronaService.js';

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
