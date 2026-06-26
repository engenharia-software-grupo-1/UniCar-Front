import { getSession } from './authService.js';

function delay(ms = 900) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function salvarSessaoAtualizada(session) {
  localStorage.setItem('unicar.session', JSON.stringify(session));
}

export async function getPerfilUsuarioAutenticado() {
  await delay();

  const session = getSession();

  if (!session) {
    throw new Error('Usuário não autenticado.');
  }

  const simularErro = localStorage.getItem('unicar.profile.error');

  if (simularErro === '1') {
    throw new Error('Não foi possível carregar os dados do perfil.');
  }

  return {
    nomeCompleto: session.usuario?.nomeCompleto || 'Usuário UniCar',
    matricula: session.usuario?.matricula || '121110000',
    cpf: session.usuario?.cpf || '000.000.000-00',
    emailInstitucional:
      session.usuario?.emailInstitucional || 'usuario@academico.ufcg.edu.br',
    curso: session.usuario?.curso || 'Ciência da Computação',
    genero: session.usuario?.genero || 'Não informado',
    recebeEmails: session.usuario?.recebeEmails ?? true,
  };
}

export async function atualizarPerfilUsuarioAutenticado(dadosAtualizados) {
  await delay();

  const session = getSession();

  if (!session) {
    throw new Error('Usuário não autenticado.');
  }

  const simularErro = localStorage.getItem('unicar.profile.update.error');

  if (simularErro === '1') {
    throw new Error('Não foi possível salvar as alterações do perfil.');
  }

  const usuarioAtualizado = {
    ...session.usuario,
    genero: dadosAtualizados.genero,
    recebeEmails: dadosAtualizados.recebeEmails,
  };

  const novaSessao = {
    ...session,
    usuario: usuarioAtualizado,
  };

  salvarSessaoAtualizada(novaSessao);

  return {
    nomeCompleto: usuarioAtualizado.nomeCompleto || 'Usuário UniCar',
    matricula: usuarioAtualizado.matricula || '121110000',
    cpf: usuarioAtualizado.cpf || '000.000.000-00',
    emailInstitucional:
      usuarioAtualizado.emailInstitucional || 'usuario@academico.ufcg.edu.br',
    curso: usuarioAtualizado.curso || 'Ciência da Computação',
    genero: usuarioAtualizado.genero || 'Não informado',
    recebeEmails: usuarioAtualizado.recebeEmails ?? true,
  };
}

export async function excluirContaUsuarioAutenticado() {
  await delay();

  const session = getSession();

  if (!session) {
    throw new Error('Usuário não autenticado.');
  }

  const simularErro = localStorage.getItem('unicar.profile.delete.error');

  if (simularErro === '1') {
    throw new Error('Não foi possível excluir a conta.');
  }

  localStorage.removeItem('unicar.session');
  localStorage.removeItem('unicar.terms.acceptance');

  return true;
}