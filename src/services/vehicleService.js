const API_BASE_URL = import.meta.env?.VITE_API_URL ?? 'http://localhost:8080';
const VEICULOS_ENDPOINT = `${API_BASE_URL}/veiculos`;
const TOKENMOCKED = "123456"

function obterToken() {
  let sessionJSON = undefined;

  if (import.meta.env.VITE_ENABLE_MOCKS === 'true') {
    sessionJSON = JSON.stringify({ token: TOKENMOCKED });
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
  const token = obterToken();

  const response = await requisitar(
    VEICULOS_ENDPOINT,
    { method: 'GET', headers: montarHeaders(token) },
    'Não foi possível carregar os veículos.',
  );

  return response.json();
}

export async function obterVeiculo(id) {
  const token = obterToken();

  const response = await requisitar(
    `${VEICULOS_ENDPOINT}/${id}`,
    { method: 'GET', headers: montarHeaders(token) },
    'Não foi possível carregar o veículo.',
  );

  return response.json();
}

export async function criarVeiculo({ modelo, placa, cor }) {
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
  const token = obterToken();

  await requisitar(
    `${VEICULOS_ENDPOINT}/${id}`,
    { method: 'DELETE', headers: montarHeaders(token) },
    'Não foi possível remover o veículo.',
  );
}
