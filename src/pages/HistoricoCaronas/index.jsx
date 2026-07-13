import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bell, Inbox, Star, Users, X } from 'lucide-react';
import Logo from '../../components/common/Logo.jsx';
import NavegacaoInferior from '../../components/layout/NavegacaoInferior.jsx';
import AvaliarUsuarioModal from '../Perfil/AvaliarUsuarioModal.jsx';
import {
  listarHistoricoComoPassageiro,
  obterResumoHistoricoPassageiro,
} from '../../services/historicoPassageiroService.js';
import {
  listarHistoricoComoMotorista,
  obterResumoHistoricoMotorista,
} from '../../services/historicoCaronasService.js';
import './style.css';

const STATUS_RESERVA = {
  PENDENTE: { rotulo: 'Pendente', classe: 'pendente' },
  CONFIRMADA: { rotulo: 'Confirmada', classe: 'confirmada' },
  FINALIZADA: { rotulo: 'Finalizada', classe: 'finalizada' },
  CANCELADA: { rotulo: 'Cancelada', classe: 'cancelada' },
  RECUSADA: { rotulo: 'Recusada', classe: 'recusada' },
};

const STATUS_CARONA = {
  ATIVA: { rotulo: 'Ativa', classe: 'ativa' },
  CRIADA: { rotulo: 'Ativa', classe: 'ativa' },
  EXPIRADA: { rotulo: 'Expirada', classe: 'expirada' },
  CANCELADA: { rotulo: 'Cancelada', classe: 'cancelada' },
  FINALIZADA: { rotulo: 'Concluída', classe: 'finalizada' },
};

function HistoricoCaronas() {
  const [aba, setAba] = useState('passageiro');
  const [reservas, setReservas] = useState([]);
  const [caronas, setCaronas] = useState([]);
  const [resumo, setResumo] = useState({ avaliacaoMedia: 0, caronasConcluidas: 0 });
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [caronaParaAvaliar, setCaronaParaAvaliar] = useState(null);
  const [caronaParaEscolherPassageiro, setCaronaParaEscolherPassageiro] = useState(null);
  const [enviandoAvaliacao, setEnviandoAvaliacao] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState('');

  useEffect(() => {
    let ativo = true;

    async function carregarHistorico() {
      try {
        setCarregando(true);
        setErro('');

        const [reservasPassageiro, caronasMotorista, resumoPassageiro, resumoMotorista] = await Promise.all([
          listarHistoricoComoPassageiro(),
          listarHistoricoComoMotorista(),
          obterResumoHistoricoPassageiro(),
          obterResumoHistoricoMotorista(),
        ]);

        if (!ativo) {
          return;
        }

        setReservas(reservasPassageiro);
        setCaronas(caronasMotorista);
        setResumo({
          avaliacaoMedia: resumoMotorista.avaliacaoMedia || resumoPassageiro.avaliacaoMedia,
          caronasConcluidas: resumoMotorista.caronasConcluidas || resumoPassageiro.caronasConcluidas,
        });
      } catch (error) {
        if (ativo) {
          setErro(error.message || 'Nao foi possivel carregar o historico.');
        }
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    }

    carregarHistorico();

    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    if (!mensagemSucesso) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setMensagemSucesso('');
    }, 60000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [mensagemSucesso]);

  async function enviarAvaliacao({ nota, comentario }) {
    if (!caronaParaAvaliar) {
      return;
    }

    try {
      setEnviandoAvaliacao(true);
      setErro('');
      setMensagemSucesso('');

      await Promise.resolve({
        caronaId: caronaParaAvaliar.caronaId,
        avaliadoId: caronaParaAvaliar.avaliadoId,
        nota,
        comentario,
      });

      setCaronaParaAvaliar(null);
      setMensagemSucesso('Avaliação enviada com sucesso.');
    } catch (error) {
      setErro(error.message || 'Não foi possível enviar a avaliação.');
      setCaronaParaAvaliar(null);
    } finally {
      setEnviandoAvaliacao(false);
    }
  }

  function iniciarAvaliacao(carona) {
    const passageiros = obterPassageirosAvaliaveis(carona);

    if (passageiros.length > 1) {
      setCaronaParaEscolherPassageiro(carona);
      return;
    }

    selecionarPassageiroParaAvaliar(carona, passageiros[0]);
  }

  function selecionarPassageiroParaAvaliar(carona, passageiro) {
    setCaronaParaEscolherPassageiro(null);
    setCaronaParaAvaliar({
      caronaId: carona.id,
      avaliadoId: passageiro.id,
      nome: passageiro.nome,
    });
  }

  function iniciarAvaliacaoMotorista(reserva) {
    setCaronaParaAvaliar({
      caronaId: reserva.id,
      avaliadoId: reserva.motorista.id,
      nome: reserva.motorista.nome,
    });
  }

  return (
    <main className="historico-page">
      <header className="historico-topbar">
        <Link to="/inicio" className="historico-logo" aria-label="UniCar">
          <Logo />
        </Link>

        <button type="button" className="historico-notification" aria-label="Notificações">
          <Bell size={24} />
          <span />
        </button>
      </header>

      <section className="historico-shell">
        <h1 className="historico-title">Histórico</h1>

        <section className="historico-resumo" aria-label="Resumo do histórico">
          <div className="historico-resumo__rating">
            <strong>{formatarMedia(resumo.avaliacaoMedia)}</strong>
            <span aria-label={`${formatarMedia(resumo.avaliacaoMedia)} estrelas`}>
              {Array.from({ length: 5 }).map((_, index) => (
                <Star key={index} size={15} fill="currentColor" />
              ))}
            </span>
          </div>

          <div className="historico-resumo__divider" />

          <div className="historico-resumo__total">
            <span>Caronas concluídas</span>
            <strong>{resumo.caronasConcluidas}</strong>
          </div>
        </section>

        <div className="historico-tabs" role="tablist" aria-label="Tipo de histórico">
          <button
            type="button"
            role="tab"
            aria-selected={aba === 'motorista'}
            className={`historico-tab ${aba === 'motorista' ? 'is-active' : ''}`}
            onClick={() => setAba('motorista')}
          >
            Como motorista
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={aba === 'passageiro'}
            className={`historico-tab ${aba === 'passageiro' ? 'is-active' : ''}`}
            onClick={() => setAba('passageiro')}
          >
            Como passageiro
          </button>
        </div>

        {mensagemSucesso && (
          <p className="historico-sucesso" role="status">
            {mensagemSucesso}
          </p>
        )}

        {aba === 'motorista' ? (
          <HistoricoMotorista
            carregando={carregando}
            erro={erro}
            caronas={caronas}
            onAvaliar={iniciarAvaliacao}
          />
        ) : (
          <HistoricoPassageiro
            carregando={carregando}
            erro={erro}
            reservas={reservas}
            onAvaliarMotorista={iniciarAvaliacaoMotorista}
          />
        )}
      </section>

      {caronaParaEscolherPassageiro && (
        <EscolherPassageiroModal
          carona={caronaParaEscolherPassageiro}
          passageiros={obterPassageirosAvaliaveis(caronaParaEscolherPassageiro)}
          onEscolher={(passageiro) =>
            selecionarPassageiroParaAvaliar(caronaParaEscolherPassageiro, passageiro)
          }
          onClose={() => setCaronaParaEscolherPassageiro(null)}
        />
      )}

      {caronaParaAvaliar && (
        <AvaliarUsuarioModal
          userName={caronaParaAvaliar.nome}
          loading={enviandoAvaliacao}
          onSubmit={enviarAvaliacao}
          onClose={() => setCaronaParaAvaliar(null)}
        />
      )}

      <NavegacaoInferior />
    </main>
  );
}

function HistoricoMotorista({ carregando, erro, caronas, onAvaliar }) {
  if (carregando) {
    return <p className="historico-loading">Carregando histórico...</p>;
  }

  if (erro) {
    return (
      <div className="historico-erro" role="alert">
        {erro}
      </div>
    );
  }

  if (caronas.length === 0) {
    return (
      <div className="historico-vazio">
        <p>Você ainda não ofertou nenhuma carona.</p>
      </div>
    );
  }

  return (
    <section aria-labelledby="historico-motorista-titulo">
      <h2 id="historico-motorista-titulo" className="historico-section-title">
        Caronas ofertadas
      </h2>

      <ul className="historico-lista">
        {caronas.map((carona) => (
          <li key={carona.id}>
            <CaronaMotoristaCard carona={carona} onAvaliar={onAvaliar} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function CaronaMotoristaCard({ carona, onAvaliar }) {
  const status = STATUS_CARONA[carona.status] || {
    rotulo: carona.status || 'Carona',
    classe: 'ativa',
  };

  return (
    <article className="historico-card historico-card--clicavel historico-card--carona-motorista">
      <Link
        to={`/historico/${carona.id}`}
        className="historico-card__link"
        aria-label={`Ver detalhes da carona de ${carona.origem} para ${montarDestinoMotorista(carona)}`}
      />

      <div className="historico-card__topo">
        <span className={`historico-status historico-status--${status.classe}`}>
          {status.rotulo}
        </span>
        <time dateTime={carona.dataHoraSaida}>{formatarDataHora(carona.dataHoraSaida)}</time>
      </div>

      <p className="historico-rota">
        <strong>{carona.origem || 'Origem'}</strong>
        <ArrowRight size={16} aria-hidden="true" />
        <span>{montarDestinoMotorista(carona)}</span>
      </p>

      <p className="historico-vagas">
        <Users size={17} aria-hidden="true" />
        {formatarOcupacao(carona)}
      </p>

      {carona.passageiros.length > 0 && (
        <p className="historico-passageiro">com {formatarPassageiros(carona.passageiros)}</p>
      )}

      {carona.status === 'FINALIZADA' && (
        <button
          type="button"
          className="historico-avaliar"
          onClick={(event) => {
            event.stopPropagation();
            onAvaliar(carona);
          }}
        >
          <Star size={15} aria-hidden="true" />
          Avaliar
        </button>
      )}
    </article>
  );
}

function EscolherPassageiroModal({ carona, passageiros, onEscolher, onClose }) {
  return (
    <div className="historico-seletor-overlay" onClick={onClose}>
      <section
        className="historico-seletor"
        role="dialog"
        aria-modal="true"
        aria-label="Escolher passageiro para avaliar"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="historico-seletor__header">
          <div>
            <h2>Escolher passageiro</h2>
            <p>{montarDestinoMotorista(carona)}</p>
          </div>

          <button type="button" aria-label="Fechar" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="historico-seletor__lista">
          {passageiros.map((passageiro) => (
            <button
              key={passageiro.id || passageiro.nome}
              type="button"
              onClick={() => onEscolher(passageiro)}
            >
              <span>{inicialDoNome(passageiro.nome)}</span>
              {passageiro.nome}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function HistoricoPassageiro({ carregando, erro, reservas, onAvaliarMotorista }) {
  if (carregando) {
    return <p className="historico-loading">Carregando histórico...</p>;
  }

  if (erro) {
    return (
      <div className="historico-erro" role="alert">
        {erro}
      </div>
    );
  }

  if (reservas.length === 0) {
    return (
      <div className="historico-vazio historico-vazio--passageiro">
        <Inbox size={32} aria-hidden="true" />
        <p>Você ainda não realizou nenhuma viagem como passageiro.</p>
      </div>
    );
  }

  return (
    <section aria-labelledby="historico-passageiro-titulo">
      <h2 id="historico-passageiro-titulo" className="historico-section-title">
        Reservas como passageiro
      </h2>

      <ul className="historico-lista">
        {reservas.map((reserva) => (
          <li key={reserva.id}>
            <ReservaPassageiroCard reserva={reserva} onAvaliarMotorista={onAvaliarMotorista} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ReservaPassageiroCard({ reserva, onAvaliarMotorista }) {
  const status = STATUS_RESERVA[reserva.status] || {
    rotulo: reserva.status || 'Reserva',
    classe: 'pendente',
  };

  return (
    <article className="historico-card historico-card--clicavel">
      <Link
        to={`/historico/${reserva.id}`}
        className="historico-card__link"
        aria-label={`Ver detalhes da carona de ${reserva.origem} para ${montarDestino(reserva)}`}
      />

      <div className="historico-card__topo">
        <span className={`historico-status historico-status--${status.classe}`}>
          {status.rotulo}
        </span>
        <time dateTime={reserva.dataHora}>{formatarDataHora(reserva.dataHora)}</time>
      </div>

      <div className="historico-motorista">
        <Avatar motorista={reserva.motorista} />

        <div>
          <strong>{reserva.motorista.nome}</strong>
          <span>
            <Star size={15} fill="currentColor" />
            {formatarMedia(reserva.motorista.avaliacao)}
          </span>
        </div>
      </div>

      <p className="historico-rota">
        <strong>{reserva.origem || 'Origem'}</strong>
        <ArrowRight size={16} aria-hidden="true" />
        <span>{montarDestino(reserva)}</span>
      </p>

      <p className="historico-vagas">
        <Users size={17} aria-hidden="true" />
        {formatarVagas(reserva)}
      </p>

      {reserva.status === 'FINALIZADA' && (
        <button
          type="button"
          className="historico-avaliar"
          onClick={(event) => {
            event.stopPropagation();
            onAvaliarMotorista(reserva);
          }}
        >
          <Star size={15} aria-hidden="true" />
          Avaliar motorista
        </button>
      )}
    </article>
  );
}

function Avatar({ motorista }) {
  const usuarioId = motorista.id || gerarUsuarioId(motorista.nome);
  const perfilUrl = `/usuarios/${usuarioId}`;

  if (motorista.fotoPerfil) {
    return (
      <Link
        to={perfilUrl}
        className="historico-avatar-link"
        aria-label={`Ver perfil de ${motorista.nome}`}
        onClick={(event) => event.stopPropagation()}
      >
        <img
          className="historico-avatar"
          src={motorista.fotoPerfil}
          alt={`Foto de ${motorista.nome}`}
        />
      </Link>
    );
  }

  return (
    <Link
      to={perfilUrl}
      className="historico-avatar historico-avatar-link"
      aria-label={`Ver perfil de ${motorista.nome}`}
      onClick={(event) => event.stopPropagation()}
    >
      {motorista.nome.trim()[0]?.toUpperCase() || 'M'}
    </Link>
  );
}

function montarDestino(reserva) {
  const destino = reserva.destino || 'Destino';

  return reserva.pontoReferencia ? `${destino} • ${reserva.pontoReferencia}` : destino;
}

function montarDestinoMotorista(carona) {
  const destino = carona.destino || 'Destino';

  return carona.pontoEncontro ? `${destino} • ${carona.pontoEncontro}` : destino;
}

function formatarVagas(reserva) {
  const reservadas = Number(reserva.vagasReservadas) || 0;
  const textoReservadas = `${reservadas} ${reservadas === 1 ? 'vaga reservada' : 'vagas reservadas'}`;

  if (!reserva.totalVagas) {
    return textoReservadas;
  }

  return `${textoReservadas} • ${reserva.totalVagas} no total`;
}

function formatarOcupacao(carona) {
  const ocupadas = Number(carona.vagasOcupadas) || 0;
  const total = Number(carona.vagasTotal) || Math.max(ocupadas, 1);

  return `${ocupadas}/${total} vagas ocupadas`;
}

function formatarPassageiros(passageiros) {
  if (passageiros.length === 1) {
    return passageiros[0].nome;
  }

  if (passageiros.length === 2) {
    return `${passageiros[0].nome} e ${passageiros[1].nome}`;
  }

  return `${passageiros[0].nome}, ${passageiros[1].nome} e mais ${passageiros.length - 2}`;
}

function obterPassageirosAvaliaveis(carona) {
  if (Array.isArray(carona.passageiros) && carona.passageiros.length > 0) {
    return carona.passageiros;
  }

  return [
    {
      id: carona.id,
      nome: 'Passageiro',
    },
  ];
}

function inicialDoNome(nome) {
  return (nome || 'P').trim().charAt(0).toUpperCase();
}

function formatarDataHora(valor) {
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
  const dia = mesmoDia(data, hoje)
    ? 'Hoje'
    : data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

  return `${dia} • ${hora}`;
}

function formatarMedia(valor) {
  const numero = Number(valor);

  if (!Number.isFinite(numero) || numero <= 0) {
    return '0';
  }

  return numero.toLocaleString('pt-BR', {
    minimumFractionDigits: Number.isInteger(numero) ? 0 : 1,
    maximumFractionDigits: 1,
  });
}

function gerarUsuarioId(nome = '') {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function mesmoDia(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default HistoricoCaronas;
