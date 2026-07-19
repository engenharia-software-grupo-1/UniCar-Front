import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => navigateMock };
});

// A página conversa apenas com os serviços; isolamos todos para nunca tocar a
// rede (o MSW da suíte erra em requisição não tratada).
vi.mock('../../services/profileService.js', () => ({
  getPerfilUsuarioAutenticado: vi.fn(),
  atualizarPerfilUsuarioAutenticado: vi.fn(),
  excluirContaUsuarioAutenticado: vi.fn(),
}));

vi.mock('../../services/authService.js', () => ({
  getSession: vi.fn(),
  logout: vi.fn(),
}));

vi.mock('../../services/vehicleService.js', () => ({
  listarVeiculos: vi.fn(),
}));

vi.mock('../../services/avaliacaoService.js', () => ({
  listarAvaliacoesRecebidas: vi.fn(),
}));

vi.mock('../../services/blockUserService.js', () => ({
  bloquearUsuario: vi.fn(),
}));

import Perfil from './index.jsx';
import {
  getPerfilUsuarioAutenticado,
  atualizarPerfilUsuarioAutenticado,
  excluirContaUsuarioAutenticado,
} from '../../services/profileService.js';
import { getSession, logout } from '../../services/authService.js';
import { listarVeiculos } from '../../services/vehicleService.js';
import { listarAvaliacoesRecebidas } from '../../services/avaliacaoService.js';
import { bloquearUsuario } from '../../services/blockUserService.js';

const SESSION = { usuario: { id: 'me', nomeCompleto: 'Fulano De Tal' } };

const PERFIL = {
  id: 'me',
  nomeCompleto: 'Fulano De Tal',
  matricula: '121110111',
  cpf: '000.000.000-00',
  emailInstitucional: 'fulano@ufcg.edu.br',
  telefone: '(83) 90000-0000',
  curso: 'Ciência da Computação',
  genero: 'Masculino',
  recebeEmails: true,
  motoristaVerificado: false,
  avaliacao: 4,
  isBlocked: false,
  fotoUrl: '',
};

function renderPerfil() {
  return render(
    <MemoryRouter>
      <Perfil />
    </MemoryRouter>,
  );
}

// Espera o carregamento inicial concluir (nome no cabeçalho).
async function aguardarCarregado() {
  await screen.findByRole('heading', { name: /Fulano De Tal/i });
}

// Abre o modal de edição a partir do botão de lápis.
async function abrirEdicao(user) {
  await aguardarCarregado();
  await user.click(screen.getByRole('button', { name: 'Editar perfil' }));
  await screen.findByRole('heading', { name: 'Editar perfil' });
}

beforeEach(() => {
  vi.clearAllMocks();
  getSession.mockReturnValue(SESSION);
  logout.mockResolvedValue(undefined);
  getPerfilUsuarioAutenticado.mockResolvedValue(PERFIL);
  atualizarPerfilUsuarioAutenticado.mockResolvedValue(PERFIL);
  excluirContaUsuarioAutenticado.mockResolvedValue(true);
  listarVeiculos.mockResolvedValue([]);
  listarAvaliacoesRecebidas.mockResolvedValue([]);
  bloquearUsuario.mockResolvedValue({ isBlocked: true, alreadyBlocked: false });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('carregamento', () => {
  it('busca perfil, veículos e avaliações e exibe os dados cadastrais', async () => {
    listarVeiculos.mockResolvedValue([{}, {}]);
    renderPerfil();

    await aguardarCarregado();

    expect(getPerfilUsuarioAutenticado).toHaveBeenCalledTimes(1);
    expect(listarVeiculos).toHaveBeenCalledTimes(1);
    expect(listarAvaliacoesRecebidas).toHaveBeenCalledTimes(1);

    // O heading "Fulano De Tal" vem da sessão e aparece no 1º render, então
    // aguardarCarregado() não garante que o Promise.all de carregamento já
    // rodou. A matrícula só chega com o perfil carregado — esperá-la (findBy)
    // sincroniza com o fim do carregamento; email e contagem vêm do mesmo lote.
    expect(await screen.findByText('121110111')).toBeInTheDocument();
    expect(screen.getByText('fulano@ufcg.edu.br')).toBeInTheDocument();
    // meta com a contagem de veículos vinda do serviço
    expect(screen.getByText('2 cadastrados')).toBeInTheDocument();
  });

  it('mostra a mensagem de erro em falha comum, sem deslogar', async () => {
    getPerfilUsuarioAutenticado.mockRejectedValue(
      new Error('Não foi possível atualizar os dados do perfil.'),
    );

    renderPerfil();

    expect(
      await screen.findByText('Não foi possível atualizar os dados do perfil.'),
    ).toBeInTheDocument();
    expect(logout).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('desloga e navega para a tela inicial quando o erro é de autenticação', async () => {
    getPerfilUsuarioAutenticado.mockRejectedValue(new Error('Acesso negado.'));

    renderPerfil();

    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
    expect(navigateMock).toHaveBeenCalledWith('/', { replace: true });
  });
});

describe('avaliações (resumo)', () => {
  it('calcula a média apenas com notas válidas maiores que zero', async () => {
    listarAvaliacoesRecebidas.mockResolvedValue([
      { nota: 5 },
      { nota: 4 },
      { nota: 0 },
    ]);

    const { container } = renderPerfil();

    await aguardarCarregado();

    const rating = within(container.querySelector('.perfil-rating'));
    expect(rating.getByText('4,5')).toBeInTheDocument();
    // total conta todas as avaliações recebidas, inclusive a de nota zero
    expect(screen.getByText('3 avaliações')).toBeInTheDocument();
  });

  it('usa a avaliação do perfil como fallback quando a lista vem vazia', async () => {
    listarAvaliacoesRecebidas.mockResolvedValue([]);

    const { container } = renderPerfil();

    await aguardarCarregado();

    const rating = within(container.querySelector('.perfil-rating'));
    expect(rating.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('0 avaliações')).toBeInTheDocument();
  });
});

describe('salvar alterações', () => {
  it('envia genero, recebeEmails, curso e fotoUrl, mostra sucesso e fecha o modal', async () => {
    const user = userEvent.setup();
    renderPerfil();

    await abrirEdicao(user);
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(atualizarPerfilUsuarioAutenticado).toHaveBeenCalledWith({
        genero: 'Masculino',
        recebeEmails: true,
        curso: 'Ciência da Computação',
        fotoUrl: '',
      }),
    );

    expect(
      await screen.findByText('Perfil atualizado com sucesso.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Editar perfil' }),
    ).not.toBeInTheDocument();
  });

  it('mantém o curso preenchido e bloqueado para edição', async () => {
    const user = userEvent.setup();
    renderPerfil();

    await abrirEdicao(user);

    const curso = screen.getByDisplayValue('Ciência da Computação');
    expect(curso).toBeDisabled();

    await user.click(screen.getByRole('radio', { name: 'Feminino' }));
    await user.click(screen.getByRole('checkbox'));

    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(atualizarPerfilUsuarioAutenticado).toHaveBeenCalledWith({
        genero: 'Feminino',
        recebeEmails: false,
        curso: 'Ciência da Computação',
        fotoUrl: '',
      }),
    );
  });

  it('exibe erro e mantém o modal aberto quando o salvamento falha', async () => {
    const user = userEvent.setup();
    atualizarPerfilUsuarioAutenticado.mockRejectedValue(
      new Error('Não foi possível salvar as alterações.'),
    );

    renderPerfil();

    await abrirEdicao(user);
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(
      await screen.findByText('Não foi possível salvar as alterações.'),
    ).toBeInTheDocument();
    // o modo edição continua aberto
    expect(
      screen.getByRole('heading', { name: 'Editar perfil' }),
    ).toBeInTheDocument();
  });
});

describe('foto de perfil', () => {
  it('exibe a prévia ao informar um link público', async () => {
    const user = userEvent.setup();
    renderPerfil();

    await abrirEdicao(user);

    const input = screen.getByLabelText(/Link público da foto/i);
    await user.type(input, 'https://imagens.exemplo.com/foto.png');

    const preview = screen.getByAltText(/Foto de Fulano De Tal/i);
    expect(preview).toHaveAttribute('src', 'https://imagens.exemplo.com/foto.png');
  });

  it('impede salvar quando o link da foto não é público', async () => {
    const user = userEvent.setup();
    renderPerfil();

    await abrirEdicao(user);

    await user.type(screen.getByLabelText(/Link público da foto/i), 'foto-local.png');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(
      screen.getByText('Informe uma URL pública válida para a foto.'),
    ).toBeInTheDocument();
    expect(atualizarPerfilUsuarioAutenticado).not.toHaveBeenCalled();
  });
});

describe('sair da conta', () => {
  it('confirma, desloga e navega para a tela inicial', async () => {
    const user = userEvent.setup();
    renderPerfil();

    await aguardarCarregado();
    await user.click(screen.getByRole('button', { name: /Sair da conta/i }));

    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar' }));

    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
    expect(navigateMock).toHaveBeenCalledWith('/', { replace: true });
  });
});

describe('excluir conta', () => {
  it('confirma a exclusão e navega para a tela inicial', async () => {
    const user = userEvent.setup();
    renderPerfil();

    await aguardarCarregado();
    await user.click(screen.getByRole('button', { name: /Excluir conta/i }));

    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar' }));

    await waitFor(() =>
      expect(excluirContaUsuarioAutenticado).toHaveBeenCalledTimes(1),
    );
    expect(navigateMock).toHaveBeenCalledWith('/', { replace: true });
  });

  it('exibe erro e fecha o modal quando a exclusão falha', async () => {
    const user = userEvent.setup();
    excluirContaUsuarioAutenticado.mockRejectedValue(
      new Error('Não foi possível excluir a conta.'),
    );

    renderPerfil();

    await aguardarCarregado();
    await user.click(screen.getByRole('button', { name: /Excluir conta/i }));

    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar' }));

    expect(
      await screen.findByText('Não foi possível excluir a conta.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});

describe('navegação pelo menu', () => {
  it('navega para as telas internas ao clicar nas linhas', async () => {
    const user = userEvent.setup();
    renderPerfil();

    await aguardarCarregado();

    await user.click(screen.getByRole('button', { name: /Trajetos recorrentes/i }));
    expect(navigateMock).toHaveBeenCalledWith('/trajetos-recorrentes');

    await user.click(screen.getByRole('button', { name: /Meus veículos/i }));
    expect(navigateMock).toHaveBeenCalledWith('/meus-veiculos');

    await user.click(screen.getByRole('button', { name: /Central de ajuda/i }));
    expect(navigateMock).toHaveBeenCalledWith('/central-ajuda');
  });
});

// O botão de bloqueio só aparece quando o perfil carregado é de OUTRO usuário
// (perfil.id diferente do id da sessão). No fluxo real do /perfil próprio isso
// não ocorre, mas o ramo existe no código e é exercitado aqui.
describe('bloqueio de usuário', () => {
  function renderComoAlvo() {
    getPerfilUsuarioAutenticado.mockResolvedValue({ ...PERFIL, id: 'outro' });
    return renderPerfil();
  }

  async function abrirEConfirmarBloqueio(user) {
    await screen.findByRole('button', { name: /Bloquear Usuário/i });
    await user.click(screen.getByRole('button', { name: /Bloquear Usuário/i }));

    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Bloquear' }));
  }

  it('bloqueia com sucesso e mostra o feedback', async () => {
    const user = userEvent.setup();
    renderComoAlvo();

    await abrirEConfirmarBloqueio(user);

    await waitFor(() => expect(bloquearUsuario).toHaveBeenCalledWith('outro'));
    expect(
      await screen.findByText('Usuário bloqueado com sucesso'),
    ).toBeInTheDocument();
  });

  it('avisa quando o usuário já estava bloqueado (alreadyBlocked)', async () => {
    const user = userEvent.setup();
    bloquearUsuario.mockResolvedValue({ isBlocked: true, alreadyBlocked: true });
    renderComoAlvo();

    await abrirEConfirmarBloqueio(user);

    expect(
      await screen.findByText('Usuário já estava bloqueado.'),
    ).toBeInTheDocument();
  });

  it('mapeia erro 409 para "já estava bloqueado"', async () => {
    const user = userEvent.setup();
    bloquearUsuario.mockRejectedValue(Object.assign(new Error('conflito'), { status: 409 }));
    renderComoAlvo();

    await abrirEConfirmarBloqueio(user);

    expect(
      await screen.findByText('Usuário já estava bloqueado.'),
    ).toBeInTheDocument();
  });

  it('mapeia erro >= 500 para mensagem de tentar novamente', async () => {
    const user = userEvent.setup();
    bloquearUsuario.mockRejectedValue(Object.assign(new Error('boom'), { status: 500 }));
    renderComoAlvo();

    await abrirEConfirmarBloqueio(user);

    expect(
      await screen.findByText(
        'Não foi possível bloquear o usuário agora. Tente novamente em instantes.',
      ),
    ).toBeInTheDocument();
  });
});
