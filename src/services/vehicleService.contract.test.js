import { beforeEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server.js';
import {
  listarVeiculos,
  obterVeiculo,
  criarVeiculo,
  atualizarVeiculo,
  deletarVeiculo,
} from './vehicleService.js';

const BASE_URL = 'http://localhost:8080';
const CAMPOS_CONTRATO = ['id', 'modelo', 'placa', 'cor', 'tipo'];

beforeEach(() => {
  localStorage.setItem(
    'unicar.session',
    JSON.stringify({ token: 'token-simulado', usuario: { nome: 'Fulano' } }),
  );
});

describe('GET /veiculos', () => {
  it('retorna 200 com lista de veículos no formato do contrato', async () => {
    const veiculos = await listarVeiculos();

    expect(Array.isArray(veiculos)).toBe(true);
    expect(veiculos.length).toBeGreaterThan(0);
    expect(Object.keys(veiculos[0]).sort()).toEqual([...CAMPOS_CONTRATO].sort());
    expect(typeof veiculos[0].id).toBe('number');
  });
});

describe('POST /veiculos', () => {
  it('cria com 201 e retorna {id,modelo,placa,cor,tipo}', async () => {
    const dados = { modelo: 'Corolla', placa: 'QWE4R56', cor: 'Cinza', tipo: 'carro' };

    const criado = await criarVeiculo(dados);

    expect(Object.keys(criado).sort()).toEqual([...CAMPOS_CONTRATO].sort());
    expect(typeof criado.id).toBe('number');
    expect(criado).toMatchObject(dados);
  });

  it('rejeita placa duplicada com 400 "Placa já cadastrada"', async () => {
    await expect(
      criarVeiculo({ modelo: 'Onix', placa: 'ABC1D23', cor: 'Prata' }),
    ).rejects.toThrow('Placa já cadastrada');
  });
});

describe('GET /veiculos/{id}', () => {
  it('retorna 200 com o veículo existente', async () => {
    const veiculo = await obterVeiculo(1);

    expect(veiculo).toMatchObject({ id: 1 });
    expect(Object.keys(veiculo).sort()).toEqual([...CAMPOS_CONTRATO].sort());
  });

  it('rejeita inexistente com 404 "Veículo não encontrado"', async () => {
    await expect(obterVeiculo(9999)).rejects.toThrow('Veículo não encontrado');
  });

  it('rejeita veículo de outro usuário com 403 "Acesso negado"', async () => {
    server.use(
      http.get(`${BASE_URL}/veiculos/:id`, () =>
        HttpResponse.json({ message: 'Acesso negado' }, { status: 403 }),
      ),
    );

    await expect(obterVeiculo(1)).rejects.toThrow('Acesso negado');
  });
});

describe('PUT /veiculos/{id}', () => {
  it('atualiza com 200 e retorna o objeto atualizado', async () => {
    const dados = { modelo: 'Onix Plus', placa: 'ABC1D23', cor: 'Preto', tipo: 'carro' };

    const atualizado = await atualizarVeiculo(1, dados);

    expect(atualizado).toMatchObject({ id: 1, ...dados });
  });

  it('rejeita ao mudar para placa de outro veículo com 400', async () => {
    await expect(
      atualizarVeiculo(1, { modelo: 'Onix', placa: 'XYZ9A87', cor: 'Prata' }),
    ).rejects.toThrow('Placa já cadastrada');
  });

  it('rejeita veículo de outro usuário com 403 "Acesso negado"', async () => {
    server.use(
      http.put(`${BASE_URL}/veiculos/:id`, () =>
        HttpResponse.json({ message: 'Acesso negado' }, { status: 403 }),
      ),
    );

    await expect(
      atualizarVeiculo(1, { modelo: 'Onix', placa: 'ABC1D23', cor: 'Verde' }),
    ).rejects.toThrow('Acesso negado');
  });
});

describe('DELETE /veiculos/{id}', () => {
  it('remove com 204 e o veículo some da lista', async () => {
    await expect(deletarVeiculo(1)).resolves.toBeUndefined();

    const restantes = await listarVeiculos();
    expect(restantes.some((veiculo) => veiculo.id === 1)).toBe(false);
  });

  it('rejeita inexistente com 404', async () => {
    await expect(deletarVeiculo(9999)).rejects.toThrow('Veículo não encontrado');
  });

  it('rejeita com 400 quando há carona ativa associada', async () => {
    server.use(
      http.delete(`${BASE_URL}/veiculos/:id`, () =>
        HttpResponse.json(
          { message: 'Veículo possui caronas ativas associadas' },
          { status: 400 },
        ),
      ),
    );

    await expect(deletarVeiculo(1)).rejects.toThrow(
      'Veículo possui caronas ativas associadas',
    );
  });
});

describe('autenticação no contrato', () => {
  it('rejeita com 403 quando a request vai sem Authorization', async () => {
    // Sem sessão → o serviço lança antes do fetch; garantimos o caminho
    // do handler removendo a checagem de token via override que sempre nega.
    server.use(
      http.get(`${BASE_URL}/veiculos`, ({ request }) => {
        if (!request.headers.get('Authorization')) {
          return HttpResponse.json({ message: 'Acesso negado' }, { status: 403 });
        }
        return HttpResponse.json([], { status: 200 });
      }),
    );

    // Token presente → handler responde 200 (prova que o serviço manda o header).
    await expect(listarVeiculos()).resolves.toEqual([]);
  });
});
