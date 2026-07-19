import { apiRequest } from './api.js';

export async function obterPerfilPublicoUsuario(usuarioId) {
  const perfil = await apiRequest(
    `/usuarios/${encodeURIComponent(usuarioId)}/perfil-publico`,
  );

  return normalizarPerfil(perfil);
}

function normalizarPerfil(perfil = {}) {
  return {
    id: perfil.id ?? perfil.usuarioId ?? '',
    nome: perfil.nome ?? perfil.nomeCompleto ?? 'Usuário UniCar',
    curso: perfil.curso ?? perfil.nomeCurso ?? perfil.course ?? 'Não informado',
    instituicao: 'UFCG',
    verificado: Boolean(perfil.verificado ?? perfil.motoristaVerificado),
    avaliacao: Number(perfil.reputacao ?? perfil.avaliacao ?? perfil.rating ?? 0),
    totalCaronas: Number(perfil.totalCaronas ?? 0),
    membroDesde: perfil.membroDesde ?? new Date().getFullYear(),
    biografia: perfil.biografia ?? 'Membro da comunidade UniCar.',
    avaliacoes: Array.isArray(perfil.avaliacoes) ? perfil.avaliacoes : [],
  };
}
