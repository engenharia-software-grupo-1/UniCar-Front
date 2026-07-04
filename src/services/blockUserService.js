import { apiRequest } from './api.js';
import { shouldUseLocalDataMocks } from './apiConfig.js';
import { getSession } from './authService.js';

const MOCK_BLOCKED_USERS_KEY = 'unicar.mock.usuariosBloqueados';
const MOCK_BLOCKED_USERS_VERSION_KEY = 'unicar.mock.usuariosBloqueados.version';
const MOCK_BLOCKED_USERS_VERSION = 'v2';
const MOCK_BLOCKED_USERS = [
  {
    id: '2',
    name: 'Marina Alves',
    course: 'Direito',
    avatar: 'MA',
    blockedAt: '04/07/2026',
  },
];

export async function listarUsuariosBloqueados() {
  if (usarBloqueiosMockados()) {
    return carregarUsuariosBloqueadosMockados();
  }

  try {
    const usuarios = await apiRequest('/usuarios/bloqueados');

    if (!Array.isArray(usuarios)) {
      return [];
    }

    return usuarios.map(toBlockedUser);
  } catch (error) {
    if (deveUsarFallbackMockado(error)) {
      return carregarUsuariosBloqueadosMockados();
    }

    throw error;
  }
}

export async function bloquearUsuario(userId) {
  if (!userId) {
    throw new Error('Usuário inválido para bloqueio.');
  }

  if (usarBloqueiosMockados()) {
    return bloquearUsuarioMockado(userId);
  }

  try {
    await apiRequest(`/usuarios/${userId}/bloquear`, {
      method: 'POST',
    });

    return {
      isBlocked: true,
      alreadyBlocked: false,
    };
  } catch (error) {
    if (error.status === 409 || isUsuarioJaBloqueado(error)) {
      return {
        isBlocked: true,
        alreadyBlocked: true,
      };
    }

    if (deveUsarFallbackMockado(error)) {
      return bloquearUsuarioMockado(userId);
    }

    throw error;
  }
}

export async function desbloquearUsuario(userId) {
  if (!userId) {
    throw new Error('Usuário inválido para desbloqueio.');
  }

  if (usarBloqueiosMockados()) {
    desbloquearUsuarioMockado(userId);
    return true;
  }

  try {
    await apiRequest(`/usuarios/${userId}/bloquear`, {
      method: 'DELETE',
    });
  } catch (error) {
    if (deveUsarFallbackMockado(error)) {
      desbloquearUsuarioMockado(userId);
      return true;
    }

    throw error;
  }

  return true;
}

function usarBloqueiosMockados() {
  return shouldUseLocalDataMocks();
}

function deveUsarFallbackMockado(error) {
  return error?.status === 404 || error?.status === 405 || /not found|not supported/i.test(error?.message || '');
}

function carregarUsuariosBloqueadosMockados() {
  if (localStorage.getItem(MOCK_BLOCKED_USERS_VERSION_KEY) !== MOCK_BLOCKED_USERS_VERSION) {
    localStorage.setItem(MOCK_BLOCKED_USERS_KEY, JSON.stringify(MOCK_BLOCKED_USERS));
    localStorage.setItem(MOCK_BLOCKED_USERS_VERSION_KEY, MOCK_BLOCKED_USERS_VERSION);
    return MOCK_BLOCKED_USERS;
  }

  const salvos = localStorage.getItem(MOCK_BLOCKED_USERS_KEY);

  if (!salvos) {
    localStorage.setItem(MOCK_BLOCKED_USERS_KEY, JSON.stringify(MOCK_BLOCKED_USERS));
    return MOCK_BLOCKED_USERS;
  }

  try {
    const usuarios = JSON.parse(salvos);
    return Array.isArray(usuarios) ? usuarios : MOCK_BLOCKED_USERS;
  } catch {
    localStorage.setItem(MOCK_BLOCKED_USERS_KEY, JSON.stringify(MOCK_BLOCKED_USERS));
    return MOCK_BLOCKED_USERS;
  }
}

function salvarUsuariosBloqueadosMockados(usuarios) {
  localStorage.setItem(MOCK_BLOCKED_USERS_KEY, JSON.stringify(usuarios));
}

function bloquearUsuarioMockado(userId) {
  exigirSessao();

  const usuarios = carregarUsuariosBloqueadosMockados();
  const id = String(userId);
  const jaBloqueado = usuarios.some((usuario) => String(usuario.id) === id);

  if (jaBloqueado) {
    return {
      isBlocked: true,
      alreadyBlocked: true,
    };
  }

  salvarUsuariosBloqueadosMockados([
    ...usuarios,
    {
      id,
      name: `Usuário ${id}`,
      course: 'Curso não informado',
      avatar: 'U',
      blockedAt: new Date().toLocaleDateString('pt-BR'),
    },
  ]);

  return {
    isBlocked: true,
    alreadyBlocked: false,
  };
}

function desbloquearUsuarioMockado(userId) {
  exigirSessao();

  const id = String(userId);
  const usuarios = carregarUsuariosBloqueadosMockados();
  salvarUsuariosBloqueadosMockados(usuarios.filter((usuario) => String(usuario.id) !== id));
}

function exigirSessao() {
  if (!getSession()) {
    throw new Error('Usuário não autenticado.');
  }
}

function isUsuarioJaBloqueado(error) {
  return error.status === 400 && /já bloqueado|ja bloqueado/i.test(error.message || '');
}

function toBlockedUser(usuario) {
  const nome = usuario.nomeCompleto || usuario.nome || usuario.name || 'Usuário';

  return {
    id: usuario.id ?? usuario.usuarioId ?? usuario.userId ?? '',
    name: nome,
    course: usuario.curso || usuario.nomeCurso || usuario.course || 'Curso não informado',
    avatar: getInitials(nome),
    blockedAt: formatarDataBloqueio(usuario.blockedAt || usuario.bloqueadoEm || usuario.createdAt),
  };
}

function getInitials(nome) {
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join('') || 'U';
}

function formatarDataBloqueio(data) {
  if (!data) {
    return 'data não informada';
  }

  const parsedDate = new Date(data);

  if (Number.isNaN(parsedDate.getTime())) {
    return data;
  }

  return parsedDate.toLocaleDateString('pt-BR');
}
