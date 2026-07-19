import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => navigateMock };
});

// Isola a página do serviço de caronas: nenhuma rede real é tocada (o setup do
// MSW erra em request não tratada).
vi.mock('../../services/caronaService.js', () => ({
  buscarCaronas: vi.fn(),
}));

import BuscarCarona from './index.jsx';
import { buscarCaronas } from '../../services/caronaService.js';

// Monta uma carona de busca com os campos mínimos que a página lê.
function carona(overrides = {}) {
  return {
    id: overrides.id ?? Math.floor(Math.random() * 1_000_000),
    origem: 'Alpha',
    destino: 'UFCG',
    dataHoraSaida: '2026-07-20T07:30:00',
    valorContribuicao: 5,
    vagasDisponiveis: 2,
    ...overrides,
  };
}

function renderPagina(rota = '/buscar-carona') {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <BuscarCarona />
    </MemoryRouter>,
  );
}

// O contador quebra o texto em vários nós ("2" + " carona" + "s" + ...), então
// leem-se via textContent do <p> do topo do resultado.
function textoContador(container) {
  return container.querySelector('.buscar-resultado-topo p')?.textContent;
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  buscarCaronas.mockResolvedValue([]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('carregamento inicial', () => {
  it('busca ao montar usando origem/destino da query string e pré-preenche os campos', async () => {
    buscarCaronas.mockResolvedValue([]);

    renderPagina('/buscar-carona?origem=Centro&destino=UFCG');

    await waitFor(() =>
      expect(buscarCaronas).toHaveBeenCalledWith({ origem: 'Centro', destino: 'UFCG' }),
    );

    expect(screen.getByPlaceholderText('De onde você sai')).toHaveValue('Centro');
    expect(screen.getByPlaceholderText('Para onde vai')).toHaveValue('UFCG');
  });

  it('busca com origem/destino vazios quando não há query string', async () => {
    renderPagina('/buscar-carona');

    await waitFor(() =>
      expect(buscarCaronas).toHaveBeenCalledWith({ origem: '', destino: '' }),
    );
  });

  it('mostra o estado de carregando enquanto a busca inicial não resolve', async () => {
    buscarCaronas.mockReturnValue(new Promise(() => {}));

    renderPagina();

    expect(screen.getByText('Buscando caronas...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Buscando...' })).toBeDisabled();
  });

  it('exibe erro quando a busca inicial rejeita', async () => {
    buscarCaronas.mockRejectedValue(new Error('Falha na rede.'));

    renderPagina();

    expect(await screen.findByRole('alert')).toHaveTextContent('Falha na rede.');
    // Sem busca concluída, o topo de resultado não aparece.
    expect(screen.queryByText(/encontradas/)).not.toBeInTheDocument();
  });

  it('usa mensagem genérica quando o erro não traz mensagem', async () => {
    buscarCaronas.mockRejectedValue(new Error());

    renderPagina();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível buscar as caronas.',
    );
  });
});

describe('caronasFiltradas — filtros padrão e aliases', () => {
  it('exibe cinco caronas por vez e mostra as demais sob demanda', async () => {
    buscarCaronas.mockResolvedValue(
      Array.from({ length: 6 }, (_, indice) => carona({
        id: indice + 1,
        motoristaNome: `Motorista ${indice + 1}`,
      })),
    );

    const user = userEvent.setup();
    renderPagina();

    expect(await screen.findByText('Motorista 5')).toBeInTheDocument();
    expect(screen.queryByText('Motorista 6')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Mostrar mais caronas' }));

    expect(screen.getByText('Motorista 6')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mostrar mais caronas' })).not.toBeInTheDocument();
  });

  it('não exibe caronas criadas pelo usuário autenticado', async () => {
    localStorage.setItem('unicar.session', JSON.stringify({
      token: 'token-de-teste',
      usuario: { id: 17 },
    }));
    buscarCaronas.mockResolvedValue([
      carona({
        id: 1,
        motorista: { id: 17, nome: 'Minha própria carona' },
      }),
      carona({
        id: 2,
        motorista: { id: 24, nome: 'Outra motorista' },
      }),
    ]);

    const { container } = renderPagina();

    expect(await screen.findByText('Outra motorista')).toBeInTheDocument();
    expect(screen.queryByText('Minha própria carona')).not.toBeInTheDocument();
    expect(textoContador(container)).toBe('1 carona encontrada');
  });

  it('filtra por vagas mínimas e preço máximo padrão, cobrindo os aliases de vagas', async () => {
    buscarCaronas.mockResolvedValue([
      // Passa: vagasDisponiveis >= 1 e preço <= 20.
      carona({ id: 1, motoristaNome: 'PassaVagas', vagasDisponiveis: 2, valorContribuicao: 5 }),
      // Passa via ALIAS: sem vagasDisponiveis, usa quantidadeVagas.
      carona({ id: 2, motoristaNome: 'AliasVagas', vagasDisponiveis: undefined, quantidadeVagas: 3, valorContribuicao: 5 }),
      // Filtrada: vagasDisponiveis=0 tem precedência sobre quantidadeVagas=5.
      carona({ id: 3, motoristaNome: 'ZeroVagas', vagasDisponiveis: 0, quantidadeVagas: 5, valorContribuicao: 5 }),
      // Filtrada: preço acima do padrão (20).
      carona({ id: 4, motoristaNome: 'CaroDemais', vagasDisponiveis: 2, valorContribuicao: 25 }),
    ]);

    const { container } = renderPagina();

    expect(await screen.findByText('PassaVagas')).toBeInTheDocument();
    expect(screen.getByText('AliasVagas')).toBeInTheDocument();
    expect(screen.queryByText('ZeroVagas')).not.toBeInTheDocument();
    expect(screen.queryByText('CaroDemais')).not.toBeInTheDocument();

    // O contador reflete a lista FILTRADA (2), não a lista crua (4).
    expect(textoContador(container)).toBe('2 caronas encontradas');
  });

  it('respeita o slider de vagas mínimas e usa singular quando sobra uma carona', async () => {
    buscarCaronas.mockResolvedValue([
      carona({ id: 1, motoristaNome: 'Tres', vagasDisponiveis: 3 }),
      carona({ id: 2, motoristaNome: 'Duas', vagasDisponiveis: 2 }),
    ]);

    const { container } = renderPagina();

    await screen.findByText('Tres');

    // Abre o painel e sobe o mínimo de vagas para 3 (primeiro slider).
    await userEvent.click(screen.getByRole('button', { name: 'Filtros' }));
    const sliders = screen.getAllByRole('slider');
    fireEvent.change(sliders[0], { target: { value: '3' } });

    expect(screen.getByText('Tres')).toBeInTheDocument();
    expect(screen.queryByText('Duas')).not.toBeInTheDocument();
    expect(textoContador(container)).toBe('1 carona encontrada');
  });

});

describe('realizarBusca', () => {
  it('envia origem, destino, curso e gênero (padrão "Qualquer") ao serviço', async () => {
    renderPagina();

    await waitFor(() => expect(buscarCaronas).toHaveBeenCalledTimes(1));

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText('De onde você sai'), 'Bodocongó');
    await user.type(screen.getByPlaceholderText('Para onde vai'), 'UFCG');
    await user.click(screen.getByRole('button', { name: 'Buscar' }));

    await waitFor(() =>
      expect(buscarCaronas).toHaveBeenLastCalledWith({
        origem: 'Bodocongó',
        destino: 'UFCG',
        curso: 'Qualquer',
        genero: 'Qualquer',
      }),
    );
  });

  it('envia curso e gênero escolhidos nos filtros', async () => {
    renderPagina();

    await waitFor(() => expect(buscarCaronas).toHaveBeenCalledTimes(1));

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Filtros' }));

    // O input de origem também tem role="combobox" (autocomplete de endereço);
    // aqui interessam só os <select> de Curso e Gênero.
    const selects = screen
      .getAllByRole('combobox')
      .filter((elemento) => elemento.tagName === 'SELECT');
    await user.selectOptions(selects[0], 'Direito');
    await user.selectOptions(selects[1], 'Feminino');
    await user.click(screen.getByRole('button', { name: 'Buscar' }));

    await waitFor(() =>
      expect(buscarCaronas).toHaveBeenLastCalledWith({
        origem: '',
        destino: '',
        curso: 'Direito',
        genero: 'Feminino',
      }),
    );
  });

  it('mostra erro quando a busca acionada pelo botão falha', async () => {
    renderPagina();

    await waitFor(() => expect(buscarCaronas).toHaveBeenCalledTimes(1));

    buscarCaronas.mockRejectedValueOnce(new Error('Serviço indisponível.'));
    await userEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Serviço indisponível.');
  });
});

describe('estado vazio pós-busca', () => {
  it('mostra o CTA de criar alerta quando a busca não retorna resultados', async () => {
    buscarCaronas.mockResolvedValue([]);

    const { container } = renderPagina();

    expect(
      await screen.findByText('Nenhuma carona encontrada para este trajeto.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /criar alerta para este trajeto/i }),
    ).toHaveAttribute('href', '/interesses');
    expect(textoContador(container)).toBe('0 caronas encontradas');
  });
});

describe('RideCard', () => {
  it('mostra "--:--" e dia vazio quando a data de saída é inválida', async () => {
    buscarCaronas.mockResolvedValue([
      carona({ id: 1, motoristaNome: 'SemData', dataHoraSaida: 'data-invalida' }),
    ]);

    renderPagina();

    expect(await screen.findByText('SemData')).toBeInTheDocument();
    expect(screen.getByText('--:--')).toBeInTheDocument();
  });

  it('navega para o perfil do motorista ao clicar no avatar', async () => {
    buscarCaronas.mockResolvedValue([
      carona({ id: 1, motoristaNome: 'Marina Souza', motorista: { id: 901, nome: 'Marina Souza' } }),
    ]);

    renderPagina();

    const avatar = await screen.findByRole('link', { name: 'Ver perfil de Marina Souza' });
    await userEvent.click(avatar);

    expect(navigateMock).toHaveBeenCalledWith('/usuarios/901');
  });

  it('leva ao detalhe da carona pelo card', async () => {
    buscarCaronas.mockResolvedValue([
      carona({ id: 42, motoristaNome: 'Alguem' }),
    ]);

    renderPagina();

    await screen.findByText('Alguem');
    const cardLink = document.querySelector('a.ride-card');
    expect(cardLink).toHaveAttribute('href', '/caronas/42');
  });
});

describe('painel de filtros', () => {
  it('alterna a visibilidade do painel de filtros', async () => {
    renderPagina();

    await waitFor(() => expect(buscarCaronas).toHaveBeenCalled());

    const botaoFiltros = screen.getByRole('button', { name: 'Filtros' });
    expect(botaoFiltros).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(/Vagas mínimas/)).not.toBeInTheDocument();

    await userEvent.click(botaoFiltros);

    expect(botaoFiltros).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/Vagas mínimas/)).toBeInTheDocument();
  });
});
