import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('../../services/authService.js', () => ({
  getSession: vi.fn(),
}));

vi.mock('../../services/profileService.js', () => ({
  getPerfilUsuarioAutenticado: vi.fn(),
}));

vi.mock('../../services/caronaService.js', () => ({
  buscarProximaCarona: vi.fn(),
  buscarSugestoesDeCaronas: vi.fn(),
}));

import Inicio from './index.jsx';
import { getSession } from '../../services/authService.js';
import { getPerfilUsuarioAutenticado } from '../../services/profileService.js';
import {
  buscarProximaCarona,
  buscarSugestoesDeCaronas,
} from '../../services/caronaService.js';

const PERFIL = {
  id: 1,
  nomeCompleto: 'Marina Souza Lima',
  fotoUrl: '',
  avaliacao: 4.8,
};

const CARONA_PASSAGEIRO = {
  id: 55,
  papel: 'PASSAGEIRO',
  horario: '2026-07-20T07:20:00',
  origem: 'Bodocongó',
  destino: 'UFCG',
  motorista: { id: 9, nome: 'Lucas Prado', avaliacao: 4.9 },
};

function renderInicio() {
  return render(
    <MemoryRouter>
      <Inicio />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  getSession.mockReturnValue({ usuario: { nomeCompleto: 'Marina Souza Lima' } });
  getPerfilUsuarioAutenticado.mockResolvedValue(PERFIL);
  buscarProximaCarona.mockResolvedValue(null);
  buscarSugestoesDeCaronas.mockResolvedValue([]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Inicio — saudação', () => {
  it('mostra o primeiro nome do usuário da sessão logo na montagem', () => {
    renderInicio();

    // Antes mesmo do perfil resolver, a saudação usa a sessão.
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Marina');
  });

  it('usa "Usuário" quando não há nome', async () => {
    getSession.mockReturnValue({ usuario: {} });
    getPerfilUsuarioAutenticado.mockResolvedValue({ id: 1, nomeCompleto: '' });

    renderInicio();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Usuário');
  });
});

describe('Inicio — carregamento resiliente (Promise.all)', () => {
  it('mostra o estado de carregando antes dos dados chegarem', () => {
    renderInicio();

    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  // O ponto central da página: uma falha em proximaCarona NÃO derruba a tela —
  // o .catch individual devolve null e o resto carrega normalmente.
  it('não mostra erro quando buscarProximaCarona falha (cai para vazio)', async () => {
    buscarProximaCarona.mockRejectedValue(new Error('backend fora'));

    renderInicio();

    await waitFor(() =>
      expect(screen.getByText('Nenhuma carona futura')).toBeInTheDocument(),
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('não mostra erro quando buscarSugestoes falha (cai para lista vazia)', async () => {
    buscarSugestoesDeCaronas.mockRejectedValue(new Error('backend fora'));

    renderInicio();

    await waitFor(() =>
      expect(screen.getByText('Nenhuma sugestão encontrada.')).toBeInTheDocument(),
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  // Só o perfil é obrigatório: se ELE falha, aí sim a tela mostra o erro.
  it('mostra erro quando o perfil (obrigatório) falha', async () => {
    getPerfilUsuarioAutenticado.mockRejectedValue(new Error('Sessão expirada.'));

    renderInicio();

    expect(await screen.findByRole('alert')).toHaveTextContent('Sessão expirada.');
  });

  it('usa mensagem genérica quando o erro do perfil não traz mensagem', async () => {
    getPerfilUsuarioAutenticado.mockRejectedValue(new Error());

    renderInicio();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar seus dados.',
    );
  });
});

describe('Inicio — próxima carona', () => {
  it('renderiza o card com o motorista quando o usuário é passageiro', async () => {
    buscarProximaCarona.mockResolvedValue(CARONA_PASSAGEIRO);

    renderInicio();

    expect(await screen.findByText('Você é passageiro')).toBeInTheDocument();
    expect(screen.getByText('Lucas Prado')).toBeInTheDocument();
    expect(screen.getByText(/Bodocongó/)).toBeInTheDocument();
    expect(screen.getByText('Ver detalhes')).toBeInTheDocument();
  });

  it('mostra "Você é motorista" e o rótulo de gerenciar quando o usuário dirige', async () => {
    buscarProximaCarona.mockResolvedValue({
      ...CARONA_PASSAGEIRO,
      papel: 'MOTORISTA',
      motorista: undefined,
    });

    renderInicio();

    expect(await screen.findByText('Você é motorista')).toBeInTheDocument();
    expect(screen.getByText('Gerenciar carona')).toBeInTheDocument();
  });

  it('navega para o perfil do motorista ao clicar no avatar (passageiro)', async () => {
    buscarProximaCarona.mockResolvedValue(CARONA_PASSAGEIRO);

    renderInicio();

    const avatar = await screen.findByRole('link', {
      name: 'Ver perfil de Lucas Prado',
    });
    await userEvent.setup().click(avatar);

    expect(navigateMock).toHaveBeenCalledWith('/usuarios/9');
  });

  it('mostra o estado vazio com atalhos quando não há próxima carona', async () => {
    buscarProximaCarona.mockResolvedValue(null);

    renderInicio();

    // Escopa ao card de vazio: "Buscar/Ofertar carona" também existem na seção
    // ATALHOS, então a asserção precisa olhar só dentro do empty state.
    const emptyState = (
      await screen.findByText('Nenhuma carona futura')
    ).closest('.inicio-empty-ride');
    expect(
      within(emptyState).getByRole('link', { name: 'Buscar carona' }),
    ).toBeInTheDocument();
    expect(
      within(emptyState).getByRole('link', { name: 'Ofertar carona' }),
    ).toBeInTheDocument();
  });
});

describe('Inicio — sugestões', () => {
  it('lista as sugestões com nome do motorista e preço formatado', async () => {
    buscarSugestoesDeCaronas.mockResolvedValue([
      {
        id: 1,
        rota: 'Centro → UFCG',
        horario: '07:15',
        preco: 5,
        motorista: { id: 3, nome: 'Ana Clara' },
      },
    ]);

    renderInicio();

    const sugestao = await screen.findByText('Ana Clara');
    const artigo = sugestao.closest('article');
    expect(within(artigo).getByRole('link')).toHaveAttribute('href', '/caronas/1');
    expect(within(artigo).getByText('Centro → UFCG')).toBeInTheDocument();
    expect(within(artigo).getByText('07:15')).toBeInTheDocument();
    // formatarPreco: número 5 → moeda BRL
    expect(within(artigo).getByText(/R\$\s*5,00/)).toBeInTheDocument();
  });

  it('mostra "Nenhuma sugestão encontrada." quando a lista vem vazia', async () => {
    buscarSugestoesDeCaronas.mockResolvedValue([]);

    renderInicio();

    await waitFor(() =>
      expect(
        screen.getByText('Nenhuma sugestão encontrada.'),
      ).toBeInTheDocument(),
    );
  });

  it('mantém preço em string já formatada (não duplica R$)', async () => {
    buscarSugestoesDeCaronas.mockResolvedValue([
      { id: 2, rota: 'A → B', horario: '08:00', preco: 'R$ 7,50', motorista: { id: 4, nome: 'Bea' } },
    ]);

    renderInicio();

    const artigo = (await screen.findByText('Bea')).closest('article');
    expect(within(artigo).getByText('R$ 7,50')).toBeInTheDocument();
  });
});
