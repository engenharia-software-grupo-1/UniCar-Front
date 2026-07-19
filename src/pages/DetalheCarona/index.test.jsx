import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

vi.mock('../../services/caronaService.js', () => ({
  listarPassageirosCarona: vi.fn(),
  obterCarona: vi.fn(),
  removerReservaCarona: vi.fn(),
}));

vi.mock('../../services/profileService.js', () => ({
  getPerfilUsuarioAutenticado: vi.fn(),
}));

vi.mock('../../services/publicProfileService.js', () => ({
  obterPerfilPublicoUsuario: vi.fn(),
}));

vi.mock('../../services/reservaService.js', () => ({
  aceitarReserva: vi.fn(),
  criarReserva: vi.fn(),
  listarReservasDaCarona: vi.fn().mockResolvedValue([]),
  listarReservasPendentesDaCarona: vi.fn().mockResolvedValue([]),
  recusarReserva: vi.fn(),
}));

vi.mock('../../services/geocodingService.js', () => ({
  geocodificarEndereco: vi.fn(),
}));

import DetalheCarona from './index.jsx';
import { listarPassageirosCarona, obterCarona, removerReservaCarona } from '../../services/caronaService.js';
import { getPerfilUsuarioAutenticado } from '../../services/profileService.js';
import { obterPerfilPublicoUsuario } from '../../services/publicProfileService.js';
import {
  aceitarReserva,
  criarReserva,
  listarReservasDaCarona,
  listarReservasPendentesDaCarona,
  recusarReserva,
} from '../../services/reservaService.js';
import { geocodificarEndereco } from '../../services/geocodingService.js';

const CARONA_BASE = {
  id: 10,
  status: 'CRIADA',
  dataHoraSaida: '2026-08-25T07:30:00',
  origem: 'Bodocongó',
  origemCoordenadas: { latitude: -7.2166, longitude: -35.9095 },
  destino: 'UFCG',
  pontoEncontro: 'Portão principal',
  observacao: '',
  valorContribuicao: 5,
  quantidadeVagas: 3,
  vagasDisponiveis: 2,
  motorista: { id: 1, nome: 'João Silva', curso: 'Engenharia', avaliacao: 4.8 },
  veiculo: { id: 1, modelo: 'Onix', cor: 'Prata', placa: 'ABC1D23' },
  passageiros: [],
};

function renderPagina({ state } = {}) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/minhas-caronas/10', state }]}>
      <Routes>
        <Route path="/minhas-caronas/:id" element={<DetalheCarona />} />
        <Route path="/minhas-caronas/:caronaId/chat/:usuarioId" element={<div>Chat do passageiro</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  // clearAllMocks zera o histórico mas NÃO as implementações; por isso os
  // defaults abaixo precisam ser reafirmados a cada teste para não vazar
  // mockResolvedValue/mockRejectedValue de um teste para o seguinte.
  vi.clearAllMocks();
  getPerfilUsuarioAutenticado.mockResolvedValue(null);
  obterPerfilPublicoUsuario.mockResolvedValue(null);
  listarReservasPendentesDaCarona.mockResolvedValue([]);
  listarReservasDaCarona.mockResolvedValue([]);
  listarPassageirosCarona.mockResolvedValue([]);
  aceitarReserva.mockResolvedValue({});
  recusarReserva.mockResolvedValue({});
  removerReservaCarona.mockResolvedValue(undefined);
});

describe('DetalheCarona — observações do motorista', () => {
  it('exibe o curso do motorista logo abaixo do nome', async () => {
    obterCarona.mockResolvedValue(CARONA_BASE);

    renderPagina();

    expect(await screen.findByText('Engenharia • UFCG')).toBeInTheDocument();
  });

  it('busca o curso no perfil público quando o detalhe da carona não o traz', async () => {
    obterCarona.mockResolvedValue({
      ...CARONA_BASE,
      motorista: { ...CARONA_BASE.motorista, curso: '' },
    });
    obterPerfilPublicoUsuario.mockResolvedValue({ curso: 'Sistemas de Informação' });

    renderPagina();

    expect(await screen.findByText('Sistemas de Informação • UFCG')).toBeInTheDocument();
    expect(obterPerfilPublicoUsuario).toHaveBeenCalledWith(1);
    expect(screen.queryByText(/Curso não informado/)).not.toBeInTheDocument();
  });

  it('mostra a observação quando a carona tem uma', async () => {
    obterCarona.mockResolvedValue({
      ...CARONA_BASE,
      observacao: 'Sem fumantes, aceito até 3 paradas.',
    });

    renderPagina();

    expect(await screen.findByText('Observações do motorista')).toBeInTheDocument();
    expect(
      screen.getByText('Sem fumantes, aceito até 3 paradas.'),
    ).toBeInTheDocument();
  });

  it('não exibe o bloco de observações quando o campo está vazio', async () => {
    obterCarona.mockResolvedValue({ ...CARONA_BASE, observacao: '' });

    renderPagina();

    // Espera a tela carregar por um campo que sempre existe.
    expect(await screen.findByText('Ponto de encontro')).toBeInTheDocument();
    expect(screen.queryByText('Observações do motorista')).not.toBeInTheDocument();
  });
});

describe('DetalheCarona — solicitação de participação', () => {
  // O passageiro informa o endereço de embarque na busca; ele chega no
  // location.state e é geocodificado aqui para as coordenadas que o back exige.
  const ENDERECO_EMBARQUE = 'Rua Aprígio Veloso, Bodocongó';
  const EMBARQUE_GEO = { descricao: 'Bodocongó', latitude: -7.2166, longitude: -35.9095 };

  it('geocodifica o endereço de embarque, confirma a reserva e atualiza a ação da tela', async () => {
    obterCarona.mockResolvedValue(CARONA_BASE);
    geocodificarEndereco.mockResolvedValue(EMBARQUE_GEO);
    criarReserva.mockResolvedValue({ id: 50, status: 'PENDENTE' });

    renderPagina({ state: { enderecoEmbarque: ENDERECO_EMBARQUE } });

    await userEvent.click(await screen.findByRole('button', { name: 'Solicitar Participação' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar solicitação' }));

    expect(geocodificarEndereco).toHaveBeenCalledWith(ENDERECO_EMBARQUE);
    expect(criarReserva).toHaveBeenCalledWith(10, 1, EMBARQUE_GEO);
    expect(await screen.findByText('Solicitação de participação enviada com sucesso.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Solicitação enviada' })).toBeDisabled();
  });

  it('bloqueia a solicitação quando não há endereço de embarque no state', async () => {
    obterCarona.mockResolvedValue(CARONA_BASE);

    renderPagina();

    await userEvent.click(await screen.findByRole('button', { name: 'Solicitar Participação' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar solicitação' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Informe seu endereço de embarque na busca antes de solicitar.',
    );
    expect(criarReserva).not.toHaveBeenCalled();
  });

  it('mostra dentro do modal o erro ao enviar', async () => {
    obterCarona.mockResolvedValue(CARONA_BASE);
    geocodificarEndereco.mockResolvedValue(EMBARQUE_GEO);
    criarReserva.mockRejectedValue(new Error('Não foi possível concluir a reserva.'));

    renderPagina({ state: { enderecoEmbarque: ENDERECO_EMBARQUE } });

    await userEvent.click(await screen.findByRole('button', { name: 'Solicitar Participação' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar solicitação' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível concluir a reserva.');
    expect(screen.getByRole('heading', { name: 'Confirmar solicitação' })).toBeInTheDocument();
  });
});

describe('DetalheCarona — carregamento e erro', () => {
  it('mostra o estado de carregando antes de a carona resolver e busca pelo id da rota', async () => {
    let resolver;
    obterCarona.mockReturnValue(
      new Promise((resolve) => {
        resolver = resolve;
      }),
    );

    renderPagina();

    expect(screen.getByText('Carregando detalhes da carona...')).toBeInTheDocument();
    expect(obterCarona).toHaveBeenCalledWith('10');

    resolver(CARONA_BASE);
    await waitFor(() =>
      expect(screen.queryByText('Carregando detalhes da carona...')).not.toBeInTheDocument(),
    );
  });

  it('mostra a tela de erro quando obterCarona rejeita e não há carona no state', async () => {
    obterCarona.mockRejectedValue(new Error('Carona não encontrada.'));

    renderPagina();

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('Carona não encontrada.');
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
  });

  it('usa mensagem genérica quando o erro não traz mensagem e não há state', async () => {
    obterCarona.mockRejectedValue(new Error());

    renderPagina();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar os detalhes da carona.',
    );
  });

  it('"Tentar novamente" refaz a busca e sai do estado de erro', async () => {
    obterCarona.mockRejectedValueOnce(new Error('Falha temporária.'));

    renderPagina();

    await screen.findByRole('alert');

    obterCarona.mockResolvedValue(CARONA_BASE);
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByText('Ponto de encontro')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('usa a carona do location.state como fallback quando o serviço rejeita', async () => {
    obterCarona.mockRejectedValue(new Error('backend fora do ar'));

    renderPagina({ state: { carona: { ...CARONA_BASE, origem: 'Malvinas' } } });

    // Sem tela de erro: caiu no fallback do state.
    expect(await screen.findByText('Malvinas')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    // prepararCaronaFallback completa dados de veículo ausentes.
    expect(screen.getByText('Ponto de encontro')).toBeInTheDocument();
  });
});

describe('DetalheCarona — detecção de "minha carona"', () => {
  it('reconhece a carona como minha por location.state.minhaCarona e carrega solicitações', async () => {
    obterCarona.mockResolvedValue(CARONA_BASE);

    renderPagina({ state: { minhaCarona: true } });

    expect(
      await screen.findByRole('heading', { name: 'Você (motorista)' }),
    ).toBeInTheDocument();
    // O card de solicitar participação não aparece para o próprio motorista.
    expect(
      screen.queryByRole('button', { name: 'Solicitar Participação' }),
    ).not.toBeInTheDocument();
    await waitFor(() =>
      expect(listarReservasPendentesDaCarona).toHaveBeenCalledWith('10'),
    );
  });

  it('reconhece a carona como minha quando o id do perfil bate com o do motorista', async () => {
    obterCarona.mockResolvedValue(CARONA_BASE);
    getPerfilUsuarioAutenticado.mockResolvedValue({
      id: 1,
      nomeCompleto: 'João Silva',
      curso: 'Engenharia',
      avaliacao: 4.8,
    });

    renderPagina();

    expect(
      await screen.findByRole('heading', { name: 'Você (motorista)' }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(listarReservasPendentesDaCarona).toHaveBeenCalledWith('10'),
    );
  });

  it('não carrega solicitações pendentes quando não é minha carona', async () => {
    obterCarona.mockResolvedValue(CARONA_BASE);

    renderPagina();

    // Mostra o card de solicitação, prova de que não é minha carona.
    expect(
      await screen.findByRole('button', { name: 'Solicitar Participação' }),
    ).toBeInTheDocument();
    expect(listarReservasPendentesDaCarona).not.toHaveBeenCalled();
  });
});

describe('DetalheCarona — validação da quantidade de passageiros', () => {
  async function abrirComQuantidade(valor) {
    obterCarona.mockResolvedValue(CARONA_BASE);
    renderPagina();

    const input = await screen.findByLabelText('Quantidade de passageiros');
    await userEvent.clear(input);
    if (valor !== '') {
      await userEvent.type(input, valor);
    }
    await userEvent.click(screen.getByRole('button', { name: 'Solicitar Participação' }));
    return input;
  }

  it('exige que a quantidade seja informada quando o campo está vazio', async () => {
    await abrirComQuantidade('');

    expect(screen.getByText('Informe a quantidade de passageiros.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('recusa quantidade menor ou igual a zero', async () => {
    await abrirComQuantidade('0');

    expect(screen.getByText('A quantidade deve ser maior que zero.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('recusa quantidade não inteira', async () => {
    await abrirComQuantidade('1.5');

    expect(screen.getByText('A quantidade deve ser maior que zero.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('recusa quantidade acima das vagas disponíveis com mensagem específica', async () => {
    // CARONA_BASE tem vagasDisponiveis = 2.
    await abrirComQuantidade('3');

    expect(
      screen.getByText('A quantidade não pode ultrapassar 2 vaga(s).'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('DetalheCarona — sem vagas disponíveis', () => {
  it('desabilita a ação e rotula "Sem vagas disponíveis"', async () => {
    obterCarona.mockResolvedValue({ ...CARONA_BASE, vagasDisponiveis: 0 });

    renderPagina();

    const botao = await screen.findByRole('button', { name: 'Sem vagas disponíveis' });
    expect(botao).toBeDisabled();
  });
});

describe('DetalheCarona — responder solicitações (motorista)', () => {
  const CARONA_MINHA = {
    ...CARONA_BASE,
    quantidadeVagas: 3,
    vagasDisponiveis: 2,
    passageiros: [],
  };

  const SOLICITACAO = {
    id: 501,
    solicitante: { nome: 'Maria Souza' },
    quantidadePassageiros: 1,
    dataSolicitacao: '2026-08-01T10:00:00',
  };

  async function abrirAbaPassageiros() {
    await screen.findByRole('heading', { name: 'Você (motorista)' });
    await userEvent.click(screen.getByRole('button', { name: 'Passageiros' }));
    return screen.findByText('Maria Souza');
  }

  it('aceita a solicitação, recarrega os passageiros confirmados e mostra o novo passageiro', async () => {
    obterCarona.mockResolvedValue(CARONA_MINHA);
    listarReservasPendentesDaCarona.mockResolvedValue([SOLICITACAO]);
    listarPassageirosCarona
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{
        id: 71,
        reservaId: 501,
        nome: 'Maria Souza',
        curso: 'Engenharia',
        avaliacao: 4.8,
        status: 'Confirmado',
      }]);

    renderPagina({ state: { minhaCarona: true } });

    // Antes de aceitar: 2 de 3 disponíveis.
    expect(await screen.findByText('2 de 3 disponíveis')).toBeInTheDocument();

    await abrirAbaPassageiros();
    await userEvent.click(screen.getByRole('button', { name: /aceitar/i }));

    await waitFor(() => expect(aceitarReserva).toHaveBeenCalledWith(501));
    expect(
      await screen.findByText('Reserva de Maria Souza aceita com sucesso.'),
    ).toBeInTheDocument();
    expect(listarPassageirosCarona).toHaveBeenCalledTimes(2);
    expect(await screen.findByText('Confirmado')).toBeInTheDocument();
    // Vaga decrementada em 1: passa a 1 de 3.
    expect(screen.getByText('1 de 3 disponíveis')).toBeInTheDocument();
    expect(recusarReserva).not.toHaveBeenCalled();
  });

  it('mostra o endereço de embarque de cada passageiro (confirmado e pendente)', async () => {
    obterCarona.mockResolvedValue(CARONA_MINHA);
    listarReservasPendentesDaCarona.mockResolvedValue([
      { ...SOLICITACAO, origemEmbarque: 'Rua do Cajá, 100' },
    ]);
    // O confirmado NÃO traz embarque (o PassageiroResponseDTO do backend em
    // produção ainda não expõe o campo) — ele é enriquecido por reservaId a
    // partir de /reservas/recebidas.
    listarPassageirosCarona.mockResolvedValue([{
      id: 71,
      reservaId: 777,
      nome: 'Carlos Lima',
      curso: 'Física',
      status: 'Confirmado',
    }]);
    listarReservasDaCarona.mockResolvedValue([
      { id: 777, status: 'ACEITA', origemEmbarque: 'Av. Central, 500' },
    ]);

    renderPagina({ state: { minhaCarona: true } });

    await screen.findByRole('heading', { name: 'Você (motorista)' });
    await userEvent.click(screen.getByRole('button', { name: 'Passageiros' }));

    // O motorista vê onde buscar cada passageiro.
    expect(await screen.findByText('Av. Central, 500')).toBeInTheDocument();
    expect(await screen.findByText('Rua do Cajá, 100')).toBeInTheDocument();
  });

  it('mostra "Embarque não informado" quando o passageiro não tem endereço', async () => {
    obterCarona.mockResolvedValue(CARONA_MINHA);
    listarReservasPendentesDaCarona.mockResolvedValue([]);
    listarPassageirosCarona.mockResolvedValue([{
      id: 72,
      reservaId: 778,
      nome: 'Sem Endereço',
      status: 'Confirmado',
      embarque: '',
    }]);

    renderPagina({ state: { minhaCarona: true } });

    await screen.findByRole('heading', { name: 'Você (motorista)' });
    await userEvent.click(screen.getByRole('button', { name: 'Passageiros' }));

    expect(await screen.findByText('Embarque não informado')).toBeInTheDocument();
  });

  it('recusa a solicitação: chama recusarReserva, remove da lista e não altera as vagas', async () => {
    obterCarona.mockResolvedValue(CARONA_MINHA);
    listarReservasPendentesDaCarona.mockResolvedValue([SOLICITACAO]);

    renderPagina({ state: { minhaCarona: true } });

    expect(await screen.findByText('2 de 3 disponíveis')).toBeInTheDocument();

    await abrirAbaPassageiros();
    await userEvent.click(screen.getByRole('button', { name: /recusar/i }));

    await waitFor(() => expect(recusarReserva).toHaveBeenCalledWith(501));
    expect(
      await screen.findByText('Reserva de Maria Souza recusada com sucesso.'),
    ).toBeInTheDocument();
    // Vaga inalterada.
    expect(screen.getByText('2 de 3 disponíveis')).toBeInTheDocument();
    // Some da lista de pendentes.
    expect(screen.getByText('Não há solicitações pendentes.')).toBeInTheDocument();
    expect(aceitarReserva).not.toHaveBeenCalled();
  });

  it('mostra a tela de erro quando responder a solicitação falha', async () => {
    obterCarona.mockResolvedValue(CARONA_MINHA);
    listarReservasPendentesDaCarona.mockResolvedValue([SOLICITACAO]);
    aceitarReserva.mockRejectedValue(new Error('Reserva já processada.'));

    renderPagina({ state: { minhaCarona: true } });

    await abrirAbaPassageiros();
    await userEvent.click(screen.getByRole('button', { name: /aceitar/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Reserva já processada.');
  });

  it('exibe o erro ao carregar as solicitações pendentes na aba de passageiros', async () => {
    obterCarona.mockResolvedValue(CARONA_MINHA);
    listarReservasPendentesDaCarona.mockRejectedValue(
      new Error('Não foi possível carregar as solicitações.'),
    );

    renderPagina({ state: { minhaCarona: true } });

    await screen.findByRole('heading', { name: 'Você (motorista)' });
    await userEvent.click(screen.getByRole('button', { name: 'Passageiros' }));

    expect(
      await screen.findByText('Não foi possível carregar as solicitações.'),
    ).toBeInTheDocument();
  });
});

describe('DetalheCarona — remover reserva de passageiro confirmado (motorista)', () => {
  function caronaComConfirmado({ vagasDisponiveis, quantidadeVagas }) {
    return {
      ...CARONA_BASE,
      quantidadeVagas,
      vagasDisponiveis,
      passageiros: [
        {
          id: 'carlos',
          reservaId: 701,
          nome: 'Carlos Lima',
          curso: 'Física',
          avaliacao: 4.5,
          status: 'CONFIRMADO',
        },
      ],
    };
  }

  it('mostra passageiros confirmados mesmo sem solicitações pendentes', async () => {
    obterCarona.mockResolvedValue({
      ...caronaComConfirmado({ vagasDisponiveis: 2, quantidadeVagas: 3 }),
      passageiros: [],
    });
    listarReservasPendentesDaCarona.mockResolvedValue([]);
    listarPassageirosCarona.mockResolvedValue([
      { id: 'carlos', reservaId: 701, nome: 'Carlos Lima', curso: 'Física', status: 'Confirmado' },
    ]);

    renderPagina({ state: { minhaCarona: true } });

    await screen.findByRole('heading', { name: 'Você (motorista)' });
    await userEvent.click(screen.getByRole('button', { name: 'Passageiros' }));

    expect(await screen.findByText('Não há solicitações pendentes.')).toBeInTheDocument();
    expect(screen.getByText('Carlos Lima')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Conversar com Carlos Lima' })).toBeInTheDocument();
  });

  it('exibe o balão de chat no passageiro e abre a página da conversa', async () => {
    obterCarona.mockResolvedValue(
      caronaComConfirmado({ vagasDisponiveis: 2, quantidadeVagas: 3 }),
    );

    renderPagina({ state: { minhaCarona: true } });

    await screen.findByRole('heading', { name: 'Você (motorista)' });
    await userEvent.click(screen.getByRole('button', { name: 'Passageiros' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Conversar com Carlos Lima' }));

    expect(screen.getByText('Chat do passageiro')).toBeInTheDocument();
  });

  it('reincrementa a vaga ao remover um passageiro confirmado', async () => {
    obterCarona.mockResolvedValue(
      caronaComConfirmado({ vagasDisponiveis: 2, quantidadeVagas: 3 }),
    );

    renderPagina({ state: { minhaCarona: true } });

    await screen.findByRole('heading', { name: 'Você (motorista)' });
    expect(screen.getByText('2 de 3 disponíveis')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Passageiros' }));
    await userEvent.click(await screen.findByRole('button', { name: /remover reserva/i }));

    const dialog = screen.getByRole('dialog');
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Remover Reserva' }),
    );

    await waitFor(() => expect(removerReservaCarona).toHaveBeenCalledWith(10, 701));
    expect(
      await screen.findByText('Reserva de Carlos Lima removida com sucesso.'),
    ).toBeInTheDocument();
    // Vaga reincrementada: 2 -> 3.
    expect(screen.getByText('3 de 3 disponíveis')).toBeInTheDocument();
  });

  it('respeita o teto de vagas ao reincrementar (não ultrapassa quantidadeVagas)', async () => {
    obterCarona.mockResolvedValue(
      caronaComConfirmado({ vagasDisponiveis: 3, quantidadeVagas: 3 }),
    );

    renderPagina({ state: { minhaCarona: true } });

    await screen.findByRole('heading', { name: 'Você (motorista)' });
    expect(screen.getByText('3 de 3 disponíveis')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Passageiros' }));
    await userEvent.click(await screen.findByRole('button', { name: /remover reserva/i }));

    const dialog = screen.getByRole('dialog');
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Remover Reserva' }),
    );

    await waitFor(() => expect(removerReservaCarona).toHaveBeenCalledWith(10, 701));
    // Continua em 3 de 3: o teto impede chegar a 4.
    expect(await screen.findByText('3 de 3 disponíveis')).toBeInTheDocument();
  });

  it('exibe erro no feedback quando a remoção falha', async () => {
    obterCarona.mockResolvedValue(
      caronaComConfirmado({ vagasDisponiveis: 2, quantidadeVagas: 3 }),
    );
    removerReservaCarona.mockRejectedValue(
      new Error('Usuário não é o dono desta reserva'),
    );

    renderPagina({ state: { minhaCarona: true } });

    await screen.findByRole('heading', { name: 'Você (motorista)' });
    await userEvent.click(screen.getByRole('button', { name: 'Passageiros' }));
    await userEvent.click(await screen.findByRole('button', { name: /remover reserva/i }));

    const dialog = screen.getByRole('dialog');
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Remover Reserva' }),
    );

    expect(
      await screen.findByText('Usuário não é o dono desta reserva'),
    ).toBeInTheDocument();
  });
});
