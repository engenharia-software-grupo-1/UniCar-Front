import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Os guards (RequireAuth / AppAutenticado) decidem acesso lendo estes dois
// serviços; controlá-los é o cerne destes testes.
vi.mock('./services/authService.js', () => ({
  isAuthenticated: vi.fn(),
  login: vi.fn(),
}));

vi.mock('./services/termsService.js', () => ({
  hasAcceptedTerms: vi.fn(),
  getTermsVersion: vi.fn(() => '1.1'),
  acceptTerms: vi.fn(),
}));

// O shell autenticado (LayoutApp → Topbar) busca notificações ao montar;
// sem este mock o MSW barra a request (onUnhandledRequest: 'error').
vi.mock('./services/notificationService.js', () => ({
  listarNotificacoes: vi.fn(() => Promise.resolve([])),
}));

// A rota /ofertar só redireciona para /ofertar-carona; a página em si é pesada
// e irrelevante para o teste de rota — stub para não montar seus serviços.
vi.mock('./pages/OfertarCarona/index.jsx', () => ({
  default: () => <div>pagina-ofertar-carona</div>,
}));

import App from './App.jsx';
import { isAuthenticated } from './services/authService.js';
import { hasAcceptedTerms } from './services/termsService.js';

// O App traz seu próprio BrowserRouter, então a rota inicial é ditada pela URL
// do jsdom (history), não por um MemoryRouter injetado.
function renderEm(rota) {
  window.history.pushState({}, '', rota);
  return render(<App />);
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
  window.history.pushState({}, '', '/');
});

describe('RequireAuth — rotas de leitura (só sessão)', () => {
  it('redireciona para /login quando não há sessão', async () => {
    isAuthenticated.mockReturnValue(false);

    renderEm('/politica-de-privacidade');

    await waitFor(() => expect(window.location.pathname).toBe('/login'));
    expect(screen.getByText('Entrar com SIGAA')).toBeInTheDocument();
  });

  it('renderiza a página protegida quando há sessão (sem exigir termos)', async () => {
    isAuthenticated.mockReturnValue(true);
    hasAcceptedTerms.mockReturnValue(false); // não importa aqui

    renderEm('/termos-de-uso');

    // Não redirecionou para /login: continua na rota de termos.
    await waitFor(() =>
      expect(window.location.pathname).toBe('/termos-de-uso'),
    );
  });
});

describe('AppAutenticado — rotas do app (sessão + termos)', () => {
  it('redireciona para /login quando não há sessão', async () => {
    isAuthenticated.mockReturnValue(false);
    hasAcceptedTerms.mockReturnValue(true);

    renderEm('/inicio');

    await waitFor(() => expect(window.location.pathname).toBe('/login'));
    expect(screen.getByText('Entrar com SIGAA')).toBeInTheDocument();
  });

  it('redireciona para /termos-de-uso quando há sessão mas os termos não foram aceitos', async () => {
    isAuthenticated.mockReturnValue(true);
    hasAcceptedTerms.mockReturnValue(false);

    renderEm('/inicio');

    await waitFor(() =>
      expect(window.location.pathname).toBe('/termos-de-uso'),
    );
    // Não caiu no /login: a sessão existe, só faltam os termos.
    expect(screen.queryByText('Entrar com SIGAA')).not.toBeInTheDocument();
  });

  it('monta o shell e a página quando há sessão e termos aceitos', async () => {
    isAuthenticated.mockReturnValue(true);
    hasAcceptedTerms.mockReturnValue(true);

    renderEm('/central-ajuda'); // página sem fetch, ideal para o caminho feliz

    await waitFor(() =>
      expect(window.location.pathname).toBe('/central-ajuda'),
    );
    // Não redirecionou: nem login nem termos aparecem.
    expect(screen.queryByText('Entrar com SIGAA')).not.toBeInTheDocument();
  });

  // Nota: não há teste com auth=false + terms=false porque ele não isolaria a
  // ordem dos guards — o destino /termos-de-uso cairia em RequireAuth e voltaria
  // a /login pelos dois caminhos. A ordem "sessão antes de termos" já é provada
  // pelo teste auth=false + terms=TRUE acima (só chega a /login se a sessão for
  // checada primeiro), que a mutação do guard de sessão derruba.
});

describe('Rotas públicas e especiais', () => {
  it('renderiza o Login em /login sem exigir sessão', async () => {
    isAuthenticated.mockReturnValue(false);

    renderEm('/login');

    expect(screen.getByText('Entrar com SIGAA')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/login');
  });

  it('renderiza o Login em /cadastro', async () => {
    isAuthenticated.mockReturnValue(false);

    renderEm('/cadastro');

    expect(screen.getByText('Entrar com SIGAA')).toBeInTheDocument();
  });

  it('redireciona /ofertar para /ofertar-carona', async () => {
    isAuthenticated.mockReturnValue(true);
    hasAcceptedTerms.mockReturnValue(true);

    renderEm('/ofertar');

    await waitFor(() =>
      expect(window.location.pathname).toBe('/ofertar-carona'),
    );
    expect(screen.getByText('pagina-ofertar-carona')).toBeInTheDocument();
  });

  it('cai na página 404 para rota inexistente', async () => {
    isAuthenticated.mockReturnValue(false);

    renderEm('/rota-que-nao-existe');

    // NaoEncontrada é pública: monta sem redirect.
    expect(window.location.pathname).toBe('/rota-que-nao-existe');
    expect(screen.queryByText('Entrar com SIGAA')).not.toBeInTheDocument();
  });
});
