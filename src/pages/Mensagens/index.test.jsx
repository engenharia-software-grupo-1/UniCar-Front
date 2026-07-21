import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Mensagens from './index.jsx';
import { listarChats } from '../../services/chatService.js';

vi.mock('../../services/chatService.js', () => ({
  listarChats: vi.fn(),
}));

const CHATS = [
  {
    id: 10,
    reservaId: 20,
    participanteId: 30,
    nomeParticipante: 'Marina Souza',
    fotoParticipante: '',
    verificado: true,
    origem: 'Centenário',
    destino: 'UFCG',
    dataCarona: '2026-07-22T07:20:00',
    ultimaMensagem: 'Perfeito, chego em 5 min.',
    dataUltimaMensagem: '2026-07-21T08:14:00',
    mensagensNaoLidas: 2,
  },
  {
    id: 11,
    reservaId: 21,
    participanteId: 31,
    nomeParticipante: 'Lucas Pereira',
    fotoParticipante: '',
    origem: 'Liberdade',
    destino: 'UFCG',
    ultimaMensagem: 'Valeu!',
    dataUltimaMensagem: '2026-07-20T09:00:00',
    mensagensNaoLidas: 0,
  },
];

describe('Mensagens', () => {
  beforeEach(() => {
    listarChats.mockResolvedValue(CHATS);
  });

  it('exibe conversas, contador e filtra pelo nome', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><Mensagens /></MemoryRouter>);

    expect(await screen.findByText('Marina Souza')).toBeInTheDocument();
    expect(screen.getByText('2 não lidas')).toBeInTheDocument();
    expect(screen.getByText('Lucas Pereira')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Buscar conversa'), 'Lucas');
    expect(screen.queryByText('Marina Souza')).not.toBeInTheDocument();
    expect(screen.getByText('Lucas Pereira')).toBeInTheDocument();
  });

  it('abre o chat da reserva levando os dados do participante', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/mensagens']}>
        <Routes>
          <Route path="/mensagens" element={<Mensagens />} />
          <Route path="/reservas/:reservaId/chat/:usuarioId" element={<Destino />} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole('button', { name: /Marina Souza/i }));
    expect(screen.getByText('/reservas/20/chat/30')).toBeInTheDocument();
    expect(screen.getByText('Marina Souza')).toBeInTheDocument();
  });
});

function Destino() {
  const location = useLocation();
  return <><span>{location.pathname}</span><span>{location.state?.passageiro?.nome}</span></>;
}
