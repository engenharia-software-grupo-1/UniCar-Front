const PERFIS_PUBLICOS_MOCK = {
  marina: {
    id: 'marina',
    nome: 'Marina Souza',
    curso: 'Eng. Computação',
    instituicao: 'UFCG',
    verificado: true,
    avaliacao: 4.9,
    totalCaronas: 24,
    membroDesde: 2023,
    biografia: 'Universitário focado em compartilhar caronas seguras e no horário.',
    avaliacoes: [
      {
        id: 1,
        autor: 'Beatriz L.',
        nota: 5,
        comentario: 'Super pontual e simpática!',
        data: '28/05',
      },
      {
        id: 2,
        autor: 'Rafael C.',
        nota: 5,
        comentario: 'Trajeto tranquilo, carro confortável.',
        data: '22/05',
      },
      {
        id: 3,
        autor: 'João M.',
        nota: 4,
        comentario: 'Recomendo, boa companhia.',
        data: '15/05',
      },
    ],
  },
  beatriz: {
    id: 'beatriz',
    nome: 'Beatriz Lima',
    curso: 'Design',
    instituicao: 'UFCG',
    verificado: true,
    avaliacao: 4.9,
    totalCaronas: 31,
    membroDesde: 2023,
    biografia: 'Motorista cuidadosa e acostumada com rotas para o campus.',
    avaliacoes: [
      {
        id: 1,
        autor: 'Marina S.',
        nota: 5,
        comentario: 'Carona tranquila e comunicação ótima.',
        data: '22/05',
      },
    ],
  },
  rafael: {
    id: 'rafael',
    nome: 'Rafael Costa',
    curso: 'Administração',
    instituicao: 'UFCG',
    verificado: true,
    avaliacao: 4.3,
    totalCaronas: 18,
    membroDesde: 2024,
    biografia: 'Costuma oferecer caronas pela manhã para a UFCG.',
    avaliacoes: [
      {
        id: 1,
        autor: 'Ana P.',
        nota: 4,
        comentario: 'Chegou no horário combinado.',
        data: '18/05',
      },
    ],
  },
  ana: {
    id: 'ana',
    nome: 'Ana Paula',
    curso: 'Ciência da Computação',
    instituicao: 'UFCG',
    verificado: true,
    avaliacao: 4.5,
    totalCaronas: 16,
    membroDesde: 2024,
    biografia: 'Compartilha rotas frequentes entre Centro e campus.',
    avaliacoes: [
      {
        id: 1,
        autor: 'Rafael C.',
        nota: 5,
        comentario: 'Muito educada e cuidadosa.',
        data: '15/05',
      },
    ],
  },
};

export async function obterPerfilPublicoUsuario(usuarioId) {
  const perfil = PERFIS_PUBLICOS_MOCK[normalizarUsuarioId(usuarioId)];

  if (!perfil) {
    throw new Error('Perfil não encontrado.');
  }

  return perfil;
}

function normalizarUsuarioId(usuarioId = '') {
  const id = String(usuarioId).trim().toLowerCase();

  const aliases = {
    '1': 'marina',
    'marina-souza': 'marina',
    '2': 'beatriz',
    'beatriz-lima': 'beatriz',
    '3': 'rafael',
    'rafael-costa': 'rafael',
    '4': 'ana',
    'ana-paula': 'ana',
  };

  return aliases[id] || id;
}
