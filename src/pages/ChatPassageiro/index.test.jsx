import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import ChatPassageiro from './index.jsx';

function renderPagina() {
  return render(
    <MemoryRouter initialEntries={[{
      pathname: '/minhas-caronas/10/chat/5',
      state: { passageiro: { id: 5, nome: 'João Mendes', curso: 'Eng. Civil' }, status: 'ACEITA' },
    }]}>
      <Routes>
        <Route path="/minhas-caronas/:caronaId/chat/:usuarioId" element={<ChatPassageiro />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ChatPassageiro', () => {
  it('exibe o passageiro e envia uma nova mensagem', async () => {
    renderPagina();

    expect(screen.getByText('João Mendes')).toBeInTheDocument();
    const campo = screen.getByPlaceholderText('Escreva uma mensagem...');
    await userEvent.type(campo, 'Estou chegando.');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar mensagem' }));

    expect(screen.getByText('Estou chegando.')).toBeInTheDocument();
    expect(campo).toHaveValue('');
  });

  it('fica somente leitura quando o status não permite conversa', () => {
    render(
      <MemoryRouter initialEntries={[{
        pathname: '/minhas-caronas/10/chat/5',
        state: { passageiro: { id: 5, nome: 'João Mendes' }, status: 'FINALIZADA' },
      }]}>
        <Routes>
          <Route path="/minhas-caronas/:caronaId/chat/:usuarioId" element={<ChatPassageiro />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByPlaceholderText('Conversa disponível somente para leitura')).toHaveAttribute('readonly');
    expect(screen.getByRole('button', { name: 'Enviar mensagem' })).toBeDisabled();
  });
});
