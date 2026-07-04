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

const CARONAS = [
  {
    id: 10,
    status: 'CRIADA',
    dataHoraSaida: '2026-06-25T13:30:00',
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

  it('mantém "Iniciar" e "Ver detalhes" desabilitados, mas habilita "Cancelar" para caronas CRIADA', async () => {
    listarMinhasCaronas.mockResolvedValue(CARONAS);

    renderPagina();

    expect(await screen.findByRole('button', { name: /iniciar/i })).toBeDisabled();
    expect(
      screen.getByRole('button', { name: /ver detalhes da carona/i }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: /cancelar carona/i })).toBeEnabled();
  });

  it('desabilita "Cancelar" quando a carona não está CRIADA', async () => {
    listarMinhasCaronas.mockResolvedValue([{ ...CARONAS[0], status: 'FINALIZADA' }]);

    renderPagina();

    await screen.findByText('Finalizada');
    expect(screen.getByRole('button', { name: /cancelar carona/i })).toBeDisabled();
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
    expect(screen.getByText('Cancelada')).toBeInTheDocument();
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
