const SESSION_KEY = 'unicar.session';

function delay(ms = 900) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function login({ matricula, usuario, senha }) {
  await delay();

  const identificacao = matricula || usuario;

  if (!identificacao || !senha) {
    throw new Error('Informe matrícula e senha institucional.');
  }

  if (identificacao.toLowerCase() === 'erro') {
    throw new Error('Usuário ou senha inválidos.');
  }

  const session = {
    token: 'token-simulado',
    usuario: {
      id: 1,
      nomeCompleto: 'Usuário UniCar',
      matricula: identificacao,
      cpf: '000.000.000-00',
      emailInstitucional: 'usuario@academico.ufcg.edu.br',
      curso: 'Ciência da Computação',
      genero: 'Não informado',
      recebeEmails: true,
    },
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(session));

  return session;
}

export async function logout() {
  await delay(300);

  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
}

export function getSession() {
  const session = localStorage.getItem(SESSION_KEY);

  if (!session) {
    return null;
  }

  try {
    return JSON.parse(session);
  } catch {
    return null;
  }
}

export function isAuthenticated() {
  const session = getSession();

  return Boolean(session?.token);
}