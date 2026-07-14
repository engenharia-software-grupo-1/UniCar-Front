import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

vi.mock('../../services/caronaService.js', () => ({
  obterCarona: vi.fn(),
  removerReservaCarona: vi.fn(),
}));

vi.mock('../../services/profileService.js', () => ({
  getPerfilUsuarioAutenticado: vi.fn(),
}));

import DetalheCarona from './index.jsx';
import { obterCarona } from '../../services/caronaService.js';
import { getPerfilUsuarioAutenticado } from '../../services/profileService.js';

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
