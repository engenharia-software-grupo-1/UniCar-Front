import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

vi.mock('../../services/caronaService.js', () => ({
  obterCarona: vi.fn(),
  removerReservaCarona: vi.fn(),
}));

vi.mock('../../services/profileService.js', () => ({
  getPerfilUsuarioAutenticado: vi.fn(),
}));

vi.mock('../../services/reservaService.js', () => ({
  aceitarReserva: vi.fn(),
  criarReserva: vi.fn(),
  listarReservasPendentesDaCarona: vi.fn().mockResolvedValue([]),
  recusarReserva: vi.fn(),
}));

import DetalheCarona from './index.jsx';
import { obterCarona } from '../../services/caronaService.js';
import { getPerfilUsuarioAutenticado } from '../../services/profileService.js';
import { criarReserva } from '../../services/reservaService.js';

const CARONA_BASE = {
  id: 10,
  status: 'CRIADA',
  dataHoraSaida: '2026-08-25T07:30:00',
  origem: 'Bodocongó',
  destino: 'UFCG',
  pontoEncontro: 'Portão principal',
  observacao: '',
  valorContribuicao: 5,
  quantidadeVagas: 3,
  vagasDisponiveis: 2,
  motorista: { id: 1, nome: 'João Silva', curso: 'Engenharia', avaliacao: 4.8 },
  veiculo: { id: 1, modelo: 'Onix', cor: 'Prata', placa: 'ABC1D23' },
  passageiros: [],
};

function renderPagina() {
  return render(
    <MemoryRouter initialEntries={['/minhas-caronas/10']}>
      <Routes>
        <Route path="/minhas-caronas/:id" element={<DetalheCarona />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  getPerfilUsuarioAutenticado.mockResolvedValue(null);
});

describe('DetalheCarona — observações do motorista', () => {
  it('mostra a observação quando a carona tem uma', async () => {
    obterCarona.mockResolvedValue({
      ...CARONA_BASE,
      observacao: 'Sem fumantes, aceito até 3 paradas.',
    });

    renderPagina();

    expect(await screen.findByText('Observações do motorista')).toBeInTheDocument();
    expect(
      screen.getByText('Sem fumantes, aceito até 3 paradas.'),
    ).toBeInTheDocument();
  });

  it('não exibe o bloco de observações quando o campo está vazio', async () => {
    obterCarona.mockResolvedValue({ ...CARONA_BASE, observacao: '' });

    renderPagina();

    // Espera a tela carregar por um campo que sempre existe.
    expect(await screen.findByText('Ponto de encontro')).toBeInTheDocument();
    expect(screen.queryByText('Observações do motorista')).not.toBeInTheDocument();
  });
});

describe('DetalheCarona — solicitação de participação', () => {
  it('confirma a reserva e atualiza a ação da tela', async () => {
    obterCarona.mockResolvedValue(CARONA_BASE);
    criarReserva.mockResolvedValue({ id: 50, status: 'PENDENTE' });

    renderPagina();

    await userEvent.click(await screen.findByRole('button', { name: 'Solicitar Participação' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar solicitação' }));

    expect(criarReserva).toHaveBeenCalledWith(10, 1);
    expect(await screen.findByText('Solicitação de participação enviada com sucesso.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Solicitação enviada' })).toBeDisabled();
  });

  it('mostra dentro do modal o erro ao enviar', async () => {
    obterCarona.mockResolvedValue(CARONA_BASE);
    criarReserva.mockRejectedValue(new Error('Não foi possível concluir a reserva.'));

    renderPagina();

    await userEvent.click(await screen.findByRole('button', { name: 'Solicitar Participação' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar solicitação' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível concluir a reserva.');
    expect(screen.getByRole('heading', { name: 'Confirmar solicitação' })).toBeInTheDocument();
  });
});
