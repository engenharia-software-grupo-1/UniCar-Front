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
const STORE_VERSION = 'hibrido-v1';

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
    // Carona de outra pessoa: aparece em sugestões e, no detalhe, exercita o
    // caminho de passageiro (botão "Solicitar carona").
    {
      id: 11,
      origem: { descricao: 'Catolé' },
      destino: { descricao: 'UFCG' },
      pontoEncontro: 'Portão principal',
      dataHoraSaida: saidaEm(1, 7, 0),
      quantidadeVagas: 4,
      vagasDisponiveis: 4,
      valorContribuicao: 6,
      status: 'CRIADA',
      motorista: { id: 999, nome: 'Marina Souza', curso: 'Engenharia Elétrica', avaliacao: 4.7 },
      veiculo: { id: 2, modelo: 'HB20', cor: 'Branco', tipo: 'carro' },
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

function souEu(carona) {
  const eu = usuarioDaSessao();

  return String(carona?.motorista?.id ?? '') === String(eu.id);
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
  // GET /caronas/proxima — card da tela Início.
  http.get('/caronas/proxima', () => {
    const agora = Date.now();
    const proxima = carregar()
      .filter((carona) => !['CANCELADA', 'FINALIZADA'].includes(carona.status))
      .filter((carona) => new Date(carona.dataHoraSaida).getTime() >= agora)
      .sort((a, b) => new Date(a.dataHoraSaida) - new Date(b.dataHoraSaida))[0];

    if (!proxima) {
      return HttpResponse.json(null, { status: 200 });
    }

    return HttpResponse.json(
      { ...proxima, papel: souEu(proxima) ? 'MOTORISTA' : 'PASSAGEIRO' },
      { status: 200 },
    );
  }),

  // GET /caronas/sugestoes — caronas de outras pessoas.
  http.get('/caronas/sugestoes', () => {
    const sugestoes = carregar().filter(
      (carona) => !souEu(carona) && carona.status === 'CRIADA',
    );

    return HttpResponse.json(sugestoes, { status: 200 });
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

  // POST /caronas — cria uma carona por data recebida em `datas` (contrato US7).
  http.post('/caronas', async ({ request }) => {
    const corpo = await request.json();
    const { veiculoId, origem, destino, quantidadeVagas, datas } = corpo;

    if (!veiculoId) {
      return HttpResponse.json({ message: 'Veículo é obrigatório' }, { status: 400 });
    }

    if (!Array.isArray(datas) || datas.length === 0) {
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
    delete dadosBase.datas;

    let proximoId = caronas.reduce((maior, carona) => Math.max(maior, Number(carona.id) || 0), 100);

    const criadas = datas.map((dataHoraSaida) => {
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

  // GET /trajetos-recorrentes — ainda sem dados; devolve lista vazia (tela de estado vazio).
  http.get('/trajetos-recorrentes', () => HttpResponse.json([], { status: 200 })),
];
