import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Topbar from './Topbar.jsx';

vi.mock('../../services/notificationService.js', () => ({
  listarNotificacoes: vi.fn(() => Promise.resolve([])),
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
});
