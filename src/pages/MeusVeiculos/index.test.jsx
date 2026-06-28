import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

// Mocka o serviço para isolar o comportamento do componente.
vi.mock('../../services/vehicleService.js', () => ({
  listarVeiculos: vi.fn(),
  criarVeiculo: vi.fn(),
  atualizarVeiculo: vi.fn(),
  deletarVeiculo: vi.fn(),
  obterVeiculo: vi.fn(),
}));

import MeusVeiculos from './index.jsx';
import {
  listarVeiculos,
  criarVeiculo,
  atualizarVeiculo,
  deletarVeiculo,
} from '../../services/vehicleService.js';

const VEICULOS = [
  { id: 1, modelo: 'Onix', placa: 'ABC1D23', cor: 'Prata' },
  { id: 2, modelo: 'HB20', placa: 'XYZ9A87', cor: 'Branco' },
];

function renderPagina() {
  return render(
    <MemoryRouter>
      <MeusVeiculos />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  listarVeiculos.mockResolvedValue([]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('carregamento e listagem', () => {
  it('exibe estado de carregando antes de resolver', async () => {
    let resolver;
    listarVeiculos.mockReturnValue(new Promise((resolve) => { resolver = resolve; }));

    renderPagina();

    expect(screen.getByText('Carregando veículos...')).toBeInTheDocument();

    resolver([]);
    await waitFor(() =>
      expect(screen.queryByText('Carregando veículos...')).not.toBeInTheDocument(),
    );
  });

  it('exibe estado vazio quando não há veículos', async () => {
    listarVeiculos.mockResolvedValue([]);

    renderPagina();

    expect(
      await screen.findByText('Você ainda não cadastrou veículos.'),
    ).toBeInTheDocument();
  });

  it('renderiza modelo, placa e cor dos veículos', async () => {
    listarVeiculos.mockResolvedValue(VEICULOS);

    renderPagina();

    expect(await screen.findByText('Onix')).toBeInTheDocument();
    expect(screen.getByText('ABC1D23 · Prata')).toBeInTheDocument();
    expect(screen.getByText('HB20')).toBeInTheDocument();
    expect(screen.getByText('XYZ9A87 · Branco')).toBeInTheDocument();
  });

  it('exibe erro e "Tentar novamente" rechama o serviço', async () => {
    listarVeiculos.mockRejectedValueOnce(new Error('Falha ao carregar'));

    renderPagina();

    expect(await screen.findByText('Falha ao carregar')).toBeInTheDocument();

    listarVeiculos.mockResolvedValueOnce(VEICULOS);
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByText('Onix')).toBeInTheDocument();
    expect(listarVeiculos).toHaveBeenCalledTimes(2);
  });
});

describe('validação do formulário', () => {
  it('bloqueia submit com campo vazio e não chama o serviço', async () => {
    renderPagina();

    await userEvent.click(await screen.findByRole('button', { name: 'Cadastrar veículo' }));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(screen.getByText('Preencha modelo, placa e cor.')).toBeInTheDocument();
    expect(criarVeiculo).not.toHaveBeenCalled();
  });

  it('bloqueia placa inválida pelo regex', async () => {
    renderPagina();

    await userEvent.click(await screen.findByRole('button', { name: 'Cadastrar veículo' }));
    await preencherForm({ modelo: 'Onix', placa: 'INVALIDO', cor: 'Prata' });
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(
      screen.getByText(/Informe uma placa válida/),
    ).toBeInTheDocument();
    expect(criarVeiculo).not.toHaveBeenCalled();
  });
});

describe('criação e edição', () => {
  it('cria veículo e volta para a lista', async () => {
    criarVeiculo.mockResolvedValue({ id: 3, modelo: 'Onix', placa: 'ABC1D23', cor: 'Prata' });

    renderPagina();

    await userEvent.click(await screen.findByRole('button', { name: 'Cadastrar veículo' }));
    await preencherForm({ modelo: 'Onix', placa: 'abc1d23', cor: 'Prata' });
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(criarVeiculo).toHaveBeenCalledWith({
        modelo: 'Onix',
        placa: 'ABC1D23',
        cor: 'Prata',
      }),
    );
    expect(
      await screen.findByRole('button', { name: 'Cadastrar veículo' }),
    ).toBeInTheDocument();
  });

  it('edita veículo com formulário pré-preenchido', async () => {
    listarVeiculos.mockResolvedValue(VEICULOS);
    atualizarVeiculo.mockResolvedValue({ ...VEICULOS[0], cor: 'Preto' });

    renderPagina();

    const [editar] = await screen.findAllByRole('button', { name: 'Editar' });
    await userEvent.click(editar);

    expect(screen.getByDisplayValue('Onix')).toBeInTheDocument();
    expect(screen.getByDisplayValue('ABC1D23')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(atualizarVeiculo).toHaveBeenCalledWith(1, {
        modelo: 'Onix',
        placa: 'ABC1D23',
        cor: 'Prata',
      }),
    );
  });

  it('exibe erro do serviço no submit do formulário', async () => {
    criarVeiculo.mockRejectedValue(new Error('Placa já cadastrada'));

    renderPagina();

    await userEvent.click(await screen.findByRole('button', { name: 'Cadastrar veículo' }));
    await preencherForm({ modelo: 'Onix', placa: 'ABC1D23', cor: 'Prata' });
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Placa já cadastrada')).toBeInTheDocument();
  });
});

describe('exclusão', () => {
  it('confirma exclusão e chama deletarVeiculo', async () => {
    listarVeiculos.mockResolvedValue(VEICULOS);
    deletarVeiculo.mockResolvedValue(undefined);

    renderPagina();

    const [excluir] = await screen.findAllByRole('button', { name: 'Excluir' });
    await userEvent.click(excluir);

    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Excluir' }));

    await waitFor(() => expect(deletarVeiculo).toHaveBeenCalledWith(1));
  });

  it('cancelar o diálogo não chama deletarVeiculo', async () => {
    listarVeiculos.mockResolvedValue(VEICULOS);

    renderPagina();

    const [excluir] = await screen.findAllByRole('button', { name: 'Excluir' });
    await userEvent.click(excluir);

    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

    expect(deletarVeiculo).not.toHaveBeenCalled();
  });
});

async function preencherForm({ modelo, placa, cor }) {
  await userEvent.type(screen.getByPlaceholderText('Ex.: Honda Civic'), modelo);
  await userEvent.type(screen.getByPlaceholderText('Ex.: ABC1D23'), placa);
  await userEvent.type(screen.getByPlaceholderText('Ex.: Preto'), cor);
}
