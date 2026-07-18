import { apiRequest } from './api.js';
import { shouldUseLocalDataMocks } from './apiConfig.js';

const PERFIS_PUBLICOS_MOCK = {
  marina: { id: 'marina', nome: 'Marina Souza', curso: 'Eng. Computação', reputacao: 4.9 },
  beatriz: { id: 'beatriz', nome: 'Beatriz Lima', curso: 'Design', reputacao: 4.9 },
  rafael: { id: 'rafael', nome: 'Rafael Costa', curso: 'Administração', reputacao: 4.3 },
  ana: { id: 'ana', nome: 'Ana Paula', curso: 'Ciência da Computação', reputacao: 4.5 },
};

export async function obterPerfilPublicoUsuario(usuarioId) {
  if (shouldUseLocalDataMocks()) {
    return normalizarPerfil(PERFIS_PUBLICOS_MOCK[String(usuarioId)] || {
      id: usuarioId,
      nome: 'Usuário UniCar',
      curso: 'Comunidade UniCar',
    });
  }

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
