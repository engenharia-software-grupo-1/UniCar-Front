const VEHICLES_STORAGE_KEY = 'unicar.vehicles';

function lerVeiculos() {
  const veiculosJSON = localStorage.getItem(VEHICLES_STORAGE_KEY);

  if (!veiculosJSON) {
    return [];
  }

  try {
    const veiculos = JSON.parse(veiculosJSON);

    return Array.isArray(veiculos) ? veiculos : [];
  } catch {
    return [];
  }
}

function salvarVeiculos(veiculos) {
  localStorage.setItem(VEHICLES_STORAGE_KEY, JSON.stringify(veiculos));
}

function exigirSessao() {
  const session = localStorage.getItem('unicar.session');

  if (!session) {
    throw new Error('Usuário não autenticado.');
  }
}

function gerarId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `veiculo-${Date.now()}`;
}

export async function listarVeiculos() {
  await new Promise((resolve) => setTimeout(resolve, 1000));

  exigirSessao();

  return lerVeiculos();
}

export async function criarVeiculo({ modelo, placa, cor }) {
  await new Promise((resolve) => setTimeout(resolve, 1000));

  exigirSessao();

  const veiculos = lerVeiculos();

  const novoVeiculo = {
    id: gerarId(),
    modelo,
    placa,
    cor,
    criadoEm: new Date().toISOString(),
  };

  veiculos.push(novoVeiculo);
  salvarVeiculos(veiculos);

  return novoVeiculo;
}

export async function atualizarVeiculo(id, { modelo, placa, cor }) {
  await new Promise((resolve) => setTimeout(resolve, 1000));

  exigirSessao();

  const veiculos = lerVeiculos();
  const index = veiculos.findIndex((veiculo) => veiculo.id === id);

  if (index === -1) {
    throw new Error('Veículo não encontrado.');
  }

  veiculos[index] = {
    ...veiculos[index],
    modelo,
    placa,
    cor,
    atualizadoEm: new Date().toISOString(),
  };

  salvarVeiculos(veiculos);

  return veiculos[index];
}

export async function deletarVeiculo(id) {
  await new Promise((resolve) => setTimeout(resolve, 1000));

  exigirSessao();

  const veiculos = lerVeiculos();
  const filtrados = veiculos.filter((veiculo) => veiculo.id !== id);

  if (filtrados.length === veiculos.length) {
    throw new Error('Veículo não encontrado.');
  }

  salvarVeiculos(filtrados);
}
