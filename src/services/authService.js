import { apiRequest } from './api.js';
import { shouldUseMocks } from './apiConfig.js';

const SESSION_KEY = 'unicar.session';
const MOCK_TOKEN = 'mocked-unicar-token';

function usarAutenticacaoMockada() {
  return shouldUseMocks();
}

export async function login({ matricula, usuario, senha }) {
  const identificacao = (matricula || usuario || '').trim();

  if (!identificacao || !senha) {
    throw new Error('Informe matrícula e senha institucional.');
  }

  const session = usarAutenticacaoMockada()
    ? criarSessaoMockada(identificacao)
    : await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          usuario: identificacao,
          senha,
        }),
      });

  if (!session?.token) {
    throw new Error('Resposta de autenticação inválida.');
  }

  const normalizedSession = {
    ...session,
    usuario: normalizeUsuario(session.usuario, identificacao),
    authenticatedAt: new Date().toISOString(),
  };

  sessionStorage.setItem(SESSION_KEY, JSON.stringify(normalizedSession));

  return normalizedSession;
}

function criarSessaoMockada(identificacao) {
  return {
    token: MOCK_TOKEN,
    usuario: {
      id: 1,
      nomeCompleto: 'Estudante UniCar',
      matricula: identificacao,
      emailInstitucional: `${identificacao}@academico.ufcg.edu.br`,
      curso: 'Ciência da Computação',
      recebeEmails: true,
    },
  };
}

export async function logout() {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
}

export function getSession() {
  const session = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);

  if (!session) {
    return null;
  }

  try {
    const parsedSession = JSON.parse(session);

    if (!parsedSession?.token) {
      return null;
    }

    const normalizedSession = {
      ...parsedSession,
      usuario: normalizeUsuario(parsedSession.usuario),
    };

    // Migra sessões antigas sem manter o token persistido após fechar o browser.
    if (!sessionStorage.getItem(SESSION_KEY)) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(normalizedSession));
      localStorage.removeItem(SESSION_KEY);
    }

    return normalizedSession;
  } catch {
    return null;
  }
}

export function isAuthenticated() {
  const session = getSession();

  return Boolean(session?.token);
}

export function normalizeUsuario(usuario = {}, identificacao = '') {
  return {
    ...usuario,
    nomeCompleto: usuario.nomeCompleto || usuario.nome || '',
    matricula: usuario.matricula || usuario.usuario || identificacao,
    emailInstitucional:
      usuario.emailInstitucional || usuario.email || '',
    curso: getCurso(usuario),
    recebeEmails: usuario.recebeEmails ?? usuario.receberEmail ?? true,
  };
}

function getCurso(usuario) {
  return (
    usuario.curso ||
    usuario.nomeCurso ||
    usuario.nomeDoCurso ||
    usuario.programa ||
    usuario.attributes?.curso ||
    usuario.attributes?.nomeCurso ||
    usuario.attributes?.nomeDoCurso ||
    usuario.attributes?.programa ||
    ''
  );
}
