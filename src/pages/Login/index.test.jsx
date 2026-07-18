import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('../../services/authService.js', () => ({
  login: vi.fn(),
}));

vi.mock('../../services/termsService.js', () => ({
  hasAcceptedTerms: vi.fn(),
}));

import Login from './index.jsx';
import { login } from '../../services/authService.js';
import { hasAcceptedTerms } from '../../services/termsService.js';

function renderLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  );
}

// Preenche os campos e submete pelo botão "Entrar" (dispara o onSubmit do form).
async function preencherEEntrar(usuario, senha) {
  const user = userEvent.setup();

  if (usuario !== undefined) {
    await user.type(screen.getByLabelText('Usuário'), usuario);
  }
  if (senha !== undefined) {
    await user.type(screen.getByLabelText('Senha'), senha);
  }

  await user.click(screen.getByRole('button', { name: /entrar/i }));
}

beforeEach(() => {
  vi.clearAllMocks();
  hasAcceptedTerms.mockReturnValue(true);
  login.mockResolvedValue({ token: 'tkn', usuario: {} });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Login — validação de credenciais', () => {
  it('exige usuário e senha quando ambos estão vazios', async () => {
    renderLogin();

    await preencherEEntrar();

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Informe usuário e senha institucional.',
    );
    expect(login).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('exige o usuário quando só a senha é preenchida', async () => {
    renderLogin();

    await preencherEEntrar(undefined, 'segredo');

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Informe o usuário institucional.',
    );
    expect(login).not.toHaveBeenCalled();
  });

  it('exige a senha quando só o usuário é preenchido', async () => {
    renderLogin();

    await preencherEEntrar('121110111');

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Informe a senha institucional.',
    );
    expect(login).not.toHaveBeenCalled();
  });

  it('trata usuário só com espaços como vazio', async () => {
    renderLogin();

    await preencherEEntrar('   ', 'segredo');

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Informe o usuário institucional.',
    );
    expect(login).not.toHaveBeenCalled();
  });
});

describe('Login — autenticação bem-sucedida', () => {
  it('chama login com o usuário sem espaços em volta e a senha', async () => {
    renderLogin();

    await preencherEEntrar('  121110111  ', 'segredo');

    await waitFor(() => expect(login).toHaveBeenCalledTimes(1));
    expect(login).toHaveBeenCalledWith({
      usuario: '121110111',
      senha: 'segredo',
    });
  });

  it('navega para /inicio quando os termos já foram aceitos', async () => {
    hasAcceptedTerms.mockReturnValue(true);
    renderLogin();

    await preencherEEntrar('121110111', 'segredo');

    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith('/inicio', { replace: true }),
    );
  });

  it('navega para /termos-de-uso quando os termos ainda não foram aceitos', async () => {
    hasAcceptedTerms.mockReturnValue(false);
    renderLogin();

    await preencherEEntrar('121110111', 'segredo');

    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith('/termos-de-uso', {
        replace: true,
      }),
    );
  });

  it('não deixa o botão preso em "Autenticando..." após o sucesso', async () => {
    renderLogin();

    await preencherEEntrar('121110111', 'segredo');

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /entrar/i }),
      ).not.toBeDisabled(),
    );
  });
});

describe('Login — falha na autenticação', () => {
  it('mostra a mensagem de erro vinda do serviço', async () => {
    login.mockRejectedValue(new Error('Matrícula ou senha inválida.'));
    renderLogin();

    await preencherEEntrar('121110111', 'errada');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Matrícula ou senha inválida.',
    );
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('usa mensagem genérica quando o erro não traz mensagem', async () => {
    login.mockRejectedValue(new Error());
    renderLogin();

    await preencherEEntrar('121110111', 'segredo');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível realizar o login.',
    );
  });

  it('reabilita o botão após a falha (não fica preso em loading)', async () => {
    login.mockRejectedValue(new Error('falhou'));
    renderLogin();

    await preencherEEntrar('121110111', 'segredo');

    await screen.findByRole('alert');
    expect(screen.getByRole('button', { name: /entrar/i })).not.toBeDisabled();
  });

  it('limpa a mensagem de erro ao reenviar o formulário', async () => {
    login.mockRejectedValueOnce(new Error('primeira falha'));
    renderLogin();

    await preencherEEntrar('121110111', 'segredo');
    expect(await screen.findByRole('alert')).toHaveTextContent('primeira falha');

    // segundo envio: login resolve (default do beforeEach) → erro some
    await userEvent.setup().click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() =>
      expect(screen.queryByRole('alert')).not.toBeInTheDocument(),
    );
  });
});
