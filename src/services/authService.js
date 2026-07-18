import { apiRequest } from './api.js';
import { shouldUseMocks } from './apiConfig.js';
import { clearSession, migrateLegacySession, readStoredSession, saveSession } from './sessionStore.js';
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
      // A autenticação deve depender apenas das credenciais informadas — nunca
      // de um token antigo que possa ter permanecido na sessão do navegador.
      incluirAutorizacao: false,
    });

  if (!session?.token) {
    throw new Error('Resposta de autenticação inválida.');
  }

  const normalizedSession = {
    ...session,
    usuario: normalizeUsuario(session.usuario, identificacao),
    authenticatedAt: new Date().toISOString(),
  };

  saveSession(normalizedSession);

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
  clearSession();
}

export function getSession() {
  const parsedSession = readStoredSession();

  if (!parsedSession?.token) {
    return null;
  }

  const normalizedSession = {
    ...parsedSession,
    usuario: normalizeUsuario(parsedSession.usuario),
  };

  migrateLegacySession(normalizedSession);

  return normalizedSession;
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
