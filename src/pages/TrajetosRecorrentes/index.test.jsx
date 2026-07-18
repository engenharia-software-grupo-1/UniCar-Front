import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('../../services/caronaService', () => ({
  listarTrajetosRecorrentes: vi.fn(),
}));

import TrajetosRecorrentes from './index.jsx';
import { listarTrajetosRecorrentes } from '../../services/caronaService';

// Exatamente o que o contrato do US8 entrega: um trajeto é só origem, destino e
// as marcas de uso. Nada de horário, vagas ou contribuição (RN-TRJ-08).
const TRAJETOS = [
  {
    id: 1,
    origem: 'Bodocongó',
    destino: 'UFCG',
    quantidadeViagens: 3,
    primeiraUtilizacao: '2026-06-15T07:05:00',
    ultimaUtilizacao: '2026-07-10T07:10:00',
  },
  {
    id: 2,
    origem: 'Catolé',
    destino: 'UFCG',
    quantidadeViagens: 2,
    primeiraUtilizacao: '2026-06-20T07:00:00',
    ultimaUtilizacao: '2026-07-08T07:00:00',
  },
];

function renderPagina() {
  return render(
    <MemoryRouter>
      <TrajetosRecorrentes />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  listarTrajetosRecorrentes.mockResolvedValue(TRAJETOS);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('listagem', () => {
  it('lista um card por trajeto, com a rota e quantas vezes foi feita', async () => {
    renderPagina();

    expect(await screen.findByText('Bodocongó')).toBeInTheDocument();
    expect(screen.getByText('Catolé')).toBeInTheDocument();
    expect(screen.getAllByText('UFCG')).toHaveLength(2);
    expect(screen.getByText(/3x realizadas/)).toBeInTheDocument();
    expect(screen.getByText(/2x realizadas/)).toBeInTheDocument();
  });

  it('mostra a data da última viagem de cada trajeto', async () => {
    renderPagina();

    expect(await screen.findByText('Última viagem em 10/07')).toBeInTheDocument();
    expect(screen.getByText('Última viagem em 08/07')).toBeInTheDocument();
  });

  it('explica a regra das duas viagens quando não há trajeto algum', async () => {
    listarTrajetosRecorrentes.mockResolvedValue([]);

    renderPagina();

    expect(
      await screen.findByText('Você ainda não possui trajetos recorrentes.'),
    ).toBeInTheDocument();
    expect(screen.getByText(/mesma viagem duas vezes/)).toBeInTheDocument();
  });

  it('avisa quando a busca falha, em vez de fingir que a lista está vazia', async () => {
    listarTrajetosRecorrentes.mockRejectedValue(new Error('Falha na conexão.'));

    renderPagina();

    expect(await screen.findByRole('alert')).toHaveTextContent('Falha na conexão.');
    expect(
      screen.queryByText('Você ainda não possui trajetos recorrentes.'),
    ).not.toBeInTheDocument();
  });
});

// O trajeto é derivado do histórico, não uma entidade: não há flag para pausar
// nem linha para excluir (e apagar as caronas que o compõem violaria a
// RN-AUTH-10, que manda preservar o histórico). Os botões que prometiam isso
// só mexiam no state local — não podem voltar.
describe('ações impossíveis', () => {
  it('não oferece pausar, ativar nem excluir', async () => {
    renderPagina();

    await screen.findByText('Bodocongó');

    expect(screen.queryByRole('button', { name: /pausar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /ativar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /excluir/i })).not.toBeInTheDocument();
  });

  // Um trajeto não se cria: ele nasce do histórico. Um "+" no cabeçalho prometia
  // um cadastro que não existe.
  it('não oferece criar um trajeto', async () => {
    renderPagina();

    await screen.findByText('Bodocongó');

    expect(screen.queryByRole('button', { name: /ofertar|adicionar|novo/i })).not.toBeInTheDocument();
  });

  it('não inventa horário, vagas ou contribuição — eles são da carona, não do trajeto', async () => {
    renderPagina();

    await screen.findByText('Bodocongó');

    expect(screen.queryByText(/vagas/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/R\$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\d{2}:\d{2}/)).not.toBeInTheDocument();
  });
});

describe('navegação', () => {
  it('recria a viagem levando o id do trajeto para o formulário', async () => {
    const user = userEvent.setup();
    renderPagina();

    const botoes = await screen.findAllByRole('button', { name: /recriar viagem/i });
    await user.click(botoes[0]);

    expect(navigateMock).toHaveBeenCalledWith('/ofertar-carona', {
      state: { trajetoId: 1 },
    });
  });

  it('abre o detalhe ao clicar no card', async () => {
    const user = userEvent.setup();
    renderPagina();

    await user.click(
      await screen.findByRole('link', {
        name: 'Ver detalhes da rota Catolé para UFCG',
      }),
    );

    expect(navigateMock).toHaveBeenCalledWith('/trajetos-recorrentes/2');
  });
});
