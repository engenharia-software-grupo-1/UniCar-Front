import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bell, Star, Users } from 'lucide-react';
import Logo from '../../components/common/Logo.jsx';
import NavegacaoInferior from '../../components/layout/NavegacaoInferior.jsx';
import {
  listarHistoricoComoPassageiro,
  obterResumoHistoricoPassageiro,
} from '../../services/historicoPassageiroService.js';
import './style.css';

const STATUS_RESERVA = {
  PENDENTE: { rotulo: 'Pendente', classe: 'pendente' },
  CONFIRMADA: { rotulo: 'Confirmada', classe: 'confirmada' },
  FINALIZADA: { rotulo: 'Finalizada', classe: 'finalizada' },
  CANCELADA: { rotulo: 'Cancelada', classe: 'cancelada' },
  RECUSADA: { rotulo: 'Recusada', classe: 'recusada' },
};

function HistoricoCaronas() {
  const [aba, setAba] = useState('passageiro');
  const [reservas, setReservas] = useState([]);
  const [resumo, setResumo] = useState({ avaliacaoMedia: 0, caronasConcluidas: 0 });
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;

    async function carregarHistorico() {
      try {
        setCarregando(true);
        setErro('');

        const [reservasPassageiro, resumoHistorico] = await Promise.all([
          listarHistoricoComoPassageiro(),
          obterResumoHistoricoPassageiro(),
        ]);

        if (!ativo) {
          return;
        }

        setReservas(reservasPassageiro);
        setResumo(resumoHistorico);
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

        {aba === 'motorista' ? (
          <div className="historico-vazio">
            <p>Você ainda não possui histórico como motorista.</p>
          </div>
        ) : (
          <HistoricoPassageiro
            carregando={carregando}
            erro={erro}
            reservas={reservas}
          />
        )}
      </section>

      <NavegacaoInferior />
    </main>
  );
}

function HistoricoPassageiro({ carregando, erro, reservas }) {
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
      <div className="historico-vazio">
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
            <ReservaPassageiroCard reserva={reserva} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ReservaPassageiroCard({ reserva }) {
  const status = STATUS_RESERVA[reserva.status] || {
    rotulo: reserva.status || 'Reserva',
    classe: 'pendente',
  };

  return (
    <article className="historico-card">
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
    </article>
  );
}

function Avatar({ motorista }) {
  const usuarioId = motorista.id || gerarUsuarioId(motorista.nome);
  const perfilUrl = `/usuarios/${usuarioId}`;

  if (motorista.fotoPerfil) {
    return (
      <Link to={perfilUrl} className="historico-avatar-link" aria-label={`Ver perfil de ${motorista.nome}`}>
        <img
          className="historico-avatar"
          src={motorista.fotoPerfil}
          alt={`Foto de ${motorista.nome}`}
        />
      </Link>
    );
  }

  return (
    <Link to={perfilUrl} className="historico-avatar historico-avatar-link" aria-label={`Ver perfil de ${motorista.nome}`}>
      {motorista.nome.trim()[0]?.toUpperCase() || 'M'}
    </Link>
  );
}

function montarDestino(reserva) {
  const destino = reserva.destino || 'Destino';

  return reserva.pontoReferencia ? `${destino} • ${reserva.pontoReferencia}` : destino;
}

function formatarVagas(reserva) {
  const reservadas = Number(reserva.vagasReservadas) || 0;
  const textoReservadas = `${reservadas} ${reservadas === 1 ? 'vaga reservada' : 'vagas reservadas'}`;

  if (!reserva.totalVagas) {
    return textoReservadas;
  }

  return `${textoReservadas} • ${reserva.totalVagas} no total`;
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
