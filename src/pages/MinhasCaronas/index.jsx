import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bell, Play, X } from 'lucide-react';
import Logo from '../../components/common/Logo.jsx';
import NavegacaoInferior from '../../components/layout/NavegacaoInferior.jsx';
import Confirmacao from '../../components/common/Confirmacao.jsx';
import { cancelarCarona, listarMinhasCaronas } from '../../services/caronaService.js';
import './style.css';

const STATUS = {
  CRIADA: { rotulo: 'Aguardando', classe: 'aguardando' },
  EM_ANDAMENTO: { rotulo: 'Em andamento', classe: 'andamento' },
  FINALIZADA: { rotulo: 'Finalizada', classe: 'finalizada' },
  CANCELADA: { rotulo: 'Cancelada', classe: 'cancelada' },
};

function MinhasCaronas() {
  const [aba, setAba] = useState('motorista');
  const [caronas, setCaronas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [caronaParaCancelar, setCaronaParaCancelar] = useState(null);
  const [cancelando, setCancelando] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState('');

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

  return (
    <main className="caronas-page">
      <header className="caronas-topbar">
        <Link to="/inicio" className="caronas-logo" aria-label="UniCar">
          <Logo />
        </Link>

        <button type="button" className="caronas-notification" aria-label="Notificações">
          <Bell size={24} />
          <span />
        </button>
      </header>

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
            caronas={caronas}
            onTentarNovamente={carregar}
            onCancelar={iniciarCancelamento}
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

      <NavegacaoInferior />
    </main>
  );
}

function ConteudoMotorista({ carregando, erro, caronas, onTentarNovamente, onCancelar }) {
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
          <CaronaCard carona={carona} onCancelar={onCancelar} />
        </li>
      ))}
    </ul>
  );
}

function CaronaCard({ carona, onCancelar }) {
  const status = STATUS[carona.status] || {
    rotulo: carona.status || 'Carona',
    classe: 'aguardando',
  };

  const mostrarPassageiros =
    carona.passageirosConfirmados !== null && carona.quantidadeVagas !== null;

  const podeCancelar = carona.status === 'CRIADA';

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
        <button type="button" className="carona-card__iniciar" disabled>
          <Play size={18} aria-hidden="true" />
          Iniciar
        </button>

        <button
          type="button"
          className="carona-card__cancelar"
          disabled={!podeCancelar}
          aria-label="Cancelar carona"
          onClick={podeCancelar ? () => onCancelar(carona) : undefined}
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <button type="button" className="carona-card__detalhes" disabled>
        Ver detalhes da carona
      </button>
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
