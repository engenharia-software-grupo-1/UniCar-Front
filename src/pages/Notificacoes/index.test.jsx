import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../services/notificationService.js', () => ({
  listarNotificacoes: vi.fn(),
  marcarNotificacaoComoLida: vi.fn(),
}));

vi.mock('../../services/chatService.js', () => ({
  listarAlertasChatNaoLidas: vi.fn(() => Promise.resolve([])),
  marcarMensagensComoLidas: vi.fn(),
}));

import Notificacoes from './index.jsx';
import {
  listarNotificacoes,
  marcarNotificacaoComoLida,
} from '../../services/notificationService.js';
import { listarAlertasChatNaoLidas, marcarMensagensComoLidas } from '../../services/chatService.js';

// A contagem de não-lidas fica no <p> do titlebar (ex.: "2 não lidas"); o texto
// é dividido em nós ({total} + rótulo), então casamos pelo textContent do <p>.
const contagemNaoLidas = (texto) => (_conteudo, el) =>
  el?.tagName === 'P' && el.textContent.trim() === texto;

const NOTIFICACOES = [
  {
    id: 1,
    titulo: 'Carona cancelada',
    mensagem: 'Ana cancelou a carona de amanhã 06:45.',
    detalhes: 'A carona foi cancelada pela motorista.',
    dataHora: '2026-07-03T18:20:00-03:00',
    lida: true,
    tipo: 'cancelada',
  },
  {
    id: 2,
    titulo: 'Lembrete de partida',
    mensagem: 'Sua carona com Lucas sai em 30 minutos.',
    detalhes: 'Sua carona com Lucas sai em 30 minutos.',
    dataHora: '2026-07-04T08:00:00-03:00',
    lida: false,
    tipo: 'lembrete',
  },
  {
    id: 3,
    titulo: 'Vaga confirmada',
    mensagem: 'Sua vaga na carona de Marina (07:20) foi confirmada.',
    detalhes: 'Chegue ao ponto de encontro com alguns minutos de antecedência.',
    dataHora: '2026-07-04T08:55:00-03:00',
    lida: false,
    tipo: 'confirmada',
  },
];

function renderPagina() {
  return render(
    <MemoryRouter>
      <Notificacoes />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  listarNotificacoes.mockResolvedValue(NOTIFICACOES);
  marcarNotificacaoComoLida.mockResolvedValue({ id: 3, lida: true });
  listarAlertasChatNaoLidas.mockResolvedValue([]);
  marcarMensagensComoLidas.mockResolvedValue();
});

describe('Notificacoes', () => {
  it('renderiza notificações carregadas do serviço', async () => {
    renderPagina();

    expect(await screen.findByText('Vaga confirmada')).toBeInTheDocument();
    expect(screen.getByText('Carona cancelada')).toBeInTheDocument();
    expect(
      screen.getByText('Sua vaga na carona de Marina (07:20) foi confirmada.'),
    ).toBeInTheDocument();
  });

  it('exibe notificações em ordem cronológica inversa', async () => {
    renderPagina();

    const lista = await screen.findByRole('list', { name: 'Lista de notificações' });
    const itens = within(lista).getAllByRole('listitem');

    expect(within(itens[0]).getByText('Vaga confirmada')).toBeInTheDocument();
    expect(within(itens[1]).getByText('Lembrete de partida')).toBeInTheDocument();
    expect(within(itens[2]).getByText('Carona cancelada')).toBeInTheDocument();
  });

  it('diferencia notificação não lida de lida', async () => {
    renderPagina();

    const naoLida = await screen.findByText('Vaga confirmada');
    const lida = screen.getByText('Carona cancelada');

    expect(naoLida.closest('li')).toHaveClass('notificacoes-card--nao-lida');
    expect(lida.closest('li')).toHaveClass('notificacoes-card--lida');
    expect(screen.getAllByLabelText('Notificação não lida')).toHaveLength(2);
  });

  it('exibe estado vazio quando não há notificações', async () => {
    listarNotificacoes.mockResolvedValue([]);

    renderPagina();

    expect(await screen.findByText('Nenhuma notificação')).toBeInTheDocument();
  });

  it('inclui a mensagem nova do chat na central de notificações', async () => {
    listarNotificacoes.mockResolvedValue([]);
    listarAlertasChatNaoLidas.mockResolvedValue([{
      id: 'chat-9',
      chatId: 9,
      titulo: 'Nova mensagem de Marina',
      mensagem: 'Estou chegando.',
      detalhes: 'Estou chegando.',
      dataHora: '2026-07-04T08:55:00-03:00',
      lida: false,
      tipo: 'chat',
    }]);

    renderPagina();

    await userEvent.click(await screen.findByRole('button', { name: /Nova mensagem de Marina/ }));
    expect(marcarMensagensComoLidas).toHaveBeenCalledWith(9);
  });

  it('mantém o alerta do chat quando a API geral de notificações falha', async () => {
    listarNotificacoes.mockRejectedValue(new Error('Serviço indisponível.'));
    listarAlertasChatNaoLidas.mockResolvedValue([{
      id: 'chat-9',
      chatId: 9,
      titulo: 'Nova mensagem de Marina',
      mensagem: 'Estou chegando.',
      detalhes: 'Estou chegando.',
      dataHora: '2026-07-04T08:55:00-03:00',
      lida: false,
      tipo: 'chat',
    }]);

    renderPagina();

    expect(await screen.findByText('Nova mensagem de Marina')).toBeInTheDocument();
    expect(screen.queryByText('Serviço indisponível.')).not.toBeInTheDocument();
  });

  it('expande uma notificação não lida, dispara atualização e muda o visual para lida', async () => {
    renderPagina();

    expect(
      await screen.findByText(contagemNaoLidas('2 não lidas')),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Vaga confirmada/ }));

    expect(
      screen.getByText(
        'Sua vaga na carona de Marina (07:20) foi confirmada. Ponto de encontro: Praça da Bandeira, saída às 07:15. Leve o comprovante da matrícula para agilizar o embarque.',
      ),
    ).toBeInTheDocument();
    expect(marcarNotificacaoComoLida).toHaveBeenCalledWith(3);
    const lista = screen.getByRole('list', { name: 'Lista de notificações' });
    expect(within(lista).getByText('Vaga confirmada').closest('li')).toHaveClass(
      'notificacoes-card--lida',
    );
    expect(screen.getByText(contagemNaoLidas('1 não lida'))).toBeInTheDocument();
  });

  it('separa os parágrafos da mensagem detalhada', async () => {
    listarNotificacoes.mockResolvedValue([{
      id: 4,
      titulo: 'Nova solicitação de reserva',
      mensagem: 'Olá!\n\nDetalhes da solicitação\nPassageiro: Oscar\nDestino: UFCG\n\nAcesse o UniCar para analisar a solicitação.',
      detalhes: 'Olá!\n\nDetalhes da solicitação\nPassageiro: Oscar\nDestino: UFCG\n\nAcesse o UniCar para analisar a solicitação.',
      dataHora: '2026-07-04T08:55:00-03:00',
      lida: false,
      tipo: 'sistema',
    }]);

    const user = userEvent.setup();
    renderPagina();

    await user.click(await screen.findByRole('button', { name: /Nova solicitação de reserva/ }));

    const modal = screen.getByRole('dialog');
    expect(within(modal).getByText('Olá!')).toBeInTheDocument();
    expect(within(modal).getByText(/Passageiro: Oscar/)).toBeInTheDocument();
    expect(
      within(modal).getByText('Acesse o UniCar para analisar a solicitação.'),
    ).toBeInTheDocument();
  });
});
