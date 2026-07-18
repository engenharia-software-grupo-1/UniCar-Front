import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('../../services/caronaService.js', () => ({
  obterTrajetoRecorrente: vi.fn(),
  listarCaronasDoTrajeto: vi.fn(),
}));

import DetalheTrajetosRecorrentes from './index.jsx';
import {
  obterTrajetoRecorrente,
  listarCaronasDoTrajeto,
} from '../../services/caronaService.js';

const TRAJETO = {
  id: 1,
  origem: 'Bodocongó',
  destino: 'UFCG',
  quantidadeViagens: 2,
  primeiraUtilizacao: '2026-06-15T07:05:00',
  ultimaUtilizacao: '2026-06-17T07:10:00',
};

// A recorrência não é um campo da carona: os dias do trajeto são derivados do
// dia da semana das viagens. 17/06/2026 é uma quarta; 15/06/2026, uma segunda.
const VIAGENS = [
  {
    id: 13,
    status: 'FINALIZADA',
    dataHoraSaida: '2026-06-17T07:10:00',
    quantidadeVagas: 3,
    valorContribuicao: 5,
    passageirosConfirmados: 3,
    veiculo: { id: 1, tipo: 'carro', modelo: 'Onix' },
  },
  {
    id: 12,
    status: 'CANCELADA',
    dataHoraSaida: '2026-06-15T07:05:00',
    quantidadeVagas: 3,
    valorContribuicao: 5,
    passageirosConfirmados: 0,
    veiculo: { id: 1, tipo: 'carro', modelo: 'Onix' },
  },
];

function renderPagina() {
  return render(
    <MemoryRouter initialEntries={['/trajetos-recorrentes/1']}>
      <Routes>
        <Route
          path="/trajetos-recorrentes/:id"
          element={<DetalheTrajetosRecorrentes />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  obterTrajetoRecorrente.mockResolvedValue(TRAJETO);
  listarCaronasDoTrajeto.mockResolvedValue(VIAGENS);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('carregamento', () => {
  it('busca o trajeto da rota e o histórico do par origem→destino', async () => {
    renderPagina();

    expect(screen.getByText('Carregando o trajeto...')).toBeInTheDocument();

    await waitFor(() => expect(obterTrajetoRecorrente).toHaveBeenCalledWith('1'));
    expect(listarCaronasDoTrajeto).toHaveBeenCalledWith('Bodocongó', 'UFCG');
  });

  it('exibe erro quando o trajeto não existe', async () => {
    obterTrajetoRecorrente.mockRejectedValue(
      new Error('Trajeto recorrente não encontrado.'),
    );

    renderPagina();

    expect(
      await screen.findByText('Trajeto recorrente não encontrado.'),
    ).toBeInTheDocument();
  });
});

describe('conteúdo do trajeto', () => {
  it('mostra origem, destino e o total de viagens vindos do serviço', async () => {
    renderPagina();

    expect(await screen.findByText('Bodocongó')).toBeInTheDocument();
    expect(screen.getByText('UFCG')).toBeInTheDocument();
    expect(screen.getByText('Rota recorrente #1')).toBeInTheDocument();
    expect(screen.getByText('realizadas nesse trajeto')).toBeInTheDocument();
  });

  it('deriva horário, vagas e contribuição da última viagem', async () => {
    const { container } = renderPagina();

    await screen.findByText('Bodocongó');

    // O horário também aparece no histórico; aqui interessa o resumo do trajeto.
    const resumo = within(container.querySelector('.info-viagem'));

    expect(resumo.getByText(/07:10/)).toBeInTheDocument();
    expect(resumo.getByText(/3 vagas/)).toBeInTheDocument();
    expect(resumo.getByText(/R\$ 5/)).toBeInTheDocument();
  });

  it('mostra os dias da semana em que o trajeto se repete, na ordem da semana', async () => {
    const { container } = renderPagina();

    await screen.findByText('Bodocongó');

    const chips = [...container.querySelectorAll('.dia-chip')].map(
      (chip) => chip.textContent,
    );

    // Derivados do dia da semana das viagens (15/06 é segunda, 17/06 é quarta) e
    // ordenados pela semana, não pela ordem em que as viagens aparecem.
    expect(chips).toEqual(['Seg', 'Qua']);
  });

  it('não repete o chip quando duas viagens caem no mesmo dia da semana', async () => {
    listarCaronasDoTrajeto.mockResolvedValue([
      VIAGENS[0],
      { ...VIAGENS[1], id: 11, dataHoraSaida: '2026-06-10T07:00:00' }, // outra quarta
    ]);

    const { container } = renderPagina();

    await screen.findByText('Bodocongó');

    const chips = [...container.querySelectorAll('.dia-chip')].map(
      (chip) => chip.textContent,
    );

    expect(chips).toEqual(['Qua']);
  });

  it('lista o histórico real, com data, horário e status de cada viagem', async () => {
    renderPagina();

    expect(await screen.findByText('2 registros')).toBeInTheDocument();
    expect(screen.getByText('17/06 • 07:10')).toBeInTheDocument();
    expect(screen.getByText('3 passageiro(s)')).toBeInTheDocument();
    expect(screen.getByText('15/06 • 07:05')).toBeInTheDocument();
    expect(screen.getByText('finalizada')).toBeInTheDocument();
    expect(screen.getByText('cancelada')).toBeInTheDocument();
  });

  it('não quebra quando o trajeto ainda não tem viagens listadas', async () => {
    listarCaronasDoTrajeto.mockResolvedValue([]);

    renderPagina();

    expect(await screen.findByText('0 registros')).toBeInTheDocument();
    expect(screen.queryByText(/vagas/)).not.toBeInTheDocument();
  });
});

describe('recriar viagem', () => {
  it('navega para ofertar levando o id do trajeto', async () => {
    const user = userEvent.setup();
    renderPagina();

    await user.click(await screen.findByRole('button', { name: /recriar viagem/i }));

    expect(navigateMock).toHaveBeenCalledWith('/ofertar-carona', {
      state: { trajetoId: 1 },
    });
  });

  // O "voltar" deixou de ser da página: agora é global, na Topbar do shell.
});
