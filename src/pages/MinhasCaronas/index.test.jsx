import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

// Isola o componente do serviço de caronas.
vi.mock('../../services/caronaService.js', () => ({
  listarMinhasCaronas: vi.fn(),
}));

import MinhasCaronas from './index.jsx';
import { listarMinhasCaronas } from '../../services/caronaService.js';

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

  it('mantém ações principais desabilitadas e permite abrir detalhes', async () => {
    listarMinhasCaronas.mockResolvedValue(CARONAS);

    renderPagina();

    expect(await screen.findByRole('button', { name: /iniciar/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /cancelar carona/i })).toBeDisabled();
    expect(screen.getByRole('link', { name: /ver detalhes da carona/i })).toHaveAttribute(
      'href',
      '/minhas-caronas/10',
    );
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
