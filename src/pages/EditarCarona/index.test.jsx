import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

vi.mock('../../services/caronaService.js', () => ({
  obterCarona: vi.fn(),
  editarCarona: vi.fn(),
  OBSERVACAO_MAX: 255,
}));

// Mantém o cálculo de teto real; mocka só a rede.
vi.mock('../../services/geocodingService.js', async (importOriginal) => {
  const real = await importOriginal();
  return { ...real, geocodificarEndereco: vi.fn() };
});

import EditarCarona from './index.jsx';
import { obterCarona, editarCarona } from '../../services/caronaService.js';
import {
  geocodificarEndereco,
  calcularTetoContribuicao,
  contribuicaoMaxima,
} from '../../services/geocodingService.js';

const COORD_ORIGEM = { latitude: -7.21456, longitude: -35.90872 };
const COORD_DESTINO = { latitude: -7.07, longitude: -35.9095 }; // ~16 km → teto ~R$16

const CARONA = {
  id: 10,
  status: 'CRIADA',
  dataHoraSaida: '2026-08-25T07:30:00',
  origem: 'Bodocongó',
  destino: 'UFCG',
  origemCoordenadas: COORD_ORIGEM,
  destinoCoordenadas: COORD_DESTINO,
  pontoEncontro: 'Portão principal',
  observacao: '',
  valorContribuicao: 8,
  quantidadeVagas: 3,
  vagasDisponiveis: 1,
  passageirosConfirmados: 0,
  veiculo: { id: 1, tipo: 'carro', modelo: 'Onix', cor: 'Prata', placa: 'ABC1D23' },
};

function renderPagina() {
  return render(
    <MemoryRouter initialEntries={['/minhas-caronas/10/editar']}>
      <Routes>
        <Route path="/minhas-caronas/:id/editar" element={<EditarCarona />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('EditarCarona — teto de contribuição por distância', () => {
  it('limita o slider ao teto do trajeto, com passo de R$ 0,50', async () => {
    obterCarona.mockResolvedValue(CARONA);

    renderPagina();

    const slider = await screen.findByLabelText('Contribuição por passageiro');
    const max = contribuicaoMaxima(calcularTetoContribuicao(COORD_ORIGEM, COORD_DESTINO));

    expect(slider).toHaveAttribute('max', String(max));
    expect(slider).toHaveAttribute('step', '0.5');
  });

  it('clampa ao carregar um valor legado acima do teto', async () => {
    obterCarona.mockResolvedValue({ ...CARONA, valorContribuicao: 30 });

    renderPagina();

    const slider = await screen.findByLabelText('Contribuição por passageiro');
    const max = contribuicaoMaxima(calcularTetoContribuicao(COORD_ORIGEM, COORD_DESTINO));

    expect(slider).toHaveValue(String(max));
  });

  it('cai no fallback (sem cap por distância) quando a carona não tem coordenadas', async () => {
    obterCarona.mockResolvedValue({
      ...CARONA,
      origemCoordenadas: null,
      destinoCoordenadas: null,
    });

    renderPagina();

    const slider = await screen.findByLabelText('Contribuição por passageiro');
    // Sem coordenadas: nada de teto por distância; o back ainda valida no submit.
    expect(slider).toHaveAttribute('max', '20');
  });

  it('salva reusando as coordenadas preservadas, sem geocodificar', async () => {
    const user = userEvent.setup();
    obterCarona.mockResolvedValue(CARONA);
    editarCarona.mockResolvedValue({ id: 10 });

    renderPagina();

    const slider = await screen.findByLabelText('Contribuição por passageiro');
    fireEvent.change(slider, { target: { value: '5' } }); // habilita "Salvar alterações"

    await user.click(screen.getByRole('button', { name: /salvar alterações/i }));

    await waitFor(() => expect(editarCarona).toHaveBeenCalled());
    expect(geocodificarEndereco).not.toHaveBeenCalled();

    const [, dados] = editarCarona.mock.calls[0];
    expect(dados.origem).toEqual({ descricao: 'Bodocongó', ...COORD_ORIGEM });
    expect(dados.destino).toEqual({ descricao: 'UFCG', ...COORD_DESTINO });
  });
});
