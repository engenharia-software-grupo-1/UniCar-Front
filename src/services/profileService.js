import { getSession, normalizeUsuario } from './authService.js';
import { apiRequest } from './api.js';

function salvarSessaoAtualizada(session) {
  localStorage.setItem('unicar.session', JSON.stringify(session));
}

export async function getPerfilUsuarioAutenticado() {
  const session = getSession();

  if (!session) {
    throw new Error('Usuário não autenticado.');
  }

  const usuario = normalizeUsuario(await apiRequest('/usuarios/me'));

  salvarSessaoAtualizada({
    ...session,
    usuario,
  });

  return toPerfil(usuario);
}

function toPerfil(usuario) {
  return {
    id: usuario.id ?? usuario.usuarioId ?? usuario.userId ?? '',
    nomeCompleto: usuario.nomeCompleto || '',
    matricula: usuario.matricula || 'Não informado',
    cpf: usuario.cpf || 'Não informado',
    emailInstitucional: usuario.emailInstitucional || 'Não informado',
    telefone: usuario.telefone || usuario.celular || '',
    curso: usuario.curso || '',
    genero: toGeneroLabel(usuario.genero),
    recebeEmails: usuario.recebeEmails ?? true,
    matriculaValidada: usuario.matriculaValidada ?? usuario.validado ?? usuario.verified ?? false,
    motoristaVerificado: usuario.motoristaVerificado ?? usuario.driverVerified ?? false,
    avaliacao: usuario.avaliacao ?? usuario.rating ?? '',
    totalCaronas: usuario.totalCaronas ?? usuario.ridesCount ?? usuario.quantidadeCaronas ?? '',
    isBlocked: usuario.isBlocked ?? usuario.bloqueado ?? usuario.blocked ?? false,
  };
}

export async function atualizarPerfilUsuarioAutenticado(dadosAtualizados) {
  const session = getSession();

  if (!session) {
    throw new Error('Usuário não autenticado.');
  }

  const usuarioAtualizado = normalizeUsuario(await apiRequest('/usuarios/me', {
    method: 'PATCH',
    body: JSON.stringify({
      genero: toGeneroApiValue(dadosAtualizados.genero),
      receberEmail: dadosAtualizados.recebeEmails,
      curso: dadosAtualizados.curso,
    }),
  }));

  const novaSessao = {
    ...session,
    usuario: usuarioAtualizado,
  };

  salvarSessaoAtualizada(novaSessao);

  return toPerfil(usuarioAtualizado);
}

export async function excluirContaUsuarioAutenticado() {
  const session = getSession();

  if (!session) {
    throw new Error('Usuário não autenticado.');
  }

  await apiRequest('/usuarios/me', {
    method: 'DELETE',
  });

  localStorage.removeItem('unicar.session');
  localStorage.removeItem('unicar.terms.acceptance');

  return true;
}

function toGeneroLabel(genero) {
  const labels = {
    FEMININO: 'Feminino',
    MASCULINO: 'Masculino',
    OUTRO: 'Outro',
    NAO_INFORMADO: 'Não informado',
  };

  return labels[genero] || genero || 'Não informado';
}

function toGeneroApiValue(genero) {
  const values = {
    Feminino: 'FEMININO',
    Masculino: 'MASCULINO',
    Outro: 'OUTRO',
    'Não informado': 'NAO_INFORMADO',
    'Prefiro não informar': 'NAO_INFORMADO',
  };

  return values[genero] || 'NAO_INFORMADO';
}
