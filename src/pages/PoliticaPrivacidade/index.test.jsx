import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PoliticaPrivacidade from './index.jsx';

function renderPagina() {
  return render(
    <MemoryRouter>
      <PoliticaPrivacidade />
    </MemoryRouter>,
  );
}

describe('PoliticaPrivacidade', () => {
  it('exibe o conteúdo da política por completo', () => {
    renderPagina();

    expect(screen.getByRole('heading', { name: 'Política de Privacidade' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '1. Finalidade da política' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '10. Contato' })).toBeInTheDocument();
    expect(screen.getByText(/suporte@unicar.app/)).toBeInTheDocument();
  });

  it('usa uma região de leitura com scroll', () => {
    renderPagina();

    const conteudo = screen.getByLabelText('Texto completo da Política de Privacidade');

    expect(conteudo).toHaveClass('privacidade-content');
  });
});
