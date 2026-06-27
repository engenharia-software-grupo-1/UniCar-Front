import { apiRequest } from './api.js';

const SESSION_KEY = 'unicar.session';

export async function login({ matricula, usuario, senha }) {
  const identificacao = (matricula || usuario || '').trim();

  if (!identificacao || !senha) {
    throw new Error('Informe matrícula e senha institucional.');
  }

  const session = await apiRequest('/auth/login', {
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

  localStorage.setItem(SESSION_KEY, JSON.stringify(normalizedSession));

  return normalizedSession;
}

export async function logout() {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
}

export function getSession() {
  const session = localStorage.getItem(SESSION_KEY);

  if (!session) {
    return null;
  }

  try {
    const parsedSession = JSON.parse(session);

    if (!parsedSession?.token) {
      return null;
    }

    return {
      ...parsedSession,
      usuario: normalizeUsuario(parsedSession.usuario),
    };
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
    nomeCompleto: usuario.nomeCompleto || usuario.nome || 'Usuário UniCar',
    matricula: usuario.matricula || usuario.usuario || identificacao,
    emailInstitucional:
      usuario.emailInstitucional || usuario.email || 'usuario@academico.ufcg.edu.br',
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
