import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../services/avaliacaoService.js', () => ({
  listarAvaliacoesRecebidas: vi.fn(),
}));

import AvaliacoesRecebidas from './index.jsx';
import { listarAvaliacoesRecebidas } from '../../services/avaliacaoService.js';

const AVALIACOES = [
  {
    id: 1,
    from: 'Mariana',
    nota: 5,
    comentario: 'Pontual e muito educada.',
    dataAvaliacao: '2026-06-15',
  },
  {
    id: 2,
    from: 'Carlos',
    nota: 4,
    comentario: 'Boa comunicação antes da carona.',
    dataAvaliacao: '2026-06-02',
  },
];

function renderPagina() {
  return render(
    <MemoryRouter>
      <AvaliacoesRecebidas />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  listarAvaliacoesRecebidas.mockResolvedValue([]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AvaliacoesRecebidas', () => {
  it('exibe estado de carregamento antes de resolver', async () => {
    let resolver;
    listarAvaliacoesRecebidas.mockReturnValue(
      new Promise((resolve) => {
        resolver = resolve;
      }),
    );

    renderPagina();

    expect(screen.getByText('Carregando avaliações...')).toBeInTheDocument();

    resolver([]);

    await waitFor(() =>
      expect(screen.queryByText('Carregando avaliações...')).not.toBeInTheDocument(),
    );
  });

  it('renderiza nota, comentário, data, média e total', async () => {
    listarAvaliacoesRecebidas.mockResolvedValue(AVALIACOES);

    renderPagina();

    expect(await screen.findByText('Minhas avaliações')).toBeInTheDocument();
    expect(screen.getByText('Mariana')).toBeInTheDocument();
    expect(screen.getByText('Carlos')).toBeInTheDocument();
    expect(await screen.findByText('Pontual e muito educada.')).toBeInTheDocument();
    expect(screen.getByText('Boa comunicação antes da carona.')).toBeInTheDocument();
    expect(screen.getByText('15/06/2026')).toBeInTheDocument();
    expect(screen.getByText('02/06/2026')).toBeInTheDocument();

    const resumo = screen.getByLabelText('Resumo das avaliações');
    expect(within(resumo).getByText('4.5')).toBeInTheDocument();
    expect(within(resumo).getByText('2')).toBeInTheDocument();
    expect(within(resumo).getByText('Comentários')).toBeInTheDocument();
  });

  it('exibe estado vazio com média zero e total zero', async () => {
    listarAvaliacoesRecebidas.mockResolvedValue([]);

    renderPagina();

    expect(
      await screen.findByText('Nenhuma avaliação ainda'),
    ).toBeInTheDocument();

    const resumo = screen.getByLabelText('Resumo das avaliações');
    expect(within(resumo).getByText('0.0')).toBeInTheDocument();
    expect(within(resumo).getByText('0')).toBeInTheDocument();
  });

  it('exibe erro e permite tentar novamente', async () => {
    listarAvaliacoesRecebidas.mockRejectedValueOnce(new Error('Falha ao carregar'));

    renderPagina();

    expect(await screen.findByText('Falha ao carregar')).toBeInTheDocument();

    listarAvaliacoesRecebidas.mockResolvedValueOnce(AVALIACOES);
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByText('Pontual e muito educada.')).toBeInTheDocument();
    expect(listarAvaliacoesRecebidas).toHaveBeenCalledTimes(2);
  });
});
