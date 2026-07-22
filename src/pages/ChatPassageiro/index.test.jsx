import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  enviarMensagemChat,
  listarMensagensChat,
  marcarMensagensComoLidas,
  obterChatDaReserva,
} from '../../services/chatService.js';
import ChatPassageiro from './index.jsx';

vi.mock('../../services/authService.js', () => ({
  getSession: () => ({ usuario: { id: 1 } }),
}));

vi.mock('../../services/chatService.js', () => ({
  obterChatDaReserva: vi.fn(),
  listarMensagensChat: vi.fn(),
  enviarMensagemChat: vi.fn(),
  marcarMensagensComoLidas: vi.fn(),
}));

function renderPagina() {
  return render(
    <MemoryRouter initialEntries={[{
      pathname: '/reservas/77/chat/5',
      state: { passageiro: { id: 5, nome: 'João Mendes', curso: 'Eng. Civil' }, status: 'ACEITA' },
    }]}>
      <Routes>
        <Route path="/reservas/:reservaId/chat/:usuarioId" element={<ChatPassageiro />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  obterChatDaReserva.mockResolvedValue({ id: 9, reservaId: 77, nomeParticipante: 'João Mendes' });
  listarMensagensChat.mockResolvedValue([]);
  enviarMensagemChat.mockResolvedValue({
    id: 10,
    remetenteId: 1,
    texto: 'Estou chegando.',
    dataEnvio: '2026-07-19T16:00:00',
  });
  marcarMensagensComoLidas.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ChatPassageiro', () => {
  it('exibe o passageiro e envia uma nova mensagem', async () => {
    renderPagina();

    expect(screen.getByText('João Mendes')).toBeInTheDocument();
    const campo = await screen.findByPlaceholderText('Escreva uma mensagem...');
    await userEvent.type(campo, 'Estou chegando.');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar mensagem' }));

    expect(screen.getByText('Estou chegando.')).toBeInTheDocument();
    expect(campo).toHaveValue('');
    expect(obterChatDaReserva).toHaveBeenCalledWith('77');
    expect(enviarMensagemChat).toHaveBeenCalledWith(9, 'Estou chegando.');
  });

  it('fica somente leitura quando o status não permite conversa', async () => {
    render(
      <MemoryRouter initialEntries={[{
        pathname: '/reservas/77/chat/5',
        state: { passageiro: { id: 5, nome: 'João Mendes' }, status: 'FINALIZADA' },
      }]}>
        <Routes>
          <Route path="/reservas/:reservaId/chat/:usuarioId" element={<ChatPassageiro />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByPlaceholderText('Conversa disponível somente para leitura')).toHaveAttribute('readonly');
    expect(screen.getByRole('button', { name: 'Enviar mensagem' })).toBeDisabled();
    await waitFor(() => expect(listarMensagensChat).toHaveBeenCalledWith(9));
  });

  it('busca e exibe novas mensagens automaticamente sem recarregar', async () => {
    vi.useFakeTimers();
    listarMensagensChat
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{
        id: 22,
        remetenteId: 5,
        texto: 'Já estou no ponto de encontro.',
        lida: false,
        dataEnvio: '2026-07-19T16:05:00',
      }]);

    renderPagina();
    await act(async () => Promise.resolve());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(screen.getByText('Já estou no ponto de encontro.')).toBeInTheDocument();
    expect(listarMensagensChat).toHaveBeenCalledTimes(2);
    expect(marcarMensagensComoLidas).toHaveBeenCalledWith(9);
  });
});
