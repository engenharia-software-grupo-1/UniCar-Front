import { getSession, normalizeUsuario } from './authService.js';
import { apiRequest } from './api.js';

const PROFILE_PHOTO_KEY_PREFIX = 'unicar.profile.photo.';

function salvarSessaoAtualizada(session) {
  sessionStorage.setItem('unicar.session', JSON.stringify(session));
}

export async function getPerfilUsuarioAutenticado() {
  const session = getSession();

  if (!session) {
    throw new Error('Usuário não autenticado.');
  }

  const usuarioApi = normalizeUsuario(await apiRequest('/usuarios/me'));
  const usuario = {
    ...usuarioApi,
    fotoUrl:
      getFotoPerfil(usuarioApi) ||
      getFotoPerfilSalva(usuarioApi, session.usuario) ||
      getFotoPerfil(session.usuario),
  };

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
    fotoUrl: getFotoPerfil(usuario),
  };
}

export async function atualizarPerfilUsuarioAutenticado(dadosAtualizados) {
  const session = getSession();

  if (!session) {
    throw new Error('Usuário não autenticado.');
  }

  const usuarioApi = normalizeUsuario(await apiRequest('/usuarios/me', {
    method: 'PATCH',
    body: JSON.stringify({
      genero: toGeneroApiValue(dadosAtualizados.genero),
      receberEmail: dadosAtualizados.recebeEmails,
      curso: dadosAtualizados.curso,
    }),
  }));
  const fotoFoiInformada = Object.hasOwn(dadosAtualizados, 'fotoUrl');
  const usuarioAtualizado = {
    ...usuarioApi,
    fotoUrl:
      fotoFoiInformada
        ? dadosAtualizados.fotoUrl
        : getFotoPerfil(usuarioApi) || getFotoPerfil(session.usuario),
  };

  // Atualizações parciais (curso, gênero ou preferências) não podem apagar a
  // foto persistida. Remoção só ocorre quando fotoUrl é enviado explicitamente.
  if (fotoFoiInformada) {
    salvarFotoPerfil(usuarioAtualizado, session.usuario, dadosAtualizados.fotoUrl);
  }

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

  removerFotoPerfil(session.usuario);

  sessionStorage.removeItem('unicar.session');
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

function getFotoPerfil(usuario = {}) {
  const foto = (
    usuario.fotoUrl ||
    usuario.fotoPerfil ||
    usuario.avatarUrl ||
    usuario.avatar ||
    usuario.imagemPerfil ||
    usuario.profileImage ||
    ''
  );

  return isImagemPerfilValida(foto) ? foto : '';
}

function getFotoPerfilSalva(...usuarios) {
  for (const usuario of usuarios) {
    const identificador = getIdentificadorFoto(usuario);
    const foto = identificador ? localStorage.getItem(`${PROFILE_PHOTO_KEY_PREFIX}${identificador}`) : '';

    if (isImagemPerfilValida(foto)) return foto;
  }

  return '';
}

function salvarFotoPerfil(usuarioAtualizado, usuarioSessao, fotoUrl) {
  const identificador = getIdentificadorFoto(usuarioAtualizado) || getIdentificadorFoto(usuarioSessao);

  if (!identificador) return;

  const chave = `${PROFILE_PHOTO_KEY_PREFIX}${identificador}`;
  if (isImagemPerfilValida(fotoUrl)) localStorage.setItem(chave, fotoUrl);
  else localStorage.removeItem(chave);
}

function removerFotoPerfil(usuario) {
  const identificador = getIdentificadorFoto(usuario);
  if (identificador) localStorage.removeItem(`${PROFILE_PHOTO_KEY_PREFIX}${identificador}`);
}

function getIdentificadorFoto(usuario = {}) {
  return String(
    usuario.id ?? usuario.usuarioId ?? usuario.userId ?? usuario.matricula ?? usuario.emailInstitucional ?? '',
  ).trim();
}

function isImagemPerfilValida(foto) {
  return /^data:image\/|^https?:\/\//i.test(String(foto || ''));
}
