import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, Pencil, Play, X, Square} from 'lucide-react';
import Confirmacao from '../../components/common/Confirmacao.jsx';
import { cancelarCarona, iniciarCarona, finalizarCarona, listarMinhasCaronas } from '../../services/caronaService.js';
import './style.css';

const STATUS = {
  CRIADA: { rotulo: 'Aguardando', classe: 'aguardando' },
  EM_ANDAMENTO: { rotulo: 'Em andamento', classe: 'andamento' },
  FINALIZADA: { rotulo: 'Finalizada', classe: 'finalizada' },
  CANCELADA: { rotulo: 'Cancelada', classe: 'cancelada' },
};

// Apenas caronas ativas aparecem em "Minhas caronas"; canceladas, finalizadas e
// expiradas vão para o histórico (fora do escopo por ora).
const STATUS_VISIVEIS = ['CRIADA', 'EM_ANDAMENTO'];

// Tolerância aplicada a caronas CRIADA: elas permanecem na lista por até 30 min
// após o horário agendado, para o motorista ainda conseguir iniciá-las.
const TOLERANCIA_CRIADA_MS = 30 * 60 * 1000;

function tempoSaida(carona) {
  const saida = new Date(carona.dataHoraSaida).getTime();

  return Number.isNaN(saida) ? Infinity : saida;
}

// Filtra as caronas exibíveis e ordena pela data/hora de saída (mais cedo
// primeiro). Uma CRIADA some depois de 30 min do horário; EM_ANDAMENTO sempre
// aparece (independe do horário).
function caronasVisiveis(caronas, agora = Date.now()) {
  return caronas
    .filter((carona) => {
      if (!STATUS_VISIVEIS.includes(carona.status)) {
        return false;
      }

      if (carona.status === 'CRIADA') {
        const saida = new Date(carona.dataHoraSaida).getTime();

        if (!Number.isNaN(saida)) {
          return agora <= saida + TOLERANCIA_CRIADA_MS;
        }
      }

      return true;
    })
    .sort((a, b) => tempoSaida(a) - tempoSaida(b));
}

function MinhasCaronas() {
  const location = useLocation();
  const [aba, setAba] = useState('motorista');
  const [caronas, setCaronas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [caronaParaCancelar, setCaronaParaCancelar] = useState(null);
  const [cancelando, setCancelando] = useState(false);
  const [caronaParaIniciar, setCaronaParaIniciar] = useState(null);
  const [iniciando, setIniciando] = useState(false);
  const [caronaParaFinalizar, setCaronaParaFinalizar] = useState(null);
  const [finalizando, setFinalizando] = useState(false);
  // Feedback vindo de outra tela (ex.: publicação de carona na página "Ofertar
  // carona"), lido do state de navegação já no primeiro render.
  const [mensagemSucesso, setMensagemSucesso] = useState(
    location.state?.mensagem || '',
  );

  // Limpa o state do histórico para a mensagem não reaparecer ao recarregar ou
  // navegar de volta.
  useEffect(() => {
    if (location.state?.mensagem) {
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  async function carregar() {
    try {
      setCarregando(true);
      setErro('');

      const dados = await listarMinhasCaronas();

      setCaronas(dados);
    } catch (error) {
      setErro(error.message || 'Não foi possível carregar suas caronas.');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    let ativo = true;

    async function carregarInicial() {
      try {
        const dados = await listarMinhasCaronas();

        if (!ativo) {
          return;
        }

        setCaronas(dados);
        setErro('');
      } catch (error) {
        if (ativo) {
          setErro(error.message || 'Não foi possível carregar suas caronas.');
        }
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    }

    carregarInicial();

    return () => {
      ativo = false;
    };
  }, []);

  // A mensagem de sucesso é temporária: some sozinha após alguns segundos.
  useEffect(() => {
    if (!mensagemSucesso) {
      return undefined;
    }

    const temporizador = setTimeout(() => setMensagemSucesso(''), 4000);

    return () => clearTimeout(temporizador);
  }, [mensagemSucesso]);

  function iniciarCancelamento(carona) {
    setMensagemSucesso('');
    setCaronaParaCancelar(carona);
  }

  function confirmaIniciarCarona(carona) {
    setMensagemSucesso('');
    setCaronaParaIniciar(carona);
  }

  function confirmaFinalizarCarona(carona) {
    setMensagemSucesso('');
    setCaronaParaFinalizar(carona);
  }

  async function confirmarCancelamento() {
    if (!caronaParaCancelar) {
      return;
    }

    const { id } = caronaParaCancelar;

    try {
      setCancelando(true);
      setErro('');

      const atualizada = await cancelarCarona(id);
      const novoStatus = atualizada?.status || 'CANCELADA';

      setCaronas((prev) =>
        prev.map((carona) =>
          carona.id === id ? { ...carona, status: novoStatus } : carona,
        ),
      );
      setMensagemSucesso('Carona cancelada com sucesso.');
      setCaronaParaCancelar(null);
    } catch (error) {
      setErro(error.message || 'Não foi possível cancelar a carona.');
      setCaronaParaCancelar(null);
    } finally {
      setCancelando(false);
    }
  }

  async function confirmarInicio() {
    if (!caronaParaIniciar) {
        return;
    }

    try {
        setIniciando(true);
        setErro('');

        const atualizada = await iniciarCarona(caronaParaIniciar.id);

        setCaronas((prev) =>
            prev.map((carona) =>
                carona.id === caronaParaIniciar.id
                    ? {
                          ...carona,
                          status: atualizada.status,
                      }
                    : carona,
            ),
        );

        setMensagemSucesso('Carona iniciada com sucesso.');

        setCaronaParaIniciar(null);
    } catch (error) {
        setErro(error.message || 'Não foi possível iniciar a carona.');
    } finally {
        setIniciando(false);
    }
  }

  // TODO (para quando o Histórico for implementado)
  // Após a implementação da tela de Histórico, redirecionar o motorista
  // para avaliar os passageiros.
  async function confirmarFinalizacao() {
    if (!caronaParaFinalizar) return;

    try {
        setFinalizando(true);
        setErro('');

        const atualizada = await finalizarCarona(caronaParaFinalizar.id);

        setCaronas(prev =>
            prev.map(carona =>
                carona.id === caronaParaFinalizar.id
                    ? { ...carona, status: atualizada.status }
                    : carona
            )
        );

        setMensagemSucesso('Carona finalizada com sucesso. Para fazer suas avaliações, siga para Histórico de Caronas.');

        setCaronaParaFinalizar(null);
    } catch (error) {
        setErro(error.message || 'Não foi possível finalizar a carona.');
    } finally {
        setFinalizando(false);
    }
  }

  return (
    <main className="caronas-page">
      <section className="caronas-shell">
        <h1 className="caronas-title">Minhas caronas</h1>

        <div className="caronas-tabs" role="tablist" aria-label="Tipo de carona">
          <button
            type="button"
            role="tab"
            aria-selected={aba === 'motorista'}
            className={`caronas-tab ${aba === 'motorista' ? 'is-active' : ''}`}
            onClick={() => setAba('motorista')}
          >
            Como Motorista
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={aba === 'passageiro'}
            className={`caronas-tab ${aba === 'passageiro' ? 'is-active' : ''}`}
            onClick={() => setAba('passageiro')}
          >
            Como Passageiro
          </button>
        </div>

        {aba === 'motorista' && mensagemSucesso && (
          <p className="caronas-sucesso" role="status">
            {mensagemSucesso}
          </p>
        )}

        {aba === 'motorista' ? (
          <ConteudoMotorista
            carregando={carregando}
            erro={erro}
            caronas={caronasVisiveis(caronas)}
            onTentarNovamente={carregar}
            onCancelar={iniciarCancelamento}
            onIniciar={confirmaIniciarCarona}
            onFinalizar={confirmaFinalizarCarona}
          />
        ) : (
          <div className="caronas-vazio">
            <p>Nenhuma carona como passageiro por aqui ainda.</p>
            <span>Em breve você verá as caronas que reservou.</span>
          </div>
        )}
      </section>

      <Confirmacao
        open={Boolean(caronaParaCancelar)}
        danger
        title="Cancelar carona"
        message={
          caronaParaCancelar
            ? `Deseja mesmo cancelar a carona ${caronaParaCancelar.origem} → ${caronaParaCancelar.destino}? Esta ação não pode ser desfeita.`
            : ''
        }
        confirmLabel="Cancelar carona"
        cancelLabel="Voltar"
        loadingLabel="Cancelando..."
        loading={cancelando}
        onConfirm={confirmarCancelamento}
        onCancel={() => setCaronaParaCancelar(null)}
      />

      <Confirmacao
        open={Boolean(caronaParaIniciar)}
        title="Iniciar carona"
        message={
          caronaParaIniciar
            ? `<strong>Deseja confirmar o início da viagem de ${caronaParaIniciar.origem} para ${caronaParaIniciar.destino}?</strong>
              Os passageiros serão notificados e o status será atualizado para "Em andamento".`
            : ''
        }
        confirmLabel="Confirmar início"
        cancelLabel="Cancelar"
        loadingLabel="Iniciando..."
        loading={iniciando}
        onConfirm={confirmarInicio}
        onCancel={() => setCaronaParaIniciar(null)}
      />

      <Confirmacao
        open={Boolean(caronaParaFinalizar)}
        title="Finalizar carona"
        message={
          caronaParaFinalizar
            ? `<strong>Deseja confirmar o fim da viagem de ${caronaParaFinalizar.origem} para ${caronaParaFinalizar.destino}?</strong>
              Após finalizar, será possível realizar as avaliações.`
            : ''
        }
        confirmLabel="Finalizar carona"
        cancelLabel="Cancelar"
        loadingLabel="Finalizando..."
        loading={finalizando}
        onConfirm={confirmarFinalizacao}
        onCancel={() => setCaronaParaFinalizar(null)}
      />
    </main>
  );
}

function ConteudoMotorista({ carregando, erro, caronas, onTentarNovamente, onCancelar, onIniciar, onFinalizar }) {
  if (carregando) {
    return <p className="caronas-loading">Carregando suas caronas...</p>;
  }

  if (erro) {
    return (
      <div className="caronas-erro" role="alert">
        <p>{erro}</p>
        <button type="button" onClick={onTentarNovamente}>
          Tentar novamente
        </button>
      </div>
    );
  }

  if (caronas.length === 0) {
    return (
      <div className="caronas-vazio">
        <p>Você ainda não criou nenhuma carona.</p>
        <span>As caronas que você oferecer aparecerão aqui.</span>
      </div>
    );
  }

  return (
    <ul className="caronas-lista">
      {caronas.map((carona) => (
        <li key={carona.id}>
          <CaronaCard carona={carona} onCancelar={onCancelar} onIniciar={onIniciar} onFinalizar={onFinalizar} />
        </li>
      ))}
    </ul>
  );
}

function CaronaCard({ carona, onCancelar, onIniciar, onFinalizar }) {
  const status = STATUS[carona.status] || {
    rotulo: carona.status || 'Carona',
    classe: 'aguardando',
  };

  const mostrarPassageiros =
    carona.passageirosConfirmados !== null && carona.quantidadeVagas !== null;

  const podeCancelar = carona.status === 'CRIADA';
  const podeIniciar = carona.status === 'CRIADA';
  const podeFinalizar = carona.status === 'EM_ANDAMENTO';

  return (
    <article className="carona-card">
      <div className="carona-card__topo">
        <span className={`carona-status carona-status--${status.classe}`}>
          {status.rotulo}
        </span>
        <span className="carona-card__quando">{formatarQuando(carona.dataHoraSaida)}</span>
      </div>

      <p className="carona-card__rota">
        <strong>{carona.origem || 'Origem'}</strong>
        <ArrowRight size={18} aria-hidden="true" />
        <span>{montarDestino(carona)}</span>
      </p>

      {mostrarPassageiros && (
        <p className="carona-card__passageiros">
          {carona.passageirosConfirmados} de {carona.quantidadeVagas} passageiros confirmados
        </p>
      )}

      <div className="carona-card__acoes">
        {podeIniciar && (
          <button
            type="button"
            className="carona-card__iniciar"
            onClick={() => onIniciar(carona)}
          >
            <Play size={18} />
            Iniciar
          </button>
        )}

        {podeFinalizar && (
          <button
            type="button"
            className="carona-card__finalizar"
            onClick={() => onFinalizar(carona)}
          >
            <Square size={18} />
            Finalizar carona
          </button>
        )}

      {podeCancelar && (
        <>
          <Link
            to={`/minhas-caronas/${carona.id}/editar`}
            className={`carona-card__editar ${podeCancelar ? '' : 'is-disabled'}`}
            aria-disabled={!podeCancelar}
            tabIndex={podeCancelar ? undefined : -1}
            onClick={(event) => {
              if (!podeCancelar) {
                event.preventDefault();
              }
            }}
            aria-label="Editar carona"
          >
            <Pencil size={18} aria-hidden="true" />
          </Link>

          <button
            type="button"
            className="carona-card__cancelar"
            disabled={!podeCancelar}
            aria-label="Cancelar carona"
            onClick={podeCancelar ? () => onCancelar(carona) : undefined}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </>
      )}
      </div>

      <Link to={`/minhas-caronas/${carona.id}`} className="carona-card__detalhes">
        Ver detalhes da carona
      </Link>
    </article>
  );
}

function montarDestino(carona) {
  const destino = carona.destino || 'Destino';

  return carona.pontoEncontro ? `${destino} • ${carona.pontoEncontro}` : destino;
}

function formatarQuando(valor) {
  if (!valor) {
    return '';
  }

  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return valor;
  }

  const hora = data.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const hoje = new Date();
  const amanha = new Date(hoje);
  amanha.setDate(hoje.getDate() + 1);

  let dia;

  if (mesmoDia(data, hoje)) {
    dia = 'Hoje';
  } else if (mesmoDia(data, amanha)) {
    dia = 'Amanhã';
  } else {
    dia = data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }

  return `${dia} • ${hora}`;
}

function mesmoDia(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default MinhasCaronas;
