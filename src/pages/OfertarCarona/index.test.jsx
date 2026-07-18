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

// Mantém as funções puras de cálculo reais (distância/teto) e mocka só a rede.
// As coordenadas ficam ~16 km apart → teto ≈ R$16, cobrindo os valores dos testes.
vi.mock('../../services/geocodingService.js', async (importOriginal) => {
  const real = await importOriginal();
  return {
    ...real,
    buscarSugestoesEndereco: vi.fn(),
    geocodificarEndereco: vi.fn(async (descricao) => {
      const ehDestino = descricao.includes('UFCG');
      return {
        descricao,
        latitude: ehDestino ? -7.07 : -7.21456,
        longitude: ehDestino ? -35.9095 : -35.90872,
      };
    }),
  };
});

vi.mock('../../services/caronaService.js', () => ({
  buscarUltimaCaronaDoTrajeto: vi.fn(),
  criarCarona: vi.fn(),
  listarTrajetosRecorrentes: vi.fn(),
  obterTrajetoRecorrente: vi.fn(),
  OBSERVACAO_MAX: 255,
}));

import OfertarCarona from './index.jsx';
import {
  geocodificarEndereco,
  buscarSugestoesEndereco,
  calcularTetoContribuicao,
  contribuicaoMaxima,
} from '../../services/geocodingService.js';
import { listarVeiculos } from '../../services/vehicleService.js';

// Coordenadas que o mock de geocoding devolve (Bodocongó → UFCG, ~16 km).
const COORD_ORIGEM = { latitude: -7.21456, longitude: -35.90872 };
const COORD_DESTINO = { latitude: -7.07, longitude: -35.9095 };
import {
  buscarUltimaCaronaDoTrajeto,
  criarCarona,
  listarTrajetosRecorrentes,
  obterTrajetoRecorrente,
} from '../../services/caronaService.js';

const VEICULOS = [
  { id: 1, modelo: 'Onix', cor: 'Prata', placa: 'ABC-1D23' }, // sem tipo → carro
  { id: 2, modelo: 'CG 160', cor: 'Preta', placa: 'MOT-9A11', tipo: 'moto' },
];

const TRAJETOS_RECORRENTES = [
  { id: 1, origem: 'Bodocongó', destino: 'UFCG - Campus Sede', quantidadeViagens: 15 },
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

// A expansão da recorrência depende do dia da semana, e DATA_FUTURA é relativa
// ao "agora" real. Em vez de fixar um calendário, derivamos o rótulo do dia.
const DIAS_POR_INDICE = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function rotuloDoDia(dataISO) {
  const [ano, mes, dia] = dataISO.split('-').map(Number);
  return DIAS_POR_INDICE[new Date(ano, mes - 1, dia).getDay()];
}

// Dois dias depois da data escolhida: cai na mesma janela de uma semana.
const DATA_MAIS_2 = isoLocal(32);
const DIA_MAIS_2 = rotuloDoDia(DATA_MAIS_2);

// `state` simula a navegação vinda de "Recriar viagem" (detalhe do trajeto
// recorrente), que entrega o trajetoId via location.state.
function renderPagina(state) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/ofertar-carona', state }]}>
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
  // Avançar geocodifica origem/destino (async); espera a transição ao passo 2.
  await screen.findByText('Passo 2 de 3');
}

async function abrirDropdownVeiculo(user) {
  const trigger = await screen.findByRole('button', { name: /selecione um veículo/i });
  await user.click(trigger);
  return trigger;
}

beforeEach(() => {
  vi.clearAllMocks();
  listarVeiculos.mockResolvedValue(VEICULOS);
  listarTrajetosRecorrentes.mockResolvedValue(TRAJETOS_RECORRENTES);
  buscarSugestoesEndereco.mockResolvedValue([]);
  // Sem histórico por padrão: quem exercita a sugestão sobrescreve.
  buscarUltimaCaronaDoTrajeto.mockResolvedValue(null);
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

  it('oferece endereços encontrados pela API e usa a opção escolhida', async () => {
    const user = userEvent.setup();
    buscarSugestoesEndereco.mockResolvedValueOnce([
      {
        descricao: 'Universidade Federal de Campina Grande, Bodocongó, Campina Grande',
        latitude: -7.2138,
        longitude: -35.9092,
      },
    ]);
    renderPagina();

    const campoOrigem = screen.getByPlaceholderText('De onde você sai');
    await user.type(campoOrigem, 'ufc');

    const opcao = await screen.findByRole('option', { name: /universidade federal de campina grande/i });
    await user.click(opcao);

    expect(campoOrigem).toHaveValue('Universidade Federal de Campina Grande, Bodocongó, Campina Grande');
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

  it('limita o slider ao teto do trajeto (distância), com passo de R$ 0,50', async () => {
    const user = userEvent.setup();
    renderPagina();

    await preencherPasso1(user);

    const max = contribuicaoMaxima(calcularTetoContribuicao(COORD_ORIGEM, COORD_DESTINO));
    const slider = screen.getByLabelText('Contribuição por passageiro');

    expect(slider).toHaveAttribute('max', String(max));
    expect(slider).toHaveAttribute('step', '0.5');
  });

  it('bloqueia o avanço e mostra erro quando não consegue localizar o endereço', async () => {
    const user = userEvent.setup();
    geocodificarEndereco.mockRejectedValueOnce(
      new Error('Não foi possível localizar o endereço.'),
    );
    renderPagina();

    await user.type(screen.getByPlaceholderText('De onde você sai'), 'Bodocongó');
    await user.type(screen.getByPlaceholderText('Para onde você vai'), 'Endereço inexistente');
    fireEvent.change(screen.getByLabelText('Data'), { target: { value: DATA_FUTURA } });
    fireEvent.change(screen.getByLabelText('Horário'), { target: { value: '07:00' } });
    await user.type(
      screen.getByPlaceholderText('Onde os passageiros te encontram'),
      'Portão principal',
    );
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(
      (await screen.findAllByText('Não foi possível localizar o endereço.')).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText('Passo 1 de 3')).toBeInTheDocument();
  });

  it('desabilita a barra e avisa quando o trajeto é curto demais (teto R$ 0)', async () => {
    const user = userEvent.setup();
    renderPagina();

    // Origem e destino sem "UFCG" caem na mesma coordenada do mock → distância 0.
    await user.type(screen.getByPlaceholderText('De onde você sai'), 'Bodocongó');
    await user.type(screen.getByPlaceholderText('Para onde você vai'), 'Bodocongó Centro');
    fireEvent.change(screen.getByLabelText('Data'), { target: { value: DATA_FUTURA } });
    fireEvent.change(screen.getByLabelText('Horário'), { target: { value: '07:00' } });
    await user.type(
      screen.getByPlaceholderText('Onde os passageiros te encontram'),
      'Portão principal',
    );
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    await screen.findByText('Passo 2 de 3');

    expect(screen.getByText(/Trajeto muito curto/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Contribuição por passageiro')).not.toBeInTheDocument();
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

  it('exibe a caixa de observações no último passo', async () => {
    const user = userEvent.setup();
    renderPagina();

    await chegarNoResumo(user);

    expect(
      screen.getByPlaceholderText(/aceito até 3 paradas/i),
    ).toBeInTheDocument();
  });

  it('publica a carona com o payload correto e navega para minhas caronas', async () => {
    const user = userEvent.setup();
    criarCarona.mockResolvedValue([{ id: 42, status: 'CRIADA' }]);
    renderPagina();

    await chegarNoResumo(user);
    await user.click(screen.getByRole('button', { name: 'Publicar carona' }));

    await waitFor(() =>
      expect(criarCarona).toHaveBeenCalledWith({
        veiculoId: 1,
        origem: {
          descricao: 'Bodocongó',
          latitude: -7.21456,
          longitude: -35.90872,
        },
        destino: {
          descricao: 'UFCG',
          latitude: -7.07,
          longitude: -35.9095,
        },
        pontoEncontro: 'Portão principal',
        observacao: '',
        dataHoraSaida: `${DATA_FUTURA}T07:00:00`,
        quantidadeVagas: 1,
        valorContribuicao: 5,
        recorrente: false,
        diasRecorrencia: [],
      }),
    );

    expect(navigateMock).toHaveBeenCalledWith('/minhas-caronas', {
      state: { mensagem: 'Carona publicada com sucesso.' },
    });
  });

  // A observação é opcional no contrato, mas quando o motorista escreve algo na
  // revisão ela precisa chegar ao POST.
  it('envia a observação escrita na revisão', async () => {
    const user = userEvent.setup();
    criarCarona.mockResolvedValue([{ id: 42, status: 'CRIADA' }]);
    renderPagina();

    await chegarNoResumo(user);

    await user.type(
      screen.getByPlaceholderText(/aceito até 3 paradas/i),
      'Sem fumantes, por favor.',
    );
    await user.click(screen.getByRole('button', { name: 'Publicar carona' }));

    await waitFor(() =>
      expect(criarCarona).toHaveBeenCalledWith(
        expect.objectContaining({ observacao: 'Sem fumantes, por favor.' }),
      ),
    );
  });

  it('avisa quantas caronas foram criadas quando havia recorrência', async () => {
    const user = userEvent.setup();
    criarCarona.mockResolvedValue([
      { id: 42, status: 'CRIADA' },
      { id: 43, status: 'CRIADA' },
      { id: 44, status: 'CRIADA' },
    ]);
    renderPagina();

    await chegarNoResumo(user);
    await user.click(screen.getByRole('button', { name: 'Publicar carona' }));

    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith('/minhas-caronas', {
        state: { mensagem: '3 caronas publicadas com sucesso.' },
      }),
    );
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

describe('rotas frequentes', () => {
  it('lista as rotas vindas do serviço e preenche origem e destino ao selecionar', async () => {
    const user = userEvent.setup();
    renderPagina();

    const atalho = await screen.findByRole('button', {
      name: /Bodocongó → UFCG - Campus Sede/,
    });
    expect(within(atalho).getByText('15x realizadas')).toBeInTheDocument();

    await user.click(atalho);

    expect(screen.getByPlaceholderText('De onde você sai')).toHaveValue('Bodocongó');
    expect(screen.getByPlaceholderText('Para onde você vai')).toHaveValue(
      'UFCG - Campus Sede',
    );
  });
});

describe('recriar viagem a partir de um trajeto recorrente', () => {
  // Um trajeto recorrente descreve apenas origem e destino (contrato US8): o
  // serviço já normaliza os locais do contrato para texto.
  const TRAJETO = {
    id: 7,
    origem: 'Bodocongó',
    destino: 'UFCG - Campus Sede',
    quantidadeViagens: 15,
  };

  // O trajeto em si só entrega origem e destino; o resto é sugestão do histórico.
  const ULTIMA_CARONA = {
    id: 10,
    status: 'FINALIZADA',
    dataHoraSaida: '2026-06-20T08:00:00',
    origem: 'Bodocongó',
    destino: 'UFCG - Campus Sede',
    pontoEncontro: 'Portão principal',
    quantidadeVagas: 3,
    valorContribuicao: 8,
    veiculo: { id: 1, tipo: 'carro', modelo: 'Onix' },
  };

  it('pré-preenche origem e destino a partir do trajeto', async () => {
    obterTrajetoRecorrente.mockResolvedValue(TRAJETO);

    renderPagina({ trajetoId: 7 });

    await waitFor(() =>
      expect(screen.getByPlaceholderText('De onde você sai')).toHaveValue('Bodocongó'),
    );
    expect(obterTrajetoRecorrente).toHaveBeenCalledWith(7);
    expect(screen.getByPlaceholderText('Para onde você vai')).toHaveValue(
      'UFCG - Campus Sede',
    );
  });

  it('sugere veículo, vagas, contribuição e ponto de encontro da última viagem', async () => {
    const user = userEvent.setup();
    obterTrajetoRecorrente.mockResolvedValue(TRAJETO);
    buscarUltimaCaronaDoTrajeto.mockResolvedValue(ULTIMA_CARONA);

    renderPagina({ trajetoId: 7 });

    expect(await screen.findByText(/com base na sua última viagem/i)).toBeInTheDocument();
    expect(buscarUltimaCaronaDoTrajeto).toHaveBeenCalledWith(
      'Bodocongó',
      'UFCG - Campus Sede',
    );

    expect(
      screen.getByPlaceholderText('Onde os passageiros te encontram'),
    ).toHaveValue('Portão principal');

    // Data e horário nunca são sugeridos: a viagem nova exige uma data.
    expect(screen.getByLabelText('Data')).toHaveValue('');
    expect(screen.getByLabelText('Horário')).toHaveValue('');

    fireEvent.change(screen.getByLabelText('Data'), { target: { value: DATA_FUTURA } });
    fireEvent.change(screen.getByLabelText('Horário'), { target: { value: '07:00' } });
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    await screen.findByText('Passo 2 de 3');

    expect(
      screen.getByRole('button', { name: /Onix • Prata • ABC-1D23/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '3', pressed: true })).toBeInTheDocument();
    expect(screen.getByText('R$ 8')).toBeInTheDocument();
  });

  it('clampa a sugestão do histórico ao teto do trajeto', async () => {
    const user = userEvent.setup();
    obterTrajetoRecorrente.mockResolvedValue(TRAJETO);
    // Última viagem sugere R$30, muito acima do teto (~R$16) do trajeto.
    buscarUltimaCaronaDoTrajeto.mockResolvedValue({ ...ULTIMA_CARONA, valorContribuicao: 30 });

    renderPagina({ trajetoId: 7 });

    await screen.findByText(/com base na sua última viagem/i);
    fireEvent.change(screen.getByLabelText('Data'), { target: { value: DATA_FUTURA } });
    fireEvent.change(screen.getByLabelText('Horário'), { target: { value: '07:00' } });
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    await screen.findByText('Passo 2 de 3');

    const max = contribuicaoMaxima(calcularTetoContribuicao(COORD_ORIGEM, COORD_DESTINO));
    expect(screen.getByLabelText('Contribuição por passageiro')).toHaveValue(String(max));
  });

  it('limita a sugestão a 1 vaga quando a última viagem foi de moto', async () => {
    const user = userEvent.setup();
    obterTrajetoRecorrente.mockResolvedValue(TRAJETO);
    buscarUltimaCaronaDoTrajeto.mockResolvedValue({
      ...ULTIMA_CARONA,
      quantidadeVagas: 3,
      veiculo: { id: 2, tipo: 'moto', modelo: 'CG 160' },
    });

    renderPagina({ trajetoId: 7 });

    await screen.findByText(/com base na sua última viagem/i);

    fireEvent.change(screen.getByLabelText('Data'), { target: { value: DATA_FUTURA } });
    fireEvent.change(screen.getByLabelText('Horário'), { target: { value: '07:00' } });
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(
      screen.getByRole('button', { name: /CG 160 • Preta • MOT-9A11/ }),
    ).toBeInTheDocument();
    expect(screen.getByText('Motos comportam apenas 1 passageiro.')).toBeInTheDocument();
  });

  it('não sugere nada quando não há histórico no trajeto', async () => {
    obterTrajetoRecorrente.mockResolvedValue(TRAJETO);
    buscarUltimaCaronaDoTrajeto.mockResolvedValue(null);

    renderPagina({ trajetoId: 7 });

    await waitFor(() =>
      expect(screen.getByPlaceholderText('De onde você sai')).toHaveValue('Bodocongó'),
    );

    expect(screen.queryByText(/com base na sua última viagem/i)).not.toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Onde os passageiros te encontram'),
    ).toHaveValue('');
  });

  it('mantém o formulário utilizável quando o trajeto não pode ser carregado', async () => {
    obterTrajetoRecorrente.mockRejectedValue(new Error('falhou'));

    renderPagina({ trajetoId: 7 });

    expect(await screen.findByText('Passo 1 de 3')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('De onde você sai')).toHaveValue('');
    expect(screen.queryByText('falhou')).not.toBeInTheDocument();
  });

  it('não busca trajeto quando a navegação não traz trajetoId', async () => {
    renderPagina();

    expect(await screen.findByText('Passo 1 de 3')).toBeInTheDocument();
    expect(obterTrajetoRecorrente).not.toHaveBeenCalled();
  });
});

// A recorrência não vira um campo da carona: cada dia marcado gera uma data, e
// cada data vira uma carona independente.
describe('recorrência', () => {
  async function preencherTrajeto(user) {
    await user.type(screen.getByPlaceholderText('De onde você sai'), 'Bodocongó');
    await user.type(screen.getByPlaceholderText('Para onde você vai'), 'UFCG');
    fireEvent.change(screen.getByLabelText('Data'), { target: { value: DATA_FUTURA } });
    fireEvent.change(screen.getByLabelText('Horário'), { target: { value: '07:00' } });
    await user.type(
      screen.getByPlaceholderText('Onde os passageiros te encontram'),
      'Portão principal',
    );
  }

  it('não deixa avançar com "Carona recorrente" marcada e nenhum dia escolhido', async () => {
    const user = userEvent.setup();
    renderPagina();

    await preencherTrajeto(user);
    await user.click(screen.getByRole('checkbox', { name: /carona recorrente/i }));
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(
      screen.getByText('Selecione ao menos um dia da recorrência.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Passo 1 de 3')).toBeInTheDocument();
  });

  it('lista na revisão as datas que virarão caronas e as envia ao publicar', async () => {
    const user = userEvent.setup();
    criarCarona.mockResolvedValue([
      { id: 42, status: 'CRIADA' },
      { id: 43, status: 'CRIADA' },
    ]);
    renderPagina();

    await preencherTrajeto(user);
    await user.click(screen.getByRole('checkbox', { name: /carona recorrente/i }));
    await user.click(screen.getByRole('button', { name: DIA_MAIS_2, pressed: false }));
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    await abrirDropdownVeiculo(user);
    await user.click(screen.getByRole('option', { name: 'Onix • Prata • ABC-1D23' }));
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    // A data escolhida entra, e o dia marcado gera a ocorrência seguinte.
    expect(screen.getByText('2 caronas serão criadas')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Publicar carona' }));

    await waitFor(() =>
      expect(criarCarona).toHaveBeenCalledWith(
        expect.objectContaining({
          dataHoraSaida: `${DATA_FUTURA}T07:00:00`,
          recorrente: true,
          diasRecorrencia: [DIA_MAIS_2],
        }),
      ),
    );
  });

  it('não envia dias quando o motorista desmarca "Carona recorrente"', async () => {
    const user = userEvent.setup();
    criarCarona.mockResolvedValue([{ id: 42, status: 'CRIADA' }]);
    renderPagina();

    await preencherTrajeto(user);

    // Marca a recorrência, escolhe um dia e muda de ideia.
    await user.click(screen.getByRole('checkbox', { name: /carona recorrente/i }));
    await user.click(screen.getByRole('button', { name: DIA_MAIS_2, pressed: false }));
    await user.click(screen.getByRole('checkbox', { name: /carona recorrente/i }));

    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    await abrirDropdownVeiculo(user);
    await user.click(screen.getByRole('option', { name: 'Onix • Prata • ABC-1D23' }));
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(screen.queryByText(/caronas serão criadas/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Publicar carona' }));

    await waitFor(() =>
      expect(criarCarona).toHaveBeenCalledWith(
        expect.objectContaining({ recorrente: false, diasRecorrencia: [] }),
      ),
    );
  });
});
