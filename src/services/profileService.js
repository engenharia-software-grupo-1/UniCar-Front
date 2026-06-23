export async function getPerfilUsuarioAutenticado() {
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const session = localStorage.getItem('unicar.session');

  if (!session) {
    throw new Error('Usuário não autenticado.');
  }

  const simularErro = localStorage.getItem('unicar.profile.error');

  if (simularErro === '1') {
    throw new Error('Não foi possível carregar os dados do perfil.');
  }

  return {
    nomeCompleto: 'Usuário UniCar',
    matricula: '121110000',
    cpf: '000.000.000-00',
    emailInstitucional: 'usuario@academico.ufcg.edu.br',
    curso: 'Ciência da Computação',
    genero: 'Não informado',
    recebeEmails: true,
  };
}