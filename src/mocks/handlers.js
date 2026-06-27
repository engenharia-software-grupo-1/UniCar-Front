import { http, HttpResponse } from 'msw';

const API_BASE_URL = import.meta.env?.VITE_API_URL ?? 'http://localhost:8080';

// Store em memória que emula a persistência do backend US6.
// Reiniciado por `resetStore()` entre os testes.
const estadoInicial = () => [
  { id: 1, modelo: 'Onix', placa: 'ABC1D23', cor: 'Prata' },
  { id: 2, modelo: 'HB20', placa: 'XYZ9A87', cor: 'Branco' },
];

let veiculos = estadoInicial();
let proximoId = 3;

export function resetStore() {
  veiculos = estadoInicial();
  proximoId = 3;
}

export function semVeiculos() {
  veiculos = [];
}

function exigirAutorizacao(request) {
  const auth = request.headers.get('Authorization');

  if (!auth || !auth.startsWith('Bearer ')) {
    return HttpResponse.json({ message: 'Acesso negado' }, { status: 403 });
  }

  return null;
}

export const handlers = [
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

    const { modelo, placa, cor } = await request.json();

    if (veiculos.some((veiculo) => veiculo.placa === placa)) {
      return HttpResponse.json({ message: 'Placa já cadastrada' }, { status: 400 });
    }

    const novoVeiculo = { id: proximoId, modelo, placa, cor };
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

    const { modelo, placa, cor } = await request.json();

    const placaDuplicada = veiculos.some(
      (item) => item.placa === placa && item.id !== id,
    );

    if (placaDuplicada) {
      return HttpResponse.json({ message: 'Placa já cadastrada' }, { status: 400 });
    }

    veiculos[index] = { id, modelo, placa, cor };

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
