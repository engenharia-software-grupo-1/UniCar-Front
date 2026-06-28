const API_BASE_URL = import.meta.env?.VITE_API_URL ?? 'http://localhost:8080';
const VEICULOS_ENDPOINT = `${API_BASE_URL}/veiculos`;
const TOKENMOCKED = "123456"
const MOCK_VEHICLES_KEY = 'unicar.mock.veiculos';

const VEICULOS_MOCKADOS = [
  { id: 1, modelo: 'Onix', placa: 'ABC1D23', cor: 'Prata' },
  { id: 2, modelo: 'HB20', placa: 'XYZ9A87', cor: 'Branco' },
];

function usarVeiculosMockados() {
  return (
    import.meta.env.VITE_ENABLE_MOCKS === 'true' ||
    !import.meta.env.VITE_API_URL
  );
}

function carregarVeiculosMockados() {
  const salvos = localStorage.getItem(MOCK_VEHICLES_KEY);

  if (!salvos) {
    localStorage.setItem(MOCK_VEHICLES_KEY, JSON.stringify(VEICULOS_MOCKADOS));
    return [...VEICULOS_MOCKADOS];
  }

  try {
    return JSON.parse(salvos);
  } catch {
    localStorage.setItem(MOCK_VEHICLES_KEY, JSON.stringify(VEICULOS_MOCKADOS));
    return [...VEICULOS_MOCKADOS];
  }
}

function salvarVeiculosMockados(veiculos) {
  localStorage.setItem(MOCK_VEHICLES_KEY, JSON.stringify(veiculos));
}

function obterToken() {
  const sessionJSON = usarVeiculosMockados()
    ? JSON.stringify({ token: TOKENMOCKED })
    : localStorage.getItem('unicar.session');

  if (!sessionJSON) {
    throw new Error('Usuário não autenticado.');
  }

  try {
    const session = JSON.parse(sessionJSON);

    if (!session?.token) {
      throw new Error('Usuário não autenticado.');
    }

    return session.token;
  } catch {
    throw new Error('Usuário não autenticado.');
  }
}

function montarHeaders(token, comCorpo = false) {
  const headers = {
    Authorization: `Bearer ${token}`,
  };

  if (comCorpo) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
}

async function extrairMensagemErro(response, mensagemPadrao) {
  try {
    const corpo = await response.json();

    if (corpo?.message) {
      return corpo.message;
    }
  } catch {
    // Resposta sem corpo JSON; usa a mensagem padrão.
  }

  return mensagemPadrao;
}

async function requisitar(url, opcoes, mensagemErroPadrao) {
  let response;

  try {
    response = await fetch(url, opcoes);
  } catch {
    throw new Error('Não foi possível conectar ao servidor. Tente novamente.');
  }

  if (!response.ok) {
    const mensagem = await extrairMensagemErro(response, mensagemErroPadrao);

    throw new Error(mensagem);
  }

  return response;
}

export async function listarVeiculos() {
  if (usarVeiculosMockados()) {
    obterToken();
    return carregarVeiculosMockados();
  }

  const token = obterToken();

  const response = await requisitar(
    VEICULOS_ENDPOINT,
    { method: 'GET', headers: montarHeaders(token) },
    'Não foi possível carregar os veículos.',
  );

  return response.json();
}

export async function obterVeiculo(id) {
  if (usarVeiculosMockados()) {
    obterToken();

    const veiculo = carregarVeiculosMockados().find((item) => item.id === Number(id));

    if (!veiculo) {
      throw new Error('Veículo não encontrado.');
    }

    return veiculo;
  }

  const token = obterToken();

  const response = await requisitar(
    `${VEICULOS_ENDPOINT}/${id}`,
    { method: 'GET', headers: montarHeaders(token) },
    'Não foi possível carregar o veículo.',
  );

  return response.json();
}

export async function criarVeiculo({ modelo, placa, cor }) {
  if (usarVeiculosMockados()) {
    obterToken();

    const veiculos = carregarVeiculosMockados();

    if (veiculos.some((veiculo) => veiculo.placa === placa)) {
      throw new Error('Placa já cadastrada');
    }

    const novoVeiculo = {
      id: Math.max(0, ...veiculos.map((veiculo) => veiculo.id)) + 1,
      modelo,
      placa,
      cor,
    };

    salvarVeiculosMockados([...veiculos, novoVeiculo]);

    return novoVeiculo;
  }

  const token = obterToken();

  const response = await requisitar(
    VEICULOS_ENDPOINT,
    {
      method: 'POST',
      headers: montarHeaders(token, true),
      body: JSON.stringify({ modelo, placa, cor }),
    },
    'Não foi possível cadastrar o veículo.',
  );

  return response.json();
}

export async function atualizarVeiculo(id, { modelo, placa, cor }) {
  if (usarVeiculosMockados()) {
    obterToken();

    const veiculos = carregarVeiculosMockados();
    const idNumerico = Number(id);
    const index = veiculos.findIndex((veiculo) => veiculo.id === idNumerico);

    if (index === -1) {
      throw new Error('Veículo não encontrado.');
    }

    if (veiculos.some((veiculo) => veiculo.placa === placa && veiculo.id !== idNumerico)) {
      throw new Error('Placa já cadastrada');
    }

    const atualizado = { id: idNumerico, modelo, placa, cor };
    veiculos[index] = atualizado;
    salvarVeiculosMockados(veiculos);

    return atualizado;
  }

  const token = obterToken();

  const response = await requisitar(
    `${VEICULOS_ENDPOINT}/${id}`,
    {
      method: 'PUT',
      headers: montarHeaders(token, true),
      body: JSON.stringify({ modelo, placa, cor }),
    },
    'Não foi possível atualizar o veículo.',
  );

  return response.json();
}

export async function deletarVeiculo(id) {
  if (usarVeiculosMockados()) {
    obterToken();

    const idNumerico = Number(id);
    const veiculos = carregarVeiculosMockados();
    const proximosVeiculos = veiculos.filter((veiculo) => veiculo.id !== idNumerico);

    if (proximosVeiculos.length === veiculos.length) {
      throw new Error('Veículo não encontrado.');
    }

    salvarVeiculosMockados(proximosVeiculos);
    return;
  }

  const token = obterToken();

  await requisitar(
    `${VEICULOS_ENDPOINT}/${id}`,
    { method: 'DELETE', headers: montarHeaders(token) },
    'Não foi possível remover o veículo.',
  );
}
