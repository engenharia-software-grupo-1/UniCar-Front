import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Topbar from './Topbar.jsx';
import { temMensagensChatNaoLidas } from '../../services/chatService.js';

vi.mock('../../services/notificationService.js', () => ({
  listarNotificacoes: vi.fn(() => Promise.resolve([])),
}));

vi.mock('../../services/chatService.js', () => ({
  temMensagensChatNaoLidas: vi.fn(() => Promise.resolve(false)),
}));

function renderNaRota(pathname) {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <Topbar />
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('Topbar', () => {
  it.each([
    '/reservas/42',
    '/reservas/42/chat/7',
    '/minhas-caronas/15/chat/7',
  ])('mostra o voltar global em %s', (rota) => {
    renderNaRota(rota);

    expect(screen.getByRole('button', { name: 'Voltar' })).toBeInTheDocument();
  });

  it('mantém o voltar global nas demais rotas internas', () => {
    renderNaRota('/historico/42');

    expect(screen.getByRole('button', { name: 'Voltar' })).toBeInTheDocument();
  });

  it('mostra o alerta visual quando há mensagem de chat não lida', async () => {
    temMensagensChatNaoLidas.mockResolvedValueOnce(true);
    const { container } = renderNaRota('/inicio');

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Notificações e mensagens não lidas' })).toBeInTheDocument();
    });
    expect(container.querySelector('.topbar__badge')).toBeInTheDocument();
  });
});
