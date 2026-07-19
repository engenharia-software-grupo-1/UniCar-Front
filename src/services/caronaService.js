import { apiRequest } from './api.js';
import { shouldUseDevelopmentFallbacks, shouldUseLocalDataMocks } from './apiConfig.js';
import { listarReservasAceitas } from './reservaService.js';
import { expandirDatasDaRecorrencia } from '../utils/recorrencia.js';

// Próxima carona do usuário — o card da tela Início.
//
// Não existe GET /caronas/proxima: nenhum contrato define esse endpoint. A
// próxima carona é composta a partir do que existe, e são duas fontes, porque
// "minha carona" quer dizer duas coisas diferentes:
//   - MOTORISTA  → GET /caronas/minhas (US7), as caronas que eu dirijo;
//   - PASSAGEIRO → GET /reservas/enviadas (US10), filtrando as ACEITAS — é o
//     único jeito de saber onde eu peguei carona. Sem checar a reserva, qualquer
//     carona alheia viraria "você é passageiro", o que é falso.
//
// Vence a que sair primeiro, esteja eu ao volante ou no banco do carona.
export async function buscarProximaCarona() {
  if (shouldUseLocalDataMocks()) {
    const proxima = maisProxima(
      carregarCaronasMock().map((carona) => ({ ...carona, papel: 'MOTORISTA' })),
    );

    return proxima ? ajustarCarona(proxima) : null;
  }

  const [comoMotorista, comoPassageiro] = await Promise.all([
    caronasComoMotorista(),
    caronasComoPassageiro(),
  ]);

  const proxima = maisProxima([...comoMotorista, ...comoPassageiro]);

  return proxima ? ajustarCarona(proxima) : null;
}

async function caronasComoMotorista() {
  const resposta = await apiRequest('/caronas/minhas');

  return extrairLista(resposta).map((carona) => ({ ...carona, papel: 'MOTORISTA' }));
}

// A reserva não traz a data da carona (US10), só { id, origem, destino } — então
// buscamos o detalhe de cada carona reservada para saber qual sai primeiro.
async function caronasComoPassageiro() {
  const reservas = await listarReservasAceitas();

  const caronas = await Promise.all(
    reservas.map((reserva) =>
      apiRequest(`/caronas/${reserva.carona.id}`).catch(() => null),
    ),
  );

  return caronas
    .filter(Boolean)
    .map((carona) => ({ ...carona, papel: 'PASSAGEIRO' }));
}

// A que sai primeiro entre as que ainda vão acontecer.
function maisProxima(caronas) {
  const agora = Date.now();

  return caronas
    .filter((carona) => !['CANCELADA', 'FINALIZADA'].includes(carona.status))
    .filter((carona) => new Date(carona.dataHoraSaida).getTime() >= agora)
    .sort((a, b) => new Date(a.dataHoraSaida) - new Date(b.dataHoraSaida))[0];
}

// Sugestões da tela Início. Também não existe GET /caronas/sugestoes — mas o GET
// /caronas da busca (US9) já devolve exatamente o que uma sugestão é. A seleção
// local é uma salvaguarda para não exibir a própria carona e para entregar uma
// lista curta, ordenada para o perfil atual.
export async function buscarSugestoesDeCaronas(perfilUsuario = {}) {
  if (shouldUseLocalDataMocks()) {
    // O store local só tem caronas do próprio usuário e sugestão é, por
    // definição, carona dos outros (RN-BUS-02) — não há o que sugerir.
    return [];
  }

  const caronas = await buscarCaronas();

  return selecionarSugestoesDeCaronas(caronas, perfilUsuario);
}

function selecionarSugestoesDeCaronas(caronas, perfilUsuario) {
  const usuarioId = perfilUsuario?.id ?? perfilUsuario?.usuarioId ?? perfilUsuario?.userId;
  const cursoUsuario = normalizarTextoBusca(perfilUsuario?.curso);
  const agora = Date.now();

  return caronas
    .filter((carona) => usuarioId == null || String(carona.motorista?.id) !== String(usuarioId))
    .filter((carona) => Number(carona.vagasDisponiveis) > 0)
    .filter((carona) => String(carona.status).toUpperCase() === 'CRIADA')
    .filter((carona) => {
      const horario = new Date(carona.horario || carona.dataHoraSaida).getTime();
      return Number.isNaN(horario) || horario >= agora;
    })
    .sort((primeira, segunda) => {
      const primeiraCombinaCurso = Number(
        Boolean(cursoUsuario) && normalizarTextoBusca(primeira.motorista?.curso) === cursoUsuario,
      );
      const segundaCombinaCurso = Number(
        Boolean(cursoUsuario) && normalizarTextoBusca(segunda.motorista?.curso) === cursoUsuario,
      );

      if (primeiraCombinaCurso !== segundaCombinaCurso) {
        return segundaCombinaCurso - primeiraCombinaCurso;
      }

      const horarioPrimeira = new Date(primeira.horario || primeira.dataHoraSaida).getTime();
      const horarioSegunda = new Date(segunda.horario || segunda.dataHoraSaida).getTime();
      if (horarioPrimeira !== horarioSegunda) {
        return horarioPrimeira - horarioSegunda;
      }

      const vagas = Number(segunda.vagasDisponiveis) - Number(primeira.vagasDisponiveis);
      if (vagas !== 0) return vagas;

      return Number(primeira.preco) - Number(segunda.preco);
    })
    .slice(0, 6);
}

// Detalha uma carona (GET /caronas/{id}), trazendo ponto de encontro, vagas etc.
export async function obterCarona(id) {
  if (shouldUseLocalDataMocks()) {
    const carona = carregarCaronasMock().find((item) => item.id === Number(id));

    if (!carona) {
      throw new Error('Carona não encontrada.');
    }

    return ajustarCaronaMotorista(carona);
  }

  try {
    const carona = await apiRequest(`/caronas/${id}`);
    return ajustarCaronaMotorista(carona);
  } catch (error) {
    if (shouldUseDevelopmentFallbacks()) {
      const carona = carregarCaronasMock().find((item) => item.id === Number(id));
      if (carona) return ajustarCaronaMotorista(carona);
    }
    throw error;
  }
}

export async function listarPassageirosCarona(id) {
  const resposta = await apiRequest(`/caronas/${encodeURIComponent(id)}/passageiros`);
  const passageiros = Array.isArray(resposta)
    ? resposta
    : resposta?.content || resposta?.passageiros || resposta?.items || [];

  return normalizarPassageiros(passageiros);
}

// Cria caronas (POST /caronas). A recorrência não é um atributo da carona: os
// dias marcados pelo motorista viram uma lista de datas concretas e o back cria
// UMA carona por data. Por isso o payload leva `datasHorasSaida` e a resposta é
// a lista das caronas criadas: [{ id, status: 'CRIADA' }, ...].
export async function criarCarona(dados) {
  const datas = expandirDatasDaRecorrencia(dados);
  const payload = { ...montarPayloadBase(dados), datasHorasSaida: datas };

  if (shouldUseLocalDataMocks()) {
    const caronas = carregarCaronasMock();
    let proximoId = Math.max(10, ...caronas.map((carona) => carona.id));

    const novas = datas.map((dataHoraSaida) => {
      proximoId += 1;

      return {
        ...montarPayloadBase(dados),
        id: proximoId,
        dataHoraSaida,
        vagasDisponiveis: payload.quantidadeVagas,
        status: 'CRIADA',
      };
    });

    salvarCaronasMock([...caronas, ...novas]);

    return novas.map((carona) => ({ id: carona.id, status: 'CRIADA' }));
  }

  const criadas = await apiRequest('/caronas', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return Array.isArray(criadas) ? criadas : [criadas];
}

// Atualiza os dados editáveis de UMA carona (PUT /caronas/{id}). Cada carona é
// uma data só — não há recorrência a editar aqui.
export async function editarCarona(id, dados) {
  const base = montarPayloadBase(dados);

  if (shouldUseLocalDataMocks()) {
    const caronas = carregarCaronasMock();
    const indice = caronas.findIndex((item) => item.id === Number(id));

    if (indice === -1) {
      throw new Error('Carona não encontrada.');
    }

    const atualizada = {
      ...caronas[indice],
      ...base,
      dataHoraSaida: dados.dataHoraSaida,
      vagasDisponiveis: recalcularVagasDisponiveis(caronas[indice], base.quantidadeVagas),
    };

    caronas[indice] = atualizada;
    salvarCaronasMock(caronas);

    return ajustarCaronaMotorista(atualizada);
  }

  // O PUT reaproveita o CaronaRequestDTO da criação: exige o recurso inteiro e a
  // data em `datasHorasSaida` (lista de um item só). Payload parcial volta 400.
  const payload = { ...base, datasHorasSaida: [dados.dataHoraSaida] };

  const carona = await apiRequest(`/caronas/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

  return carona ? ajustarCaronaMotorista(carona) : { id: Number(id), status: 'ATUALIZADA' };
}

// Campos comuns a criar e editar. A data fica de fora porque as duas operações
// a tratam de forma diferente: criar leva `datasHorasSaida` (lista), editar leva
// `dataHoraSaida` (uma ocorrência).
//
// `observacao` é opcional (VARCHAR(255) nullable) e precisa ir SEMPRE no payload
// do PUT: como a edição substitui o recurso inteiro, omitir o campo apaga a
// observação já gravada. Vazio vira null, que é o que a API espera.
function montarPayloadBase(dados = {}) {
  return {
    veiculoId: Number(dados.veiculoId),
    origem: montarLocalContrato(dados.origem),
    destino: montarLocalContrato(dados.destino),
    pontoEncontro: dados.pontoEncontro ?? '',
    observacao: normalizarObservacao(dados.observacao),
    quantidadeVagas: Number(dados.quantidadeVagas),
    valorContribuicao: Number(dados.valorContribuicao),
  };
}

export const OBSERVACAO_MAX = 255;

function normalizarObservacao(observacao) {
  const texto = String(observacao ?? '').trim();

  return texto ? texto.slice(0, OBSERVACAO_MAX) : null;
}

// Busca uma carona via endpoint GET /caronas
// Rótulo do <select> de gênero (UI) → nome do enum Genero do backend.
const GENERO_UI_PARA_API = {
  Feminino: 'FEMININO',
  Masculino: 'MASCULINO',
  Outro: 'OUTRO',
};

function mapearGeneroParaApi(genero) {
  return GENERO_UI_PARA_API[genero] ?? String(genero).toUpperCase();
}

export async function buscarCaronas(filtros = {}) {
  const params = new URLSearchParams();

  if (filtros.origem) {
    params.append('origem', filtros.origem);
  }

  if (filtros.destino) {
    params.append('destino', filtros.destino);
  }

  // O backend filtra por `generoMotorista` (comparação exata com o enum Genero:
  // MASCULINO|FEMININO|OUTRO|NAO_INFORMADO) e `cursoMotorista` (LIKE, sem caixa).
  // Enviar `genero`/`curso` ou o rótulo com acentuação/caixa da UI faz o filtro
  // ser ignorado — por isso a busca não filtrava.
  if (filtros.genero && filtros.genero !== 'Qualquer') {
    params.append('generoMotorista', mapearGeneroParaApi(filtros.genero));
  }

  if (filtros.curso && filtros.curso !== 'Qualquer') {
    params.append('cursoMotorista', filtros.curso);
  }

  if (shouldUseLocalDataMocks()) {
    return buscarCaronasMock(filtros);
  }

  try {
    const resposta = await apiRequest(
      `/caronas?${params.toString()}`
    );

    const lista = extrairLista(resposta);

    // Temporário: enquanto a busca do backend ainda não possui dados,
    // completa uma resposta vazia com as caronas simuladas.
    return lista.length > 0 ? lista.map(ajustarCarona) : buscarCaronasMock(filtros);
  } catch {
    // Temporário enquanto a busca do backend estiver indisponível.
    return buscarCaronasMock(filtros);
  }
}

function buscarCaronasMock(filtros = {}) {
  let caronas = caronasBuscaSemente();

  if (filtros.origem) {
    caronas = caronas.filter((carona) =>
      normalizarTextoBusca(descricaoLocal(carona.origem)).includes(normalizarTextoBusca(filtros.origem)),
    );
  }

  if (filtros.destino) {
    caronas = caronas.filter((carona) =>
      normalizarTextoBusca(descricaoLocal(carona.destino)).includes(normalizarTextoBusca(filtros.destino)),
    );
  }

  if (filtros.genero && filtros.genero !== 'Qualquer') {
    caronas = caronas.filter((carona) => carona.motorista?.genero === filtros.genero);
  }

  if (filtros.curso && filtros.curso !== 'Qualquer') {
    caronas = caronas.filter((carona) =>
      String(carona.motorista?.curso || '').includes(filtros.curso),
    );
  }

  return caronas.map(ajustarCarona);
}

function normalizarTextoBusca(valor = '') {
  return String(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function caronasBuscaSemente() {
  return [
    {
      id: 901,
      origem: { descricao: 'Bodocongó' },
      destino: { descricao: 'UFCG' },
      pontoEncontro: 'Portão principal',
      observacoes: 'Aceito até 3 paradas no caminho.',
      dataHoraSaida: saidaMockada(1, 7, 30),
      quantidadeVagas: 3,
      vagasDisponiveis: 2,
      valorContribuicao: 5,
      status: 'CRIADA',
      motorista: {
        id: 901,
        nome: 'Marina Souza',
        curso: 'Eng. Elétrica',
        genero: 'Feminino',
        avaliacao: 4.9,
        verificado: true,
      },
      veiculo: { id: 901, modelo: 'Mobi', cor: 'Azul', tipo: 'carro', placa: 'JKL-0M12' },
    },
    {
      id: 902,
      origem: { descricao: 'Bodocongó' },
      destino: { descricao: 'UFCG' },
      pontoEncontro: 'Biblioteca Central',
      observacoes: 'Combinar o ponto exato pelo chat.',
      dataHoraSaida: saidaMockada(1, 18, 10),
      quantidadeVagas: 4,
      vagasDisponiveis: 3,
      valorContribuicao: 6,
      status: 'CRIADA',
      motorista: {
        id: 902,
        nome: 'João Mendes',
        curso: 'Eng. Computação',
        genero: 'Masculino',
        avaliacao: 4.7,
        verificado: true,
      },
      veiculo: { id: 902, modelo: 'Onix', cor: 'Prata', tipo: 'carro', placa: 'QWE-2A34' },
    },
  ];
}

// O contrato exige origem/destino com descricao, latitude e longitude. A UI só
// coleta texto, então preenchemos as coordenadas com null quando ausentes.
function montarLocalContrato(valor) {
  if (valor && typeof valor === 'object') {
    return {
      descricao: valor.descricao ?? '',
      latitude: valor.latitude ?? null,
      longitude: valor.longitude ?? null,
    };
  }

  return { descricao: valor ?? '', latitude: null, longitude: null };
}

function recalcularVagasDisponiveis(caronaAtual, novaQuantidadeVagas) {
  const quantidadeAtual = Number(caronaAtual.quantidadeVagas ?? 0);
  const vagasAtuais = Number(caronaAtual.vagasDisponiveis ?? novaQuantidadeVagas);
  const passageirosConfirmados = Math.max(0, quantidadeAtual - vagasAtuais);

  return Math.max(0, Number(novaQuantidadeVagas) - passageirosConfirmados);
}

// Cancela uma carona do motorista (PATCH /caronas/{id}/cancelar) — contrato
// US7-BACK-05. Sem corpo; devolve { id, status: 'CANCELADA' }.
export async function cancelarCarona(id) {
  if (shouldUseLocalDataMocks()) {
    const caronas = carregarCaronasMock();
    const carona = caronas.find((item) => item.id === Number(id));

    if (carona) {
      carona.status = 'CANCELADA';
      salvarCaronasMock(caronas);
    }

    return { id: Number(id), status: 'CANCELADA' };
  }

  return apiRequest(`/caronas/${id}/cancelar`, { method: 'PATCH' });
}

// Inicia uma carona do motorista (PATCH /caronas/{id}/iniciar) — contrato
// US7-BACK-08. O backend responde 204 sem corpo; normalizamos o retorno para a
// tela conseguir atualizar o card imediatamente.
export async function iniciarCarona(id) {
  if (shouldUseLocalDataMocks()) {
    const caronas = carregarCaronasMock();
    const carona = caronas.find((item) => item.id === Number(id));

    if (carona) {
      carona.status = 'EM_ANDAMENTO';
      salvarCaronasMock(caronas);
    }

    return { id: Number(id), status: 'EM_ANDAMENTO' };
  }

  const resposta = await apiRequest(`/caronas/${id}/iniciar`, {
    method: 'PATCH',
  });

  return resposta || { id: Number(id), status: 'EM_ANDAMENTO' };
}

// Finaliza uma carona do motorista (PATCH /caronas/{id}/finalizar) — contrato
// US7-BACK-09. O backend também responde 204 sem corpo.
export async function finalizarCarona(id) {
  if (shouldUseLocalDataMocks()) {
    const caronas = carregarCaronasMock();
    const carona = caronas.find((item) => item.id === Number(id));

    if (carona) {
      carona.status = 'FINALIZADA';
      salvarCaronasMock(caronas);
    }

    return {
      id: Number(id),
      status: 'FINALIZADA',
    };
  }

  const resposta = await apiRequest(`/caronas/${id}/finalizar`, {
    method: 'PATCH',
  });

  return resposta || { id: Number(id), status: 'FINALIZADA' };
}

// Remove uma reserva da carona (PATCH /reservas/{reservaId}/remover).
//
// A API só autoriza o DONO da reserva (o passageiro) a chamar isto: o
// `ReservaCaronaService.validarDono` compara o usuário do token com o passageiro
// e devolve 403 para o motorista, apesar do Swagger anunciar "remove passageiro
// de uma carona". Verificado contra o backend em 14/07/2026.
//
// Ou seja: a remoção pelo MOTORISTA (que é quem chama isto no DetalheCarona) NÃO
// tem endpoint hoje — em produção ela responde 403. Só funciona porque o MSW
// intercepta antes. Enquanto o backend não expuser a versão do motorista, esta
// função só é confiável no fluxo "passageiro cancela a própria reserva".
export async function removerReservaCarona(caronaId, reservaId) {
  if (!caronaId || !reservaId) {
    throw new Error('Reserva inválida.');
  }

  if (shouldUseLocalDataMocks()) {
    const caronas = carregarCaronasMock();
    const carona = caronas.find((item) => item.id === Number(caronaId));

    if (!carona) return { id: Number(reservaId), status: 'REMOVIDA' };

    const passageiros = Array.isArray(carona.passageiros) ? carona.passageiros : [];
    const indice = passageiros.findIndex((passageiro) =>
      String(getReservaId(passageiro)) === String(reservaId),
    );

    if (indice === -1) return { id: Number(reservaId), status: 'REMOVIDA' };

    const [removida] = passageiros.splice(indice, 1);

    if (isReservaConfirmada(removida)) {
      carona.vagasDisponiveis = Math.min(
        Number(carona.quantidadeVagas ?? carona.vagasDisponiveis ?? 0),
        Number(carona.vagasDisponiveis ?? 0) + 1,
      );
    }

    salvarCaronasMock(caronas);

    return { id: Number(reservaId), status: 'REMOVIDA' };
  }

  // A remoção é endereçada pela reserva, não pela carona: PATCH /reservas/{id}/remover
  // (204 sem corpo, daí devolvermos o status por conta própria). O `caronaId` só
  // serve ao store mockado acima.
  await apiRequest(`/reservas/${reservaId}/remover`, { method: 'PATCH' });

  return { id: Number(reservaId), status: 'REMOVIDA' };
}

// Lista as caronas criadas pelo motorista autenticado. O GET /caronas/minhas
// devolve poucos campos, então enriquecemos cada item com o GET /caronas/{id}
// (em paralelo) para exibir ponto de encontro e contagem de passageiros.
export async function listarMinhasCaronas() {
  if (shouldUseLocalDataMocks()) {
    return carregarCaronasMock().map(ajustarCaronaMotorista);
  }

  try {
    const resposta = await apiRequest('/caronas/minhas');
    const lista = extrairLista(resposta);

    if (lista.length === 0 && shouldUseDevelopmentFallbacks()) {
      return carregarCaronasMock().map(ajustarCaronaMotorista);
    }

    return Promise.all(
      lista.map((carona) =>
        obterCarona(carona.id).catch(() => ajustarCaronaMotorista(carona)),
      ),
    );
  } catch (error) {
    if (shouldUseDevelopmentFallbacks()) {
      return carregarCaronasMock().map(ajustarCaronaMotorista);
    }
    throw error;
  }
}

// Store simulado (VITE_ENABLE_MOCKS / modo DEV) persistido em localStorage, para
// que caronas criadas via `criarCarona` apareçam em "Minhas caronas" e o
// cancelamento seja refletido — assim como o mock de veículos.
const MOCK_CARONAS_KEY = 'unicar.mock.caronas';
const MOCK_CARONAS_VERSION_KEY = 'unicar.mock.caronas.version';
// Bump ao mudar a semente: invalida os stores já gravados no localStorage.
const MOCK_CARONAS_VERSION = 'semente-v4';

// Semente inicial. As datas são geradas na hora para caírem em "Hoje"/"Amanhã".
function caronasSemente() {
  return [
    {
      id: 10,
      origem: { descricao: 'Bodocongó' },
      destino: { descricao: 'UFCG' },
      pontoEncontro: 'Campus Sede',
      dataHoraSaida: saidaMockada(0, 13, 30),
      quantidadeVagas: 3,
      vagasDisponiveis: 1,
      valorContribuicao: 5,
      status: 'CRIADA',
      motorista: { id: 1, nome: 'Estudante UniCar', avaliacao: 4.8 },
      veiculo: { id: 1, modelo: 'Onix', cor: 'Prata', tipo: 'carro' },
      passageiros: [
        {
          id: 'ana-clara',
          usuarioId: 'ana-clara',
          reservaId: 101,
          nome: 'Ana Clara',
          curso: 'Ciência da Computação',
          avaliacao: 4.9,
          status: 'Confirmado',
        },
        {
          id: 'rafael-lima',
          usuarioId: 'rafael-lima',
          reservaId: 102,
          nome: 'Rafael Lima',
          curso: 'Design',
          avaliacao: 4.7,
          status: 'Pendente',
        },
      ],
    },
    {
      id: 11,
      origem: { descricao: 'Catolé' },
      destino: { descricao: 'UFCG' },
      pontoEncontro: 'Portão principal',
      dataHoraSaida: saidaMockada(1, 7, 0),
      quantidadeVagas: 4,
      vagasDisponiveis: 4,
      valorContribuicao: 6,
      status: 'CRIADA',
      motorista: { id: 1, nome: 'Estudante UniCar', avaliacao: 4.8 },
      veiculo: { id: 1, modelo: 'Onix', cor: 'Prata', tipo: 'carro' },
    },

    // Viagens passadas. Não aparecem em "Minhas caronas" (que só lista CRIADA e
    // EM_ANDAMENTO), mas são o histórico de onde os trajetos recorrentes são
    // derivados — sem elas, nenhum trajeto atinge as duas viagens da RN-TRJ-02.
    //
    // Os offsets são propositalmente ímpares e distintos (-1, -3, -2): como a
    // recorrência não é mais um campo da carona, os dias exibidos no trajeto são
    // derivados do dia da semana em que as viagens caem. Offsets múltiplos de 7
    // cairiam todos no mesmo dia da semana e a tela mostraria um chip só.
    {
      id: 12,
      origem: { descricao: 'Bodocongó' },
      destino: { descricao: 'UFCG' },
      pontoEncontro: 'Campus Sede',
      dataHoraSaida: saidaMockada(-1, 7, 10),
      quantidadeVagas: 3,
      vagasDisponiveis: 0,
      valorContribuicao: 5,
      status: 'FINALIZADA',
      motorista: { id: 1, nome: 'Estudante UniCar', avaliacao: 4.8 },
      veiculo: { id: 1, modelo: 'Onix', cor: 'Prata', tipo: 'carro' },
    },
    {
      id: 13,
      origem: { descricao: 'Bodocongó' },
      destino: { descricao: 'UFCG' },
      pontoEncontro: 'Campus Sede',
      dataHoraSaida: saidaMockada(-3, 7, 5),
      quantidadeVagas: 3,
      vagasDisponiveis: 1,
      valorContribuicao: 5,
      status: 'FINALIZADA',
      motorista: { id: 1, nome: 'Estudante UniCar', avaliacao: 4.8 },
      veiculo: { id: 1, modelo: 'Onix', cor: 'Prata', tipo: 'carro' },
    },
    {
      id: 14,
      origem: { descricao: 'Catolé' },
      destino: { descricao: 'UFCG' },
      pontoEncontro: 'Portão principal',
      dataHoraSaida: saidaMockada(-2, 7, 0),
      quantidadeVagas: 4,
      vagasDisponiveis: 2,
      valorContribuicao: 6,
      status: 'FINALIZADA',
      motorista: { id: 1, nome: 'Estudante UniCar', avaliacao: 4.8 },
      veiculo: { id: 1, modelo: 'Onix', cor: 'Prata', tipo: 'carro' },
    },
  ];
}

function carregarCaronasMock() {
  if (localStorage.getItem(MOCK_CARONAS_VERSION_KEY) !== MOCK_CARONAS_VERSION) {
    const semente = caronasSemente();
    salvarCaronasMock(semente);
    localStorage.setItem(MOCK_CARONAS_VERSION_KEY, MOCK_CARONAS_VERSION);
    return semente;
  }

  const salvos = localStorage.getItem(MOCK_CARONAS_KEY);

  if (!salvos) {
    const semente = caronasSemente();
    salvarCaronasMock(semente);
    return semente;
  }

  try {
    return JSON.parse(salvos);
  } catch {
    const semente = caronasSemente();
    salvarCaronasMock(semente);
    return semente;
  }
}

function salvarCaronasMock(caronas) {
  localStorage.setItem(MOCK_CARONAS_KEY, JSON.stringify(caronas));
}

function saidaMockada(diasAFrente, hora, minuto) {
  const data = new Date();
  data.setDate(data.getDate() + diasAFrente);
  data.setHours(hora, minuto, 0, 0);

  const pad = (n) => String(n).padStart(2, '0');

  return (
    `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}` +
    `T${pad(data.getHours())}:${pad(data.getMinutes())}:00`
  );
}

function extrairLista(resposta) {
  if (Array.isArray(resposta)) {
    return resposta;
  }

  return resposta?.content || resposta?.caronas || resposta?.items || [];
}

function ajustarCaronaMotorista(carona = {}) {
  const quantidadeVagas = carona.quantidadeVagas ?? null;
  const vagasDisponiveis = carona.vagasDisponiveis ?? null;
  const passageirosConfirmados =
    quantidadeVagas !== null && vagasDisponiveis !== null
      ? Math.max(0, quantidadeVagas - vagasDisponiveis)
      : null;
  const motorista = carona.motorista || carona.driver || carona.usuario || {};
  const veiculo = carona.veiculo || carona.vehicle || {};
  const passageiros = normalizarPassageiros(carona.passageiros || carona.reservas);

  const caronaNormalizada = {
    id: carona.id,
    status: carona.status || 'CRIADA',
    dataHoraSaida: carona.dataHoraSaida || carona.dataHora || '',
    origem: descricaoLocal(carona.origem),
    destino: descricaoLocal(carona.destino),
    origemCoordenadas: coordenadasLocal(carona.origem),
    destinoCoordenadas: coordenadasLocal(carona.destino),
    pontoEncontro: carona.pontoEncontro || '',
    observacao: carona.observacao || '',
    valorContribuicao: carona.valorContribuicao ?? carona.valor ?? carona.preco ?? null,
    quantidadeVagas,
    vagasDisponiveis,
    passageirosConfirmados,
    motorista: {
      id: motorista.id ?? motorista.usuarioId ?? '',
      nome: motorista.nomeCompleto || motorista.nome || motorista.name || '',
      ...((motorista.curso || motorista.nomeCurso || motorista.course)
        ? { curso: motorista.curso || motorista.nomeCurso || motorista.course }
        : {}),
      avaliacao: motorista.avaliacao ?? motorista.rating ?? '',
    },
    veiculo: {
      id: veiculo.id ?? veiculo.veiculoId ?? '',
      tipo: veiculo.tipo || veiculo.type || 'carro',
      modelo: veiculo.modelo || veiculo.model || '',
      cor: veiculo.cor || veiculo.color || '',
      placa: veiculo.placa || '',
    },
  };

  if (passageiros.length > 0) {
    caronaNormalizada.passageiros = passageiros;
  }

  return caronaNormalizada;
}

function normalizarPassageiros(passageiros) {
  if (!Array.isArray(passageiros)) {
    return [];
  }

  return passageiros.map((passageiro, index) => ({
    id: passageiro.usuarioId ?? passageiro.userId ?? passageiro.id ?? index,
    reservaId: getReservaId(passageiro),
    nome: passageiro.nome || passageiro.nomeCompleto || passageiro.name || 'Passageiro',
    curso: passageiro.curso || passageiro.nomeCurso || passageiro.course || 'Comunidade UFCG',
    avaliacao: passageiro.avaliacao ?? passageiro.rating ?? 4.8,
    status: normalizarStatusReserva(passageiro.status || passageiro.situacao),
  }));
}

function getReservaId(passageiro = {}) {
  return (
    passageiro.reservaId ??
    passageiro.idReserva ??
    passageiro.reservationId ??
    passageiro.id
  );
}

function normalizarStatusReserva(status = '') {
  const statusNormalizado = String(status).toUpperCase();

  if (statusNormalizado === 'ACEITA' || statusNormalizado === 'ACEITO' || statusNormalizado === 'CONFIRMADA') {
    return 'Confirmado';
  }

  if (statusNormalizado === 'PENDENTE') {
    return 'Pendente';
  }

  return status || 'Confirmado';
}

function isReservaConfirmada(reserva = {}) {
  return /confirmad|aceit/i.test(String(reserva.status || reserva.situacao || ''));
}

function descricaoLocal(local) {
  if (!local) {
    return '';
  }

  return typeof local === 'string' ? local : local.descricao || '';
}

// Preserva as coordenadas que o backend devolve no detalhe. São obrigatórias no
// PUT: quem edita a carona precisa reenviá-las, senão a validação recusa com
// "Latitude é obrigatória". Devolve null quando o local não tem coordenadas.
function coordenadasLocal(local) {
  if (!local || typeof local !== 'object') {
    return null;
  }

  const latitude = Number(local.latitude);
  const longitude = Number(local.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return { latitude, longitude };
}

function ajustarCarona(carona = {}) {
  const motorista = carona.motorista || carona.driver || carona.usuario || {};
  const origem = descricaoLocal(carona.origem || carona.from || carona.pontoOrigem);
  const destino = descricaoLocal(carona.destino || carona.to || carona.pontoDestino);

  return {
    id: carona.id,
    dataHoraSaida: carona.dataHoraSaida || carona.horario || carona.time || carona.dataHora || '',
    horario: carona.dataHoraSaida || carona.horario || carona.time || carona.dataHora || '',
    origem,
    destino,
    rota: carona.rota || montarRota(origem, destino),
    valorContribuicao: carona.valorContribuicao ?? carona.preco ?? carona.price ?? carona.valor ?? 0,
    preco: carona.valorContribuicao ?? carona.preco ?? carona.price ?? carona.valor ?? 0,
    quantidadeVagas: carona.quantidadeVagas ?? carona.totalVagas ?? 0,
    vagasDisponiveis: carona.vagasDisponiveis ?? carona.vagas ?? carona.quantidadeVagas ?? 0,
    pontoEncontro: carona.pontoEncontro || '',
    observacoes: carona.observacoes || carona.observacao || carona.descricao || '',
    status: carona.status || 'CRIADA',
    papel: normalizarPapelNaCarona(carona),
    motorista: {
      id: motorista.id ?? motorista.usuarioId ?? '',
      nome: motorista.nomeCompleto || motorista.nome || motorista.name || '',
      avatar: motorista.avatar || primeiraLetra(motorista.nomeCompleto || motorista.nome || motorista.name),
      avaliacao: motorista.avaliacao || motorista.rating || '',
      curso: motorista.curso || motorista.course || '',
      genero: motorista.genero || motorista.gender || '',
      verificado: Boolean(motorista.verificado ?? motorista.motoristaVerificado),
    },
    veiculo: carona.veiculo || carona.vehicle || {},
  };
}

function normalizarPapelNaCarona(carona = {}) {
  const papel = String(carona.papel || carona.tipoParticipacao || carona.role || '').toUpperCase();

  if (papel.includes('MOTORISTA') || papel === 'DRIVER') return 'MOTORISTA';
  if (papel.includes('PASSAGEIRO') || papel === 'PASSENGER') return 'PASSAGEIRO';
  return '';
}

function montarRota(origem, destino) {
  if (origem && destino) {
    return `${origem} -> ${destino}`;
  }

  return origem || destino || '';
}

function primeiraLetra(nome = '') {
  return nome.trim()[0]?.toUpperCase() || '';
}

// TRAJETOS RECORRENTES (contrato US8)
//
// O back ainda não implementou /trajetos-recorrentes (a main da UniCar-API só
// expõe /auth, /usuarios e /veiculos), então os dados abaixo são provisórios —
// mas seguem o formato do contrato us8-trajetos-recorrentes.md, para que a
// troca pelo endpoint real não exija mudar a UI.
//
// Um trajeto recorrente é derivado do histórico de caronas e descreve APENAS
// origem e destino: veículo, horário, vagas, contribuição e ponto de encontro
// variam entre viagens e não fazem parte do trajeto (RN-TRJ-08).
export async function listarTrajetosRecorrentes() {
  if (shouldUseLocalDataMocks()) {
    return derivarTrajetosRecorrentes(carregarCaronasMock().map(ajustarCaronaMotorista));
  }

  const trajetos = await apiRequest('/trajetos-recorrentes');

  return (Array.isArray(trajetos) ? trajetos : []).map(ajustarTrajetoRecorrente);
}

export async function obterTrajetoRecorrente(id) {
  if (shouldUseLocalDataMocks()) {
    const trajetos = await listarTrajetosRecorrentes();
    const trajeto = trajetos.find((item) => String(item.id) === String(id));

    if (!trajeto) {
      throw new Error('Trajeto recorrente não encontrado.');
    }

    return trajeto;
  }

  return ajustarTrajetoRecorrente(await apiRequest(`/trajetos-recorrentes/${id}`));
}

// Reproduz no mock a derivação que o back faz: agrupa o histórico por
// origem+destino (RN-TRJ-03), mantém só quem tem duas ou mais viagens
// (RN-TRJ-02) e ordena pelas mais utilizadas (RN-TRJ-04). Assim os trajetos
// exibidos são sempre coerentes com as caronas do motorista — e a sugestão de
// "recriar viagem" tem de fato um histórico para consultar.
function derivarTrajetosRecorrentes(caronas) {
  const grupos = new Map();

  caronas.forEach((carona) => {
    const chave = chaveDoTrajeto(carona.origem, carona.destino);

    if (!chave) {
      return;
    }

    const grupo = grupos.get(chave) || {
      origem: carona.origem,
      destino: carona.destino,
      datas: [],
    };

    grupo.datas.push(carona.dataHoraSaida);
    grupos.set(chave, grupo);
  });

  return [...grupos.values()]
    .filter((grupo) => grupo.datas.length >= 2)
    .sort((a, b) => b.datas.length - a.datas.length)
    .map((grupo, indice) => {
      const datas = [...grupo.datas].sort();

      return {
        // LACUNA DO CONTRATO: o US8 expõe GET /trajetos-recorrentes/{id} e
        // POST /{id}/recriar, mas diz que o trajeto não existe como entidade — e
        // não define de onde vem esse id nem que ele é estável. Na falta de
        // regra, usamos a posição no ranking da RN-TRJ-04.
        //
        // Consequência conhecida: o id identifica a POSIÇÃO, não o trajeto. Uma
        // carona nova reordena a lista e o id passa a apontar para outra rota —
        // abrir /trajetos-recorrentes/1 (F5, link salvo) ou recriar via
        // `state.trajetoId` pode trazer a rota errada, sem erro nenhum.
        //
        // O back terá o mesmo problema ao implementar: id derivado do par
        // origem→destino (hash/slug) resolveria dos dois lados. Decidir junto.
        id: indice + 1,
        origem: grupo.origem,
        destino: grupo.destino,
        quantidadeViagens: grupo.datas.length,
        primeiraUtilizacao: datas[0] || '',
        ultimaUtilizacao: datas[datas.length - 1] || '',
      };
    });
}

// Um trajeto recorrente carrega apenas origem e destino (RN-TRJ-08). Tudo o
// mais que as telas mostram sobre ele — veículo, vagas, contribuição, ponto de
// encontro, horários, histórico — vive nas caronas daquele par origem→destino,
// a mesma fonte de onde o back deriva os trajetos.
//
// Devolve as caronas do trajeto, da mais recente para a mais antiga.
export async function listarCaronasDoTrajeto(origem, destino) {
  const alvo = chaveDoTrajeto(origem, destino);

  if (!alvo) {
    return [];
  }

  const caronas = await listarMinhasCaronas();

  return caronas
    .filter((carona) => chaveDoTrajeto(carona.origem, carona.destino) === alvo)
    .sort((a, b) => new Date(b.dataHoraSaida || 0) - new Date(a.dataHoraSaida || 0));
}

// Última carona do trajeto, usada como sugestão editável ao recriar a viagem.
// Devolve null quando não há histórico (ex.: primeira viagem).
export async function buscarUltimaCaronaDoTrajeto(origem, destino) {
  const caronas = await listarCaronasDoTrajeto(origem, destino);

  return caronas[0] || null;
}

// Agrupa por origem+destino como manda a RN-TRJ-03, tolerando caixa e espaços.
function chaveDoTrajeto(origem, destino) {
  const partes = [origem, destino].map((local) =>
    descricaoLocal(local).trim().toLowerCase(),
  );

  return partes.every(Boolean) ? partes.join('→') : '';
}

// O contrato entrega origem/destino como { descricao, latitude, longitude },
// mas a UI trabalha com texto — mesma normalização feita em ajustarCarona().
function ajustarTrajetoRecorrente(trajeto = {}) {
  return {
    id: trajeto.id,
    origem: descricaoLocal(trajeto.origem),
    destino: descricaoLocal(trajeto.destino),
    quantidadeViagens: trajeto.quantidadeViagens ?? 0,
    primeiraUtilizacao: trajeto.primeiraUtilizacao || '',
    ultimaUtilizacao: trajeto.ultimaUtilizacao || '',
  };
}
