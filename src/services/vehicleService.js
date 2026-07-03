import { API_BASE_URL, shouldUseMocks } from './apiConfig.js';

const VEICULOS_ENDPOINT = `${API_BASE_URL}/veiculos`;
const TOKEN_MOCKADO = '123456';

const MOCK_VEHICLES_KEY = 'unicar.mock.veiculos';
const MOCK_VEHICLES_VERSION_KEY = 'unicar.mock.veiculos.version';
const MOCK_VEHICLES_VERSION = 'sem-exemplos-v1';
const VEICULOS_MOCKADOS = [];

function usarVeiculosMockados() {
  if (import.meta.env.MODE === 'test') {
    return import.meta.env.VITE_ENABLE_MOCKS === 'true';
  }

  return (
    shouldUseMocks()
  );
}

function carregarVeiculosMockados() {
  if (localStorage.getItem(MOCK_VEHICLES_VERSION_KEY) !== MOCK_VEHICLES_VERSION) {
    localStorage.setItem(MOCK_VEHICLES_KEY, JSON.stringify(VEICULOS_MOCKADOS));
    localStorage.setItem(MOCK_VEHICLES_VERSION_KEY, MOCK_VEHICLES_VERSION);
    return [];
  }

  const salvos = localStorage.getItem(MOCK_VEHICLES_KEY);

  if (!salvos) {
    localStorage.setItem(MOCK_VEHICLES_KEY, JSON.stringify(VEICULOS_MOCKADOS));
    return [];
  }

  try {
    return JSON.parse(salvos);
  } catch {
    localStorage.setItem(MOCK_VEHICLES_KEY, JSON.stringify(VEICULOS_MOCKADOS));
    return [];
  }
}

function salvarVeiculosMockados(veiculos) {
  localStorage.setItem(MOCK_VEHICLES_KEY, JSON.stringify(veiculos));
}

function obterToken() {
  let sessionJSON;

  if (usarVeiculosMockados()) {
    sessionJSON = JSON.stringify({ token: TOKEN_MOCKADO });
  } else {
    sessionJSON = localStorage.getItem('unicar.session');
  }

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

export async function listarVeiculos() {
  if (usarVeiculosMockados()) {
    obterToken();
    return carregarVeiculosMockados();
  }

  const dados = await requisitarApi(
    VEICULOS_ENDPOINT,
    { method: 'GET' },
    'Não foi possível carregar os veículos.',
  );

  if (Array.isArray(dados)) {
    return dados;
  }

  if (Array.isArray(dados?.content)) {
    return dados.content;
  }

  if (Array.isArray(dados?.veiculos)) {
    return dados.veiculos;
  }

  throw new Error('A resposta de veículos veio em um formato inesperado.');
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

  return requisitarApi(
    `${VEICULOS_ENDPOINT}/${id}`,
    { method: 'GET' },
    'Não foi possível carregar o veículo.',
  );
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

  return requisitarApi(
    VEICULOS_ENDPOINT,
    {
      method: 'POST',
      body: JSON.stringify({ modelo, placa, cor }),
      comCorpo: true,
    },
    'Não foi possível cadastrar o veículo.',
  );
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

  return requisitarApi(
    `${VEICULOS_ENDPOINT}/${id}`,
    {
      method: 'PUT',
      body: JSON.stringify({ modelo, placa, cor }),
      comCorpo: true,
    },
    'Não foi possível atualizar o veículo.',
  );
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

  await requisitarApi(
    `${VEICULOS_ENDPOINT}/${id}`,
    { method: 'DELETE' },
    'Não foi possível remover o veículo.',
  );
}

async function requisitarApi(url, opcoes, mensagemErroPadrao) {
  const token = obterToken();
  const { comCorpo = false, ...opcoesFetch } = opcoes;

  try {
    const resposta = await fetch(url, {
      ...opcoesFetch,
      headers: montarHeaders(token, comCorpo),
    });

    if (resposta.status === 204) {
      return undefined;
    }

    let dados = null;

    try {
      dados = await resposta.json();
    } catch {
      dados = null;
    }

    if (!resposta.ok) {
      throw new Error(
        dados?.message || mensagemErroPadrao,
      );
    }

    return dados;
  } catch (error) {
    if (/failed to fetch|networkerror|load failed/i.test(error?.message || '')) {
      throw new Error('Não foi possível conectar ao servidor. Tente novamente.', {
        cause: error,
      });
    }

    throw new Error(error.message || mensagemErroPadrao, {
      cause: error,
    });
  }
}
