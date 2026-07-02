import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import CentralAjuda from './index.jsx';

function renderPagina() {
  return render(
    <MemoryRouter>
      <CentralAjuda />
    </MemoryRouter>,
  );
}

describe('CentralAjuda', () => {
  it('exibe busca, categorias, perguntas frequentes e contatos', () => {
    renderPagina();

    expect(screen.getByRole('heading', { name: 'Central de Ajuda' })).toBeInTheDocument();
    expect(screen.getByLabelText('Buscar na Central de Ajuda')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Todos/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Conta/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Caronas/ })).toBeInTheDocument();
    expect(screen.getByText('Como faço login pelo SIGAA?')).toBeInTheDocument();
    expect(screen.getByText('Como reservo uma vaga?')).toBeInTheDocument();

    const contato = screen.getByLabelText('Informações de contato');
    expect(within(contato).queryByText('Chat com suporte')).not.toBeInTheDocument();
    expect(within(contato).getByText('suporte@unicar.app')).toBeInTheDocument();
  });

  it('filtra perguntas por categoria', async () => {
    renderPagina();

    await userEvent.click(screen.getByRole('button', { name: /Segurança/ }));

    expect(screen.getByText('Como denuncio um usuário?')).toBeInTheDocument();
    expect(screen.getByText('O que significa o selo de motorista verificado?')).toBeInTheDocument();
    expect(screen.queryByText('Como reservo uma vaga?')).not.toBeInTheDocument();
    expect(screen.getByText('2 resultados')).toBeInTheDocument();
  });

  it('filtra perguntas pela busca textual', async () => {
    renderPagina();

    await userEvent.type(screen.getByLabelText('Buscar na Central de Ajuda'), 'alertas');

    expect(screen.getByText('Como ativo alertas de novas caronas?')).toBeInTheDocument();
    expect(screen.queryByText('Como faço login pelo SIGAA?')).not.toBeInTheDocument();
    expect(screen.getByText('1 resultado')).toBeInTheDocument();
  });

  it('exibe estado vazio quando não há resultados', async () => {
    renderPagina();

    await userEvent.type(screen.getByLabelText('Buscar na Central de Ajuda'), 'banana');

    expect(screen.getByText('Nenhum resultado encontrado')).toBeInTheDocument();
    expect(screen.getByText('0 resultados')).toBeInTheDocument();
  });

  it('permite expandir uma pergunta do FAQ', async () => {
    renderPagina();

    const pergunta = screen.getByText('Como funciona a contribuição?');
    const detalhe = pergunta.closest('details');

    expect(detalhe).not.toHaveAttribute('open');

    await userEvent.click(pergunta);

    expect(detalhe).toHaveAttribute('open');
    expect(screen.getByText(/O valor sugerido aparece no card da carona/)).toBeInTheDocument();
  });
});
