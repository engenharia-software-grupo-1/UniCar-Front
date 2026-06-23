export async function login({ usuario, senha }) {
  await new Promise((resolve) => setTimeout(resolve, 1000));

  if (usuario === 'erro') {
    throw new Error('Usuário ou senha inválidos.');
  }

  const session = {
    token: 'token-simulado',
    usuario: {
      nome: 'Usuário UniCar',
      usuarioInstitucional: usuario,
    },
  };

  localStorage.setItem('unicar.session', JSON.stringify(session));

  return session;
}