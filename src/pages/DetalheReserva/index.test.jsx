import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => navigateMock };
});

// A página consome só estas três funções do reservaService.
vi.mock('../../services/reservaService.js', () => ({
  obterDetalhesReserva: vi.fn(),
  cancelarReserva: vi.fn(),
  // A página usa normalizarDetalhesReserva apenas no fallback via location.state,
  // com um objeto já no formato normalizado; identidade basta.
  normalizarDetalhesReserva: vi.fn((reserva) => reserva),
}));

import DetalheReserva from './index.jsx';
import {
  obterDetalhesReserva,
  cancelarReserva,
  normalizarDetalhesReserva,
} from '../../services/reservaService.js';

// Reserva já no formato que normalizarDetalhesReserva devolveria.
const RESERVA = {
  id: 42,
  status: 'ACEITA',
  quantidadePassageiros: 1,
  dataSolicitacao: '2026-07-13T18:42:00',
  dataResposta: '2026-07-13T19:08:00',
  podeCancelar: true,
  carona: {
    id: 201,
    origem: 'Centenário',
    destino: 'Campus Sede',
    dataViagem: '2026-07-20T07:20:00',
    dataHoraChegada: '2026-07-20T07:55:00',
    paradas: [],
    valor: 6,
    vagasTotais: 3,
  },
  motorista: { id: 'marina', nome: 'Marina Souza', avaliacao: 4.9, fotoPerfil: '' },
  passageiros: [],
};

function comStatus(status, extra = {}) {
  return { ...RESERVA, status, ...extra };
}

function renderPagina({ id = '42', state } = {}) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: `/reservas/${id}`, state }]}>
      <Routes>
        <Route path="/reservas/:id" element={<DetalheReserva />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  normalizarDetalhesReserva.mockImplementation((reserva) => reserva);
  obterDetalhesReserva.mockResolvedValue(RESERVA);
  cancelarReserva.mockResolvedValue({ id: 42, status: 'CANCELADA' });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('carregamento', () => {
  it('mostra o estado de carregando antes de resolver e busca pelo id da rota', async () => {
    let resolver;
    obterDetalhesReserva.mockReturnValue(
      new Promise((resolve) => {
        resolver = resolve;
      }),
    );

    renderPagina({ id: '42' });

    expect(screen.getByText('Carregando reserva...')).toBeInTheDocument();
    expect(obterDetalhesReserva).toHaveBeenCalledWith('42');

    resolver(RESERVA);
    await waitFor(() =>
      expect(screen.queryByText('Carregando reserva...')).not.toBeInTheDocument(),
    );
  });

  it('renderiza os detalhes quando o serviço resolve', async () => {
    renderPagina();

    expect(
      await screen.findByRole('heading', { name: 'Reserva confirmada' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Marina Souza')).toBeInTheDocument();
    expect(screen.getByText('Você é passageiro(a)')).toBeInTheDocument();
  });

  it('abre a conversa com o motorista', async () => {
    renderPagina();

    await userEvent.click(
      await screen.findByRole('button', { name: 'Conversar com Marina Souza' }),
    );

    expect(navigateMock).toHaveBeenCalledWith(
      '/reservas/42/chat/marina',
      { state: { passageiro: RESERVA.motorista, status: 'ACEITA' } },
    );
  });
});

describe('fallback resiliente via location.state', () => {
  it('usa a reserva do state quando obterDetalhesReserva rejeita, sem tela de erro', async () => {
    obterDetalhesReserva.mockRejectedValue(new Error('backend fora do ar'));

    renderPagina({ state: { reserva: RESERVA } });

    expect(
      await screen.findByRole('heading', { name: 'Reserva confirmada' }),
    ).toBeInTheDocument();
    expect(normalizarDetalhesReserva).toHaveBeenCalledWith(RESERVA);
    // Não caiu na tela de erro.
    expect(
      screen.queryByRole('heading', { name: 'Não foi possível carregar' }),
    ).not.toBeInTheDocument();
  });

  it('mostra a tela de erro quando rejeita e não há reserva no state', async () => {
    obterDetalhesReserva.mockRejectedValue(new Error('Reserva não encontrada.'));

    renderPagina();

    expect(
      await screen.findByRole('heading', { name: 'Não foi possível carregar' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Reserva não encontrada.');
    expect(
      screen.getByRole('link', { name: 'Voltar às reservas' }),
    ).toHaveAttribute('href', '/historico-caronas');
    expect(normalizarDetalhesReserva).not.toHaveBeenCalled();
  });

  it('usa mensagem genérica quando o erro não traz mensagem e não há state', async () => {
    obterDetalhesReserva.mockRejectedValue(new Error());

    renderPagina();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar os detalhes da reserva.',
    );
  });
});

describe('rótulos por status', () => {
  it('trata status ativo como "Você é passageiro(a)" e título "Reserva confirmada"', async () => {
    obterDetalhesReserva.mockResolvedValue(comStatus('ACEITA'));

    renderPagina();

    expect(
      await screen.findByRole('heading', { name: 'Reserva confirmada' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Você é passageiro(a)')).toBeInTheDocument();
  });

  it('trata status finalizado como "Você foi passageiro(a)" e título "Carona concluída"', async () => {
    obterDetalhesReserva.mockResolvedValue(
      comStatus('FINALIZADA', { podeCancelar: false }),
    );

    renderPagina();

    expect(
      await screen.findByRole('heading', { name: 'Carona concluída' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Você foi passageiro(a)')).toBeInTheDocument();
  });

  it('usa o título de cancelada para reservas canceladas', async () => {
    obterDetalhesReserva.mockResolvedValue(
      comStatus('CANCELADA', { podeCancelar: false }),
    );

    renderPagina();

    expect(
      await screen.findByRole('heading', { name: 'Reserva cancelada' }),
    ).toBeInTheDocument();
  });

  it('conta os passageiros confirmados para a quantidade exibida', async () => {
    obterDetalhesReserva.mockResolvedValue(
      comStatus('ACEITA', {
        quantidadePassageiros: 1,
        passageiros: [
          { id: 'p1', nome: 'João', avaliacao: 4.6, status: 'ACEITA' },
          { id: 'p2', nome: 'Beatriz', avaliacao: 4.9, status: 'ACEITA' },
        ],
      }),
    );

    renderPagina();

    // 2 confirmados sobrepõem o quantidadePassageiros=1.
    expect(await screen.findByText('2 passageiros(as)')).toBeInTheDocument();
  });
});

describe('botão de cancelar', () => {
  it('exibe "Cancelar Reserva" quando podeCancelar é verdadeiro', async () => {
    renderPagina();

    expect(
      await screen.findByRole('button', { name: 'Cancelar Reserva' }),
    ).toBeInTheDocument();
  });

  it('não exibe "Cancelar Reserva" quando podeCancelar é falso', async () => {
    obterDetalhesReserva.mockResolvedValue(
      comStatus('FINALIZADA', { podeCancelar: false }),
    );

    renderPagina();

    await screen.findByRole('heading', { name: 'Carona concluída' });
    expect(
      screen.queryByRole('button', { name: 'Cancelar Reserva' }),
    ).not.toBeInTheDocument();
  });

  it('navega para trás ao clicar em "Voltar ao histórico"', async () => {
    renderPagina();

    await screen.findByRole('heading', { name: 'Reserva confirmada' });
    await userEvent.click(
      screen.getByRole('button', { name: /voltar ao histórico/i }),
    );

    expect(navigateMock).toHaveBeenCalledWith(-1);
  });
});

describe('modal de cancelamento', () => {
  it('abre o modal ao clicar em "Cancelar Reserva" sem cancelar de imediato', async () => {
    renderPagina();

    await userEvent.click(
      await screen.findByRole('button', { name: 'Cancelar Reserva' }),
    );

    const dialog = screen.getByRole('dialog');
    expect(
      within(dialog).getByRole('heading', { name: 'Cancelar reserva' }),
    ).toBeInTheDocument();
    expect(cancelarReserva).not.toHaveBeenCalled();
  });

  it('abre o modal automaticamente quando o state pede abrirCancelamento', async () => {
    renderPagina({ state: { abrirCancelamento: true } });

    await screen.findByRole('heading', { name: 'Reserva confirmada' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('fecha o modal com "Voltar" sem chamar o serviço', async () => {
    renderPagina();

    await userEvent.click(
      await screen.findByRole('button', { name: 'Cancelar Reserva' }),
    );

    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Voltar' }));

    expect(cancelarReserva).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('confirma o cancelamento: atualiza status, esconde o botão, fecha o modal e mostra sucesso', async () => {
    renderPagina();

    await userEvent.click(
      await screen.findByRole('button', { name: 'Cancelar Reserva' }),
    );

    const dialog = screen.getByRole('dialog');
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Confirmar cancelamento' }),
    );

    await waitFor(() => expect(cancelarReserva).toHaveBeenCalledWith(42));

    // Feedback de sucesso e update otimista.
    expect(
      await screen.findByText('Reserva cancelada com sucesso.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Reserva cancelada' }),
    ).toBeInTheDocument();
    // O botão de cancelar some (podeCancelar vira false) e o modal fecha.
    expect(
      screen.queryByRole('button', { name: 'Cancelar Reserva' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('mostra a mensagem de erro dentro do modal quando o cancelamento falha', async () => {
    cancelarReserva.mockRejectedValue(new Error('Não foi possível cancelar a reserva.'));

    renderPagina();

    await userEvent.click(
      await screen.findByRole('button', { name: 'Cancelar Reserva' }),
    );

    const dialog = screen.getByRole('dialog');
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Confirmar cancelamento' }),
    );

    expect(
      await within(dialog).findByText('Não foi possível cancelar a reserva.'),
    ).toBeInTheDocument();
    // O modal continua aberto após a falha.
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
