import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('../../services/vehicleService.js', () => ({
  listarVeiculos: vi.fn(),
}));

vi.mock('../../services/caronaService.js', () => ({
  criarCarona: vi.fn(),
}));

import OfertarCarona from './index.jsx';
import { listarVeiculos } from '../../services/vehicleService.js';
import { criarCarona } from '../../services/caronaService.js';

const VEICULOS = [
  { id: 1, modelo: 'Onix', cor: 'Prata', placa: 'ABC-1D23' }, // sem tipo → carro
  { id: 2, modelo: 'CG 160', cor: 'Preta', placa: 'MOT-9A11', tipo: 'moto' },
];

// Datas relativas ao "agora" real para que a validação de data futura seja
// determinística independentemente do relógio da máquina de testes.
function isoLocal(dias) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const DATA_FUTURA = isoLocal(30);
const DATA_FUTURA_BR = DATA_FUTURA.split('-').reverse().join('/');
const DATA_PASSADA = isoLocal(-5);

function renderPagina() {
  return render(
    <MemoryRouter>
      <OfertarCarona />
    </MemoryRouter>,
  );
}

async function preencherPasso1(user) {
  await user.type(screen.getByPlaceholderText('De onde você sai'), 'Bodocongó');
  await user.type(screen.getByPlaceholderText('Para onde você vai'), 'UFCG');
  fireEvent.change(screen.getByLabelText('Data'), { target: { value: DATA_FUTURA } });
  fireEvent.change(screen.getByLabelText('Horário'), { target: { value: '07:00' } });
  await user.type(
    screen.getByPlaceholderText('Onde os passageiros te encontram'),
    'Portão principal',
  );
  await user.click(screen.getByRole('button', { name: 'Continuar' }));
}

async function abrirDropdownVeiculo(user) {
  const trigger = await screen.findByRole('button', { name: /selecione um veículo/i });
  await user.click(trigger);
  return trigger;
}

beforeEach(() => {
  vi.clearAllMocks();
  listarVeiculos.mockResolvedValue(VEICULOS);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('breadcrumb e navegação entre passos', () => {
  it('começa no passo 1 de 3', async () => {
    renderPagina();

    // Aguarda o carregamento assíncrono de veículos (useEffect no mount)
    // concluir dentro de act(...) antes de encerrar o teste.
    expect(await screen.findByText('Passo 1 de 3')).toBeInTheDocument();
    expect(screen.getByText('Trajeto e horário')).toBeInTheDocument();
  });

  it('mostra a validação inline de cada campo obrigatório faltante', async () => {
    const user = userEvent.setup();
    renderPagina();

    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(screen.getByText('Informe o ponto de partida.')).toBeInTheDocument();
    expect(screen.getByText('Informe o destino.')).toBeInTheDocument();
    expect(screen.getByText('Informe a data.')).toBeInTheDocument();
    expect(screen.getByText('Informe o horário.')).toBeInTheDocument();
    expect(screen.getByText('Informe o ponto de encontro.')).toBeInTheDocument();
    expect(screen.getByText('Passo 1 de 3')).toBeInTheDocument();
  });

  it('valida isoladamente apenas os campos ainda em falta', async () => {
    const user = userEvent.setup();
    renderPagina();

    // Preenche tudo, menos destino e ponto de encontro.
    await user.type(screen.getByPlaceholderText('De onde você sai'), 'Bodocongó');
    fireEvent.change(screen.getByLabelText('Data'), { target: { value: DATA_FUTURA } });
    fireEvent.change(screen.getByLabelText('Horário'), { target: { value: '07:00' } });
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(screen.getByText('Informe o destino.')).toBeInTheDocument();
    expect(screen.getByText('Informe o ponto de encontro.')).toBeInTheDocument();
    expect(screen.queryByText('Informe o ponto de partida.')).not.toBeInTheDocument();
    expect(screen.queryByText('Informe a data.')).not.toBeInTheDocument();
  });

  it('rejeita data no passado exigindo uma data futura', async () => {
    const user = userEvent.setup();
    renderPagina();

    await user.type(screen.getByPlaceholderText('De onde você sai'), 'Bodocongó');
    await user.type(screen.getByPlaceholderText('Para onde você vai'), 'UFCG');
    fireEvent.change(screen.getByLabelText('Data'), { target: { value: DATA_PASSADA } });
    fireEvent.change(screen.getByLabelText('Horário'), { target: { value: '07:00' } });
    await user.type(
      screen.getByPlaceholderText('Onde os passageiros te encontram'),
      'Portão principal',
    );
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(screen.getByText('A data deve ser no futuro.')).toBeInTheDocument();
    expect(screen.getByText('Passo 1 de 3')).toBeInTheDocument();
  });

  it('limpa a validação de um campo ao começar a preenchê-lo', async () => {
    const user = userEvent.setup();
    renderPagina();

    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(screen.getByText('Informe o destino.')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Para onde você vai'), 'UFCG');
    expect(screen.queryByText('Informe o destino.')).not.toBeInTheDocument();
  });

  it('avança para o passo 2 quando o trajeto está completo', async () => {
    const user = userEvent.setup();
    renderPagina();

    await preencherPasso1(user);

    expect(screen.getByText('Passo 2 de 3')).toBeInTheDocument();
    expect(screen.getByText('Veículo e vagas')).toBeInTheDocument();
  });

  it('volta do passo 2 para o passo 1 preservando os dados', async () => {
    const user = userEvent.setup();
    renderPagina();

    await preencherPasso1(user);
    await user.click(screen.getByRole('button', { name: 'Voltar' }));

    expect(screen.getByText('Passo 1 de 3')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('De onde você sai')).toHaveValue('Bodocongó');
  });
});

describe('passo 2 — veículo e vagas', () => {
  it('lista apenas veículos do tipo carro por padrão', async () => {
    const user = userEvent.setup();
    renderPagina();

    await preencherPasso1(user);
    await abrirDropdownVeiculo(user);

    expect(screen.getByRole('option', { name: 'Onix • Prata • ABC-1D23' })).toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: 'CG 160 • Preta • MOT-9A11' }),
    ).not.toBeInTheDocument();
  });

  it('oferece de 1 a 4 vagas habilitadas para carro', async () => {
    const user = userEvent.setup();
    renderPagina();

    await preencherPasso1(user);

    const grupo = screen.getByRole('group', { name: 'Número de vagas' });
    const opcoes = within(grupo).getAllByRole('button');

    expect(opcoes).toHaveLength(4);
    opcoes.forEach((botao) => expect(botao).toBeEnabled());
    expect(within(grupo).getByRole('button', { name: '1' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('seleciona a quantidade de vagas ao clicar na pill', async () => {
    const user = userEvent.setup();
    renderPagina();

    await preencherPasso1(user);

    const grupo = screen.getByRole('group', { name: 'Número de vagas' });
    await user.click(within(grupo).getByRole('button', { name: '3' }));

    expect(within(grupo).getByRole('button', { name: '3' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('limita a moto a 1 vaga e mostra o aviso de segurança', async () => {
    const user = userEvent.setup();
    renderPagina();

    await preencherPasso1(user);
    await user.click(screen.getByRole('button', { name: 'Moto' }));

    const grupo = screen.getByRole('group', { name: 'Número de vagas' });
    expect(within(grupo).getByRole('button', { name: '1' })).toBeEnabled();
    expect(within(grupo).getByRole('button', { name: '2' })).toBeDisabled();
    expect(within(grupo).getByRole('button', { name: '3' })).toBeDisabled();
    expect(within(grupo).getByRole('button', { name: '4' })).toBeDisabled();
    expect(within(grupo).getByRole('button', { name: '1' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    expect(screen.getByText(/Garanta capacete extra/i)).toBeInTheDocument();

    await abrirDropdownVeiculo(user);
    expect(
      screen.getByRole('option', { name: 'CG 160 • Preta • MOT-9A11' }),
    ).toBeInTheDocument();
  });

  it('exige a seleção de um veículo para avançar, com erro inline', async () => {
    const user = userEvent.setup();
    renderPagina();

    await preencherPasso1(user);
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(screen.getByText('Selecione um veículo.')).toBeInTheDocument();
    expect(screen.getByText('Passo 2 de 3')).toBeInTheDocument();
  });

  it('ajusta a contribuição pelo slider', async () => {
    const user = userEvent.setup();
    renderPagina();

    await preencherPasso1(user);

    const slider = screen.getByLabelText('Contribuição por passageiro');
    fireEvent.change(slider, { target: { value: '12' } });

    expect(screen.getByText('R$ 12')).toBeInTheDocument();
  });
});

describe('passo 3 — revisão e publicação', () => {
  async function chegarNoResumo(user) {
    await preencherPasso1(user);

    await abrirDropdownVeiculo(user);
    await user.click(screen.getByRole('option', { name: 'Onix • Prata • ABC-1D23' }));

    await user.click(screen.getByRole('button', { name: 'Continuar' }));
  }

  it('mostra o resumo com trajeto, dia, vagas, valor e tipo', async () => {
    const user = userEvent.setup();
    renderPagina();

    await chegarNoResumo(user);

    expect(screen.getByText('Passo 3 de 3')).toBeInTheDocument();
    expect(screen.getByText('Revisão')).toBeInTheDocument();
    expect(screen.getByText(/Bodocongó/)).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(`${DATA_FUTURA_BR} às 07:00`)),
    ).toBeInTheDocument();
    expect(screen.getByText(/1 vaga • R\$ 5/)).toBeInTheDocument();
  });

  it('não exibe a caixa de observações no último passo', async () => {
    const user = userEvent.setup();
    renderPagina();

    await chegarNoResumo(user);

    expect(screen.queryByLabelText('Observações')).not.toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText(/aceito até 3 paradas/i),
    ).not.toBeInTheDocument();
  });

  it('publica a carona com o payload correto e navega para minhas caronas', async () => {
    const user = userEvent.setup();
    criarCarona.mockResolvedValue({ id: 42, status: 'CRIADA' });
    renderPagina();

    await chegarNoResumo(user);
    await user.click(screen.getByRole('button', { name: 'Publicar carona' }));

    await waitFor(() =>
      expect(criarCarona).toHaveBeenCalledWith({
        veiculoId: 1,
        origem: 'Bodocongó',
        destino: 'UFCG',
        pontoEncontro: 'Portão principal',
        dataHoraSaida: `${DATA_FUTURA}T07:00:00`,
        quantidadeVagas: 1,
        valorContribuicao: 5,
      }),
    );

    expect(navigateMock).toHaveBeenCalledWith('/minhas-caronas', {
      state: { mensagem: 'Carona publicada com sucesso.' },
    });
  });

  it('exibe erro quando a publicação falha', async () => {
    const user = userEvent.setup();
    criarCarona.mockRejectedValue(new Error('Não foi possível publicar a carona.'));
    renderPagina();

    await chegarNoResumo(user);
    await user.click(screen.getByRole('button', { name: 'Publicar carona' }));

    expect(
      await screen.findByText('Não foi possível publicar a carona.'),
    ).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
