import { http, HttpResponse } from 'msw';

const API_BASE_URL = import.meta.env?.VITE_API_URL ?? 'http://localhost:8080';

// Store em memória que emula a persistência do backend US6.
// Reiniciado por `resetStore()` entre os testes.
// O campo do tipo é o enum `tipoVeiculo` (CARRO | MOTO), como no contrato US6:
// a tradução para o 'carro' | 'moto' da UI é responsabilidade do vehicleService.
const estadoInicial = () => [
  { id: 1, modelo: 'Onix', placa: 'ABC1D23', cor: 'Prata', tipoVeiculo: 'CARRO' },
  { id: 2, modelo: 'CG 160', placa: 'XYZ9A87', cor: 'Preta', tipoVeiculo: 'MOTO' },
];

let veiculos = estadoInicial();
let proximoId = 3;

const avaliacoesIniciais = () => [
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
];

let avaliacoesRecebidas = avaliacoesIniciais();

function isoLocal(data) {
  const pad = (n) => String(n).padStart(2, '0');

  return (
    `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}` +
    `T${pad(data.getHours())}:${pad(data.getMinutes())}:00`
  );
}

function saidaEm(diasAFrente, hora) {
  const [h, m] = hora.split(':');
  const data = new Date();
  data.setDate(data.getDate() + diasAFrente);
  data.setHours(Number(h), Number(m), 0, 0);

  return isoLocal(data);
}

const caronasIniciais = () => [
  {
    id: 10,
    origem: { descricao: 'Bodocongó', latitude: -7.21456, longitude: -35.90872 },
    destino: { descricao: 'UFCG', latitude: -7.2159, longitude: -35.9095 },
    pontoEncontro: 'Campus Sede',
    dataHoraSaida: saidaEm(0, '13:30'),
    quantidadeVagas: 3,
    vagasDisponiveis: 1,
    valorContribuicao: 5.0,
    status: 'CRIADA',
    motorista: { id: 1, nome: 'Estudante UniCar' },
    veiculo: { id: 1, modelo: 'Onix', cor: 'Prata', tipo: 'carro' },
    passageiros: [
      {
        id: 1,
        reservaId: 101,
        nome: 'Ana Clara',
        curso: 'Ciência da Computação',
        avaliacao: 4.9,
        status: 'Confirmado',
      },
      {
        id: 2,
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
    origem: { descricao: 'Catolé', latitude: -7.2405, longitude: -35.8877 },
    destino: { descricao: 'UFCG', latitude: -7.2159, longitude: -35.9095 },
    pontoEncontro: 'Portão principal',
    dataHoraSaida: saidaEm(1, '07:00'),
    quantidadeVagas: 4,
    vagasDisponiveis: 4,
    valorContribuicao: 6.0,
    status: 'CRIADA',
    motorista: { id: 1, nome: 'Estudante UniCar' },
    veiculo: { id: 1, modelo: 'Onix', cor: 'Prata', tipo: 'carro' },
  },
];

let caronas = caronasIniciais();
let proximaCaronaId = 100;

export function resetStore() {
  veiculos = estadoInicial();
  proximoId = 3;
  avaliacoesRecebidas = avaliacoesIniciais();
  caronas = caronasIniciais();
  proximaCaronaId = 100;
}

export function semCaronas() {
  caronas = [];
}

export function semVeiculos() {
  veiculos = [];
}

export function semAvaliacoesRecebidas() {
  avaliacoesRecebidas = [];
}

function exigirAutorizacao(request) {
  const auth = request.headers.get('Authorization');

  if (!auth || !auth.startsWith('Bearer ')) {
    return HttpResponse.json({ message: 'Acesso negado' }, { status: 403 });
  }

  return null;
}

export const handlers = [
  // Resumo das reservas feitas pelo usuário. O store principal não mantém
  // reservas enviadas; os cenários específicos podem sobrescrever este handler.
  http.get(`${API_BASE_URL}/reservas/enviadas`, () => {
    return HttpResponse.json([], { status: 200 });
  }),

  // GET /avaliacoes/recebidas — lista avaliações recebidas pelo usuário.
  http.get(`${API_BASE_URL}/avaliacoes/recebidas`, ({ request }) => {
    const negado = exigirAutorizacao(request);
    if (negado) return negado;

    return HttpResponse.json(avaliacoesRecebidas, { status: 200 });
  }),

  // GET /caronas/minhas — caronas criadas pelo motorista (payload reduzido do contrato US7).
  http.get(`${API_BASE_URL}/caronas/minhas`, ({ request }) => {
    const negado = exigirAutorizacao(request);
    if (negado) return negado;

    const resumo = caronas.map(({ id, origem, destino, status, dataHoraSaida }) => ({
      id,
      origem,
      destino,
      status,
      dataHoraSaida,
    }));

    return HttpResponse.json(resumo, { status: 200 });
  }),

  // POST /caronas — cria UMA carona por data recebida em `datasHorasSaida`.
  // não é um atributo da carona: o front expande os dias marcados em datas e o
  // back materializa cada uma como uma carona independente.
  http.post(`${API_BASE_URL}/caronas`, async ({ request }) => {
    const negado = exigirAutorizacao(request);
    if (negado) return negado;

    const corpo = await request.json();
    const { veiculoId, origem, destino, quantidadeVagas, datasHorasSaida } = corpo;

    if (!veiculoId) {
      return HttpResponse.json({ message: 'Veículo é obrigatório' }, { status: 400 });
    }

    if (!Array.isArray(datasHorasSaida) || datasHorasSaida.length === 0) {
      return HttpResponse.json(
        { message: 'Informe ao menos uma data de saída' },
        { status: 400 },
      );
    }

    // RN-CAR-03: a quantidade de vagas deve ser maior que zero.
    if (!(quantidadeVagas > 0)) {
      return HttpResponse.json(
        { message: 'A quantidade de vagas deve ser maior que zero' },
        { status: 400 },
      );
    }

    // RN-CAR-05 / RN-CAR-06: origem e destino precisam de descrição.
    if (!origem?.descricao || !destino?.descricao) {
      return HttpResponse.json(
        { message: 'Origem e destino são obrigatórios' },
        { status: 400 },
      );
    }

    const dadosDaCarona = { ...corpo };
    delete dadosDaCarona.datasHorasSaida;

    const novas = datasHorasSaida.map((dataHoraSaida) => {
      const novaCarona = {
        ...dadosDaCarona,
        id: proximaCaronaId,
        dataHoraSaida,
        status: 'CRIADA',
      };

      proximaCaronaId += 1;
      caronas.push(novaCarona);

      return { id: novaCarona.id, status: novaCarona.status };
    });

    return HttpResponse.json(novas, { status: 201 });
  }),

  // GET /caronas/{id} — detalhe completo de uma carona.
  http.get(`${API_BASE_URL}/caronas/:id`, ({ request, params }) => {
    const negado = exigirAutorizacao(request);
    if (negado) return negado;

    const carona = caronas.find((item) => item.id === Number(params.id));

    if (!carona) {
      return HttpResponse.json({ message: 'Carona não encontrada' }, { status: 404 });
    }

    return HttpResponse.json(carona, { status: 200 });
  }),

  // PATCH /caronas/{id}/cancelar — cancela uma carona do motorista (contrato US7).
  http.patch(`${API_BASE_URL}/caronas/:id/cancelar`, ({ request, params }) => {
    const negado = exigirAutorizacao(request);
    if (negado) return negado;

    const carona = caronas.find((item) => item.id === Number(params.id));

    if (!carona) {
      return HttpResponse.json({ message: 'Carona não encontrada' }, { status: 404 });
    }

    carona.status = 'CANCELADA'; // resetStore() restaura o estado entre os testes
    return HttpResponse.json({ id: carona.id, status: carona.status }, { status: 200 });
  }),

  // PATCH /reservas/{reservaId}/remover — motorista remove um passageiro (204 sem
  // corpo). A reserva é endereçada por si só: achamos a carona dona varrendo o store.
  http.patch(`${API_BASE_URL}/reservas/:reservaId/remover`, ({ request, params }) => {
    const negado = exigirAutorizacao(request);
    if (negado) return negado;

    const pertenceAReserva = (passageiro) =>
      String(passageiro.reservaId ?? passageiro.id) === String(params.reservaId);

    const carona = caronas.find((item) =>
      Array.isArray(item.passageiros) && item.passageiros.some(pertenceAReserva),
    );

    if (!carona) {
      return HttpResponse.json({ message: 'Reserva não encontrada' }, { status: 404 });
    }

    const indice = carona.passageiros.findIndex(pertenceAReserva);
    const [removida] = carona.passageiros.splice(indice, 1);

    if (/confirmad|aceit/i.test(String(removida.status || ''))) {
      carona.vagasDisponiveis = Math.min(
        Number(carona.quantidadeVagas ?? carona.vagasDisponiveis ?? 0),
        Number(carona.vagasDisponiveis ?? 0) + 1,
      );
    }

    return new HttpResponse(null, { status: 204 });
  }),

  // GET /veiculos — lista os veículos do usuário autenticado.
  http.get(`${API_BASE_URL}/veiculos`, ({ request }) => {
    const negado = exigirAutorizacao(request);
    if (negado) return negado;

    return HttpResponse.json(veiculos, { status: 200 });
  }),

  // POST /veiculos — cadastra um novo veículo.
  http.post(`${API_BASE_URL}/veiculos`, async ({ request }) => {
    const negado = exigirAutorizacao(request);
    if (negado) return negado;

    const { modelo, placa, cor, tipoVeiculo } = await request.json();

    if (veiculos.some((veiculo) => veiculo.placa === placa)) {
      return HttpResponse.json({ message: 'Placa já cadastrada' }, { status: 400 });
    }

    const novoVeiculo = { id: proximoId, modelo, placa, cor, tipoVeiculo };
    proximoId += 1;
    veiculos.push(novoVeiculo);

    return HttpResponse.json(novoVeiculo, { status: 201 });
  }),

  // GET /veiculos/{id} — detalhe de um veículo.
  http.get(`${API_BASE_URL}/veiculos/:id`, ({ request, params }) => {
    const negado = exigirAutorizacao(request);
    if (negado) return negado;

    const veiculo = veiculos.find((item) => item.id === Number(params.id));

    if (!veiculo) {
      return HttpResponse.json({ message: 'Veículo não encontrado' }, { status: 404 });
    }

    return HttpResponse.json(veiculo, { status: 200 });
  }),

  // PUT /veiculos/{id} — atualiza um veículo.
  http.put(`${API_BASE_URL}/veiculos/:id`, async ({ request, params }) => {
    const negado = exigirAutorizacao(request);
    if (negado) return negado;

    const id = Number(params.id);
    const index = veiculos.findIndex((item) => item.id === id);

    if (index === -1) {
      return HttpResponse.json({ message: 'Veículo não encontrado' }, { status: 404 });
    }

    const { modelo, placa, cor, tipoVeiculo } = await request.json();

    const placaDuplicada = veiculos.some(
      (item) => item.placa === placa && item.id !== id,
    );

    if (placaDuplicada) {
      return HttpResponse.json({ message: 'Placa já cadastrada' }, { status: 400 });
    }

    veiculos[index] = { id, modelo, placa, cor, tipoVeiculo };

    return HttpResponse.json(veiculos[index], { status: 200 });
  }),

  // DELETE /veiculos/{id} — remove um veículo (204 sem conteúdo).
  http.delete(`${API_BASE_URL}/veiculos/:id`, ({ request, params }) => {
    const negado = exigirAutorizacao(request);
    if (negado) return negado;

    const id = Number(params.id);
    const index = veiculos.findIndex((item) => item.id === id);

    if (index === -1) {
      return HttpResponse.json({ message: 'Veículo não encontrado' }, { status: 404 });
    }

    veiculos.splice(index, 1);

    return new HttpResponse(null, { status: 204 });
  }),
];
