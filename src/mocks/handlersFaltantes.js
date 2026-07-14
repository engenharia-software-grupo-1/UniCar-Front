// Handlers do modo híbrido (VITE_MOCK_FALTANTES): mockam APENAS os endpoints que
// ainda não existem na main da UniCar-API. Tudo o mais (/auth, /usuarios, /veiculos)
// não tem handler aqui e, com `onUnhandledRequest: 'bypass'`, vai para o backend real.
//
// Quando o backend ganhar /caronas (PRs US7), remova o handler correspondente daqui
// e a rota passa a bater na API de verdade sem mais nenhuma mudança.
//
// Os paths são relativos de propósito: em `npm run dev` o front chama a API pelo proxy
// do Vite (mesma origem), então URLs absolutas para :8080 não casariam.
import { http, HttpResponse } from 'msw';

const STORE_KEY = 'unicar.mock.hibrido.caronas';
const STORE_VERSION_KEY = 'unicar.mock.hibrido.version';
const STORE_VERSION = 'hibrido-v4';

function usuarioDaSessao() {
  try {
    const sessao = JSON.parse(localStorage.getItem('unicar.session'));
    const usuario = sessao?.usuario || {};

    return {
      id: usuario.id ?? '',
      nome: usuario.nomeCompleto || usuario.nome || 'Você',
      token: sessao?.token || '',
    };
  } catch {
    return { id: '', nome: 'Você', token: '' };
  }
}

function saidaEm(diasAFrente, hora, minuto) {
  const data = new Date();
  data.setDate(data.getDate() + diasAFrente);
  data.setHours(hora, minuto, 0, 0);

  const pad = (n) => String(n).padStart(2, '0');

  return (
    `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}` +
    `T${pad(data.getHours())}:${pad(data.getMinutes())}:00`
  );
}

// A semente nasce com o id do usuário logado como motorista — é isso que faz o
// `isMinhaCarona` do DetalheCarona reconhecer a carona como sua.
function semente() {
  const eu = usuarioDaSessao();

  return [
    {
      id: 10,
      origem: { descricao: 'Bodocongó' },
      destino: { descricao: 'UFCG' },
      pontoEncontro: 'Campus Sede',
      dataHoraSaida: saidaEm(0, 13, 30),
      quantidadeVagas: 3,
      vagasDisponiveis: 1,
      valorContribuicao: 5,
      status: 'CRIADA',
      motorista: { id: eu.id, nome: eu.nome, avaliacao: 4.8 },
      veiculo: { id: 1, modelo: 'Onix', cor: 'Prata', tipo: 'carro' },
      passageiros: [
        {
          id: 91,
          reservaId: 101,
          nome: 'Ana Clara',
          curso: 'Ciência da Computação',
          avaliacao: 4.9,
          status: 'Confirmado',
        },
        {
          id: 92,
          reservaId: 102,
          nome: 'Rafael Lima',
          curso: 'Design',
          avaliacao: 4.7,
          status: 'Pendente',
        },
      ],
    },
    // Caronas de outras pessoas: alimentam as sugestões e a busca com filtros, e
    // no detalhe exercitam o caminho de passageiro (botão "Solicitar carona").
    // Nesta eu sou passageira, com reserva ACEITA — é ela que faz o card
    // "Próxima carona" do Início mostrar "Você é passageiro". O papel vem da
    // reserva (US10), nunca do simples fato de a carona ser de outra pessoa.
    {
      id: 11,
      origem: { descricao: 'Catolé' },
      destino: { descricao: 'UFCG' },
      pontoEncontro: 'Portão principal',
      dataHoraSaida: saidaEm(1, 7, 0),
      quantidadeVagas: 4,
      vagasDisponiveis: 3,
      valorContribuicao: 6,
      status: 'CRIADA',
      motorista: {
        id: 999,
        nome: 'Marina Souza',
        curso: 'Engenharia Elétrica',
        genero: 'Feminino',
        avaliacao: 4.7,
      },
      veiculo: { id: 2, modelo: 'HB20', cor: 'Branco', tipo: 'carro' },
      passageiros: [
        {
          id: eu.id,
          reservaId: 201,
          nome: eu.nome,
          curso: 'Comunidade UFCG',
          avaliacao: 4.9,
          status: 'Confirmado',
        },
      ],
    },
    {
      id: 12,
      origem: { descricao: 'Centenário' },
      destino: { descricao: 'UFCG' },
      pontoEncontro: 'Praça do Centenário',
      dataHoraSaida: saidaEm(1, 12, 15),
      quantidadeVagas: 2,
      vagasDisponiveis: 2,
      valorContribuicao: 4,
      status: 'CRIADA',
      motorista: {
        id: 998,
        nome: 'Paulo Ferreira',
        curso: 'Ciência da Computação',
        genero: 'Masculino',
        avaliacao: 4.5,
      },
      veiculo: { id: 3, modelo: 'Gol', cor: 'Vermelho', tipo: 'carro' },
    },

    // Viagens minhas já concluídas: são o histórico de onde os trajetos
    // recorrentes são derivados. Sem elas, nenhum par origem→destino chega às
    // duas viagens que a RN-TRJ-02 exige e a tela fica sempre vazia.
    //
    // Com a carona 10, Bodocongó→UFCG soma 3 viagens; Malvinas→UFCG, 2.
    {
      id: 13,
      origem: { descricao: 'Bodocongó' },
      destino: { descricao: 'UFCG' },
      pontoEncontro: 'Campus Sede',
      dataHoraSaida: saidaEm(-1, 7, 10),
      quantidadeVagas: 3,
      vagasDisponiveis: 0,
      valorContribuicao: 5,
      status: 'FINALIZADA',
      motorista: { id: eu.id, nome: eu.nome, avaliacao: 4.8 },
      veiculo: { id: 1, modelo: 'Onix', cor: 'Prata', tipo: 'carro' },
    },
    {
      id: 14,
      origem: { descricao: 'Bodocongó' },
      destino: { descricao: 'UFCG' },
      pontoEncontro: 'Campus Sede',
      dataHoraSaida: saidaEm(-3, 7, 5),
      quantidadeVagas: 3,
      vagasDisponiveis: 1,
      valorContribuicao: 5,
      status: 'FINALIZADA',
      motorista: { id: eu.id, nome: eu.nome, avaliacao: 4.8 },
      veiculo: { id: 1, modelo: 'Onix', cor: 'Prata', tipo: 'carro' },
    },
    {
      id: 15,
      origem: { descricao: 'Malvinas' },
      destino: { descricao: 'UFCG' },
      pontoEncontro: 'Terminal de integração',
      dataHoraSaida: saidaEm(-2, 18, 30),
      quantidadeVagas: 4,
      vagasDisponiveis: 2,
      valorContribuicao: 6,
      status: 'FINALIZADA',
      motorista: { id: eu.id, nome: eu.nome, avaliacao: 4.8 },
      veiculo: { id: 1, modelo: 'Onix', cor: 'Prata', tipo: 'carro' },
    },
    {
      id: 16,
      origem: { descricao: 'Malvinas' },
      destino: { descricao: 'UFCG' },
      pontoEncontro: 'Terminal de integração',
      dataHoraSaida: saidaEm(-5, 18, 25),
      quantidadeVagas: 4,
      vagasDisponiveis: 0,
      valorContribuicao: 6,
      status: 'FINALIZADA',
      motorista: { id: eu.id, nome: eu.nome, avaliacao: 4.8 },
      veiculo: { id: 1, modelo: 'Onix', cor: 'Prata', tipo: 'carro' },
    },
  ];
}

function carregar() {
  if (localStorage.getItem(STORE_VERSION_KEY) !== STORE_VERSION) {
    const nova = semente();
    salvar(nova);
    localStorage.setItem(STORE_VERSION_KEY, STORE_VERSION);
    return nova;
  }

  try {
    const salvas = JSON.parse(localStorage.getItem(STORE_KEY));
    return Array.isArray(salvas) ? salvas : semente();
  } catch {
    return semente();
  }
}

function salvar(caronas) {
  localStorage.setItem(STORE_KEY, JSON.stringify(caronas));
}

const BLOQUEADOS_KEY = 'unicar.mock.hibrido.bloqueados';

function carregarBloqueados() {
  try {
    const salvos = JSON.parse(localStorage.getItem(BLOQUEADOS_KEY));
    return Array.isArray(salvos) ? salvos : [];
  } catch {
    return [];
  }
}

function salvarBloqueados(usuarios) {
  localStorage.setItem(BLOQUEADOS_KEY, JSON.stringify(usuarios));
}

// O nome vem do motorista da carona mockada, quando o id for conhecido.
function nomeDoUsuario(id) {
  const motorista = carregar()
    .map((carona) => carona.motorista)
    .find((item) => String(item?.id) === String(id));

  return motorista?.nome || 'Usuário bloqueado';
}

function souEu(carona) {
  const eu = usuarioDaSessao();

  return String(carona?.motorista?.id ?? '') === String(eu.id);
}

// Trajeto recorrente não é entidade: o back o deriva do histórico de caronas do
// motorista autenticado — agrupa por origem+destino (RN-TRJ-03), mantém quem tem
// duas viagens ou mais (RN-TRJ-02) e ordena pelos mais usados (RN-TRJ-04). O
// trajeto descreve APENAS origem e destino (RN-TRJ-08); horário, vagas e
// contribuição variam entre as viagens e ficam nas caronas.
function trajetosRecorrentes() {
  const grupos = new Map();

  carregar()
    .filter(souEu)
    .forEach((carona) => {
      const origem = carona.origem?.descricao?.trim();
      const destino = carona.destino?.descricao?.trim();

      if (!origem || !destino) {
        return;
      }

      const chave = `${origem.toLowerCase()}→${destino.toLowerCase()}`;
      const grupo = grupos.get(chave) || { origem: carona.origem, destino: carona.destino, datas: [] };

      grupo.datas.push(carona.dataHoraSaida);
      grupos.set(chave, grupo);
    });

  return [...grupos.values()]
    .filter((grupo) => grupo.datas.length >= 2)
    .sort((a, b) => b.datas.length - a.datas.length)
    .map((grupo, indice) => {
      const datas = [...grupo.datas].sort();

      return {
        // Mesma lacuna do contrato descrita em caronaService.js: o US8 pede um
        // {id} endereçável para algo que não é entidade, sem dizer como gerá-lo.
        // Espelhamos a escolha do serviço (posição no ranking) para os dois
        // caminhos não divergirem — mas o id muda quando a lista reordena.
        id: indice + 1,
        origem: grupo.origem,
        destino: grupo.destino,
        quantidadeViagens: datas.length,
        primeiraUtilizacao: datas[0],
        ultimaUtilizacao: datas[datas.length - 1],
      };
    });
}

function naoEncontrada() {
  return HttpResponse.json({ message: 'Carona não encontrada' }, { status: 404 });
}

function comCarona(id, acao) {
  const caronas = carregar();
  const carona = caronas.find((item) => String(item.id) === String(id));

  if (!carona) {
    return naoEncontrada();
  }

  const resposta = acao(carona, caronas);
  salvar(caronas);

  return resposta;
}

// O veículo vem do backend real: /veiculos não tem handler, então este fetch
// atravessa o MSW e chega na API. Sem isso a carona criada não teria modelo/cor.
async function buscarVeiculoReal(veiculoId) {
  const { token } = usuarioDaSessao();

  try {
    const resposta = await fetch(`/veiculos/${veiculoId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!resposta.ok) {
      return { id: veiculoId };
    }

    const veiculo = await resposta.json();

    return {
      id: veiculo.id,
      modelo: veiculo.modelo || '',
      cor: veiculo.cor || '',
      placa: veiculo.placa || '',
      tipo: (veiculo.tipoVeiculo || veiculo.tipo || 'CARRO').toLowerCase(),
    };
  } catch {
    return { id: veiculoId };
  }
}

export const handlersFaltantes = [
  // GET /reservas/enviadas (US10) — as reservas que EU pedi. É daqui que sai o
  // "você é passageiro": sem checar reserva, qualquer carona alheia viraria uma
  // carona minha. A carona vem sem dataHoraSaida, como manda o contrato — quem
  // precisa do horário busca GET /caronas/{id}.
  http.get('/reservas/enviadas', () => {
    const eu = usuarioDaSessao();

    const enviadas = carregar()
      .filter((carona) => !souEu(carona))
      .flatMap((carona) =>
        (carona.passageiros || [])
          .filter((passageiro) => String(passageiro.id) === String(eu.id))
          .map((passageiro) => ({
            id: passageiro.reservaId,
            carona: {
              id: carona.id,
              origem: carona.origem?.descricao || '',
              destino: carona.destino?.descricao || '',
            },
            status: passageiro.status === 'Confirmado' ? 'ACEITA' : 'PENDENTE',
            quantidadePassageiros: 1,
            valorContribuicao: carona.valorContribuicao,
          })),
      );

    return HttpResponse.json(enviadas, { status: 200 });
  }),

  // GET /caronas?origem=&destino=&genero=&curso= — busca (US9). Alimenta tanto a
  // tela Buscar Carona quanto as sugestões do Início: uma sugestão é só uma busca
  // sem filtro. Segue as RN-BUS: só CRIADA (01), nunca as minhas (02), só futuras
  // (04) e só com vaga (05).
  http.get('/caronas', ({ request }) => {
    const filtros = new URL(request.url).searchParams;
    const origem = filtros.get('origem');
    const destino = filtros.get('destino');
    const genero = filtros.get('genero');
    const curso = filtros.get('curso');
    const agora = Date.now();

    const contem = (valor, busca) =>
      String(valor || '').toLowerCase().includes(String(busca).toLowerCase());

    const resultado = carregar()
      .filter((carona) => !souEu(carona) && carona.status === 'CRIADA')
      .filter((carona) => new Date(carona.dataHoraSaida).getTime() >= agora)
      .filter((carona) => Number(carona.vagasDisponiveis ?? 0) > 0)
      .filter((carona) => !origem || contem(carona.origem?.descricao, origem))
      .filter((carona) => !destino || contem(carona.destino?.descricao, destino))
      .filter((carona) => !genero || carona.motorista?.genero === genero)
      .filter((carona) => !curso || contem(carona.motorista?.curso, curso));

    return HttpResponse.json(resultado, { status: 200 });
  }),

  // GET /caronas/minhas — só as caronas em que sou o motorista.
  http.get('/caronas/minhas', () => {
    const minhas = carregar()
      .filter(souEu)
      .map(({ id, origem, destino, status, dataHoraSaida }) => ({
        id,
        origem,
        destino,
        status,
        dataHoraSaida,
      }));

    return HttpResponse.json(minhas, { status: 200 });
  }),

  // POST /caronas — cria uma carona por data recebida em `datasHorasSaida`.
  http.post('/caronas', async ({ request }) => {
    const corpo = await request.json();
    const { veiculoId, origem, destino, quantidadeVagas, datasHorasSaida } = corpo;

    if (!veiculoId) {
      return HttpResponse.json({ message: 'Veículo é obrigatório' }, { status: 400 });
    }

    if (!Array.isArray(datasHorasSaida) || datasHorasSaida.length === 0) {
      return HttpResponse.json({ message: 'Informe ao menos uma data de saída' }, { status: 400 });
    }

    if (!(quantidadeVagas > 0)) {
      return HttpResponse.json(
        { message: 'A quantidade de vagas deve ser maior que zero' },
        { status: 400 },
      );
    }

    if (!origem?.descricao || !destino?.descricao) {
      return HttpResponse.json({ message: 'Origem e destino são obrigatórios' }, { status: 400 });
    }

    const eu = usuarioDaSessao();
    const veiculo = await buscarVeiculoReal(veiculoId);
    const caronas = carregar();
    const dadosBase = { ...corpo };
    delete dadosBase.datasHorasSaida;

    let proximoId = caronas.reduce((maior, carona) => Math.max(maior, Number(carona.id) || 0), 100);

    const criadas = datasHorasSaida.map((dataHoraSaida) => {
      proximoId += 1;

      const nova = {
        ...dadosBase,
        id: proximoId,
        dataHoraSaida,
        status: 'CRIADA',
        vagasDisponiveis: quantidadeVagas,
        motorista: { id: eu.id, nome: eu.nome },
        veiculo,
      };

      caronas.push(nova);

      return { id: nova.id, status: nova.status };
    });

    salvar(caronas);

    return HttpResponse.json(criadas, { status: 201 });
  }),

  // GET /caronas/{id} — detalhe completo.
  http.get('/caronas/:id', ({ params }) =>
    comCarona(params.id, (carona) => HttpResponse.json(carona, { status: 200 })),
  ),

  // PATCH /caronas/{id} — edição.
  http.patch('/caronas/:id', async ({ request, params }) => {
    const alteracoes = await request.json();

    return comCarona(params.id, (carona) => {
      Object.assign(carona, alteracoes);
      return HttpResponse.json(carona, { status: 200 });
    });
  }),

  http.patch('/caronas/:id/cancelar', ({ params }) =>
    comCarona(params.id, (carona) => {
      carona.status = 'CANCELADA';
      return HttpResponse.json({ id: carona.id, status: carona.status }, { status: 200 });
    }),
  ),

  http.patch('/caronas/:id/iniciar', ({ params }) =>
    comCarona(params.id, (carona) => {
      carona.status = 'EM_ANDAMENTO';
      return HttpResponse.json({ id: carona.id, status: carona.status }, { status: 200 });
    }),
  ),

  http.patch('/caronas/:id/finalizar', ({ params }) =>
    comCarona(params.id, (carona) => {
      carona.status = 'FINALIZADA';
      return HttpResponse.json({ id: carona.id, status: carona.status }, { status: 200 });
    }),
  ),

  // DELETE /caronas/{id}/reservas/{reservaId} — motorista remove um passageiro.
  http.delete('/caronas/:id/reservas/:reservaId', ({ params }) =>
    comCarona(params.id, (carona) => {
      const passageiros = Array.isArray(carona.passageiros) ? carona.passageiros : [];
      const indice = passageiros.findIndex(
        (passageiro) =>
          String(passageiro.reservaId ?? passageiro.id) === String(params.reservaId),
      );

      if (indice === -1) {
        return HttpResponse.json({ message: 'Reserva não encontrada' }, { status: 404 });
      }

      const [removida] = passageiros.splice(indice, 1);

      if (/confirmad|aceit/i.test(String(removida.status || ''))) {
        carona.vagasDisponiveis = Math.min(
          Number(carona.quantidadeVagas ?? 0),
          Number(carona.vagasDisponiveis ?? 0) + 1,
        );
      }

      return HttpResponse.json(
        { id: Number(params.reservaId), status: 'REMOVIDA' },
        { status: 200 },
      );
    }),
  ),

  // GET /usuarios/me/avaliacoes — avaliações recebidas.
  http.get('/usuarios/me/avaliacoes', () =>
    HttpResponse.json(
      [
        {
          id: 1,
          from: 'Mariana',
          nota: 5,
          comentario: 'Pontual, educada e deixou a viagem tranquila.',
          dataAvaliacao: '2026-06-15',
        },
        {
          id: 2,
          from: 'Carlos',
          nota: 4,
          comentario: 'Boa comunicação antes da carona.',
          dataAvaliacao: '2026-06-02',
        },
      ],
      { status: 200 },
    ),
  ),

  // POST /avaliacoes — avaliar um usuário.
  http.post('/avaliacoes', async ({ request }) => {
    const corpo = await request.json();

    return HttpResponse.json({ id: 999, ...corpo }, { status: 201 });
  }),

  // GET /trajetos-recorrentes — reproduz a derivação do US8 sobre o histórico do
  // motorista logado, já que o trajeto não existe como entidade.
  http.get('/trajetos-recorrentes', () =>
    HttpResponse.json(trajetosRecorrentes(), { status: 200 }),
  ),

  http.get('/trajetos-recorrentes/:id', ({ params }) => {
    const trajeto = trajetosRecorrentes().find(
      (item) => String(item.id) === String(params.id),
    );

    if (!trajeto) {
      return HttpResponse.json(
        { message: 'Trajeto recorrente não encontrado' },
        { status: 404 },
      );
    }

    return HttpResponse.json(trajeto, { status: 200 });
  }),

  // Bloqueio de usuários: a API só tem /usuarios/me e /usuarios/{matricula}, então
  // /usuarios/bloqueados e /usuarios/{id}/bloquear também precisam de mock. Sem eles,
  // o blockUserService cai no fallback dele e o bloqueio "funciona" sem persistir.
  http.get('/usuarios/bloqueados', () => HttpResponse.json(carregarBloqueados(), { status: 200 })),

  http.post('/usuarios/:id/bloquear', ({ params }) => {
    const bloqueados = carregarBloqueados();

    if (bloqueados.some((usuario) => String(usuario.id) === String(params.id))) {
      return HttpResponse.json({ message: 'Usuário já bloqueado' }, { status: 409 });
    }

    salvarBloqueados([...bloqueados, { id: params.id, nome: nomeDoUsuario(params.id) }]);

    return new HttpResponse(null, { status: 204 });
  }),

  http.delete('/usuarios/:id/bloquear', ({ params }) => {
    salvarBloqueados(
      carregarBloqueados().filter((usuario) => String(usuario.id) !== String(params.id)),
    );

    return new HttpResponse(null, { status: 204 });
  }),
];
