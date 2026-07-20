import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Inbox, Star, Users, X } from 'lucide-react';
import AvaliarUsuarioModal from '../Perfil/AvaliarUsuarioModal.jsx';
import {
  listarHistoricoComoPassageiro,
} from '../../services/historicoPassageiroService.js';
import {
  listarHistoricoComoMotorista,
} from '../../services/historicoCaronasService.js';
import {
  criarAvaliacao,
  listarAvaliacoesRecebidas,
  listarAvaliacoesPendentes,
} from '../../services/avaliacaoService.js';
import { getPerfilUsuarioAutenticado } from '../../services/profileService.js';
import { obterPerfilPublicoUsuario } from '../../services/publicProfileService.js';
import { obterFotoPerfil } from '../../utils/fotoPerfil.js';
import './style.css';

const STATUS_RESERVA = {
  PENDENTE: { rotulo: 'Pendente', classe: 'pendente' },
  CONFIRMADA: { rotulo: 'Confirmada', classe: 'confirmada' },
  CONCLUIDA: { rotulo: 'Concluida', classe: 'finalizada' },
  FINALIZADA: { rotulo: 'Finalizada', classe: 'finalizada' },
  CANCELADA: { rotulo: 'Cancelada', classe: 'cancelada' },
  RECUSADA: { rotulo: 'Recusada', classe: 'recusada' },
};

const STATUS_CARONA = {
  ATIVA: { rotulo: 'Ativa', classe: 'ativa' },
  CRIADA: { rotulo: 'Ativa', classe: 'ativa' },
  EXPIRADA: { rotulo: 'Expirada', classe: 'expirada' },
  CANCELADA: { rotulo: 'Cancelada', classe: 'cancelada' },
  FINALIZADA: { rotulo: 'Concluida', classe: 'finalizada' },
};

function HistoricoCaronas() {
  const [aba, setAba] = useState(() => {
    const abaSalva = window.sessionStorage.getItem('unicar.historico.aba');
    return abaSalva === 'motorista' ? 'motorista' : 'passageiro';
  });
  const [reservas, setReservas] = useState([]);
  const [caronas, setCaronas] = useState([]);
  const [resumo, setResumo] = useState({ avaliacaoMedia: 0, caronasConcluidas: 0 });
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [caronaParaAvaliar, setCaronaParaAvaliar] = useState(null);
  const [caronaParaEscolherPassageiro, setCaronaParaEscolherPassageiro] = useState(null);
  const [enviandoAvaliacao, setEnviandoAvaliacao] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState('');
  const [pendentesPorCarona, setPendentesPorCarona] = useState({});

  useEffect(() => {
    window.sessionStorage.setItem('unicar.historico.aba', aba);
  }, [aba]);

  useEffect(() => {
    let ativo = true;

    async function carregarHistorico() {
      try {
        setCarregando(true);
        setErro('');

        const [reservasPassageiro, caronasMotorista, perfil, avaliacoes] = await Promise.all([
          listarHistoricoComoPassageiro(),
          listarHistoricoComoMotorista(),
          getPerfilUsuarioAutenticado(),
          // O perfil nem sempre traz a reputação. O endpoint de avaliações é a
          // fonte que contém as notas realmente recebidas pelo usuário.
          listarAvaliacoesRecebidas().catch(() => []),
        ]);
        const reservasComAvaliacoes = await enriquecerAvaliacoesDosMotoristas(reservasPassageiro);

        if (!ativo) {
          return;
        }

        setReservas(reservasComAvaliacoes);
        setCaronas(caronasMotorista);
        setResumo({
          avaliacaoMedia: calcularMediaAvaliacoes(avaliacoes, perfil.avaliacao),
          caronasConcluidas: contarCaronasConcluidas(reservasComAvaliacoes, caronasMotorista),
        });

        const caronasFinalizadas = [
          ...caronasMotorista.filter((carona) => carona.status === 'FINALIZADA').map((carona) => carona.id),
          ...reservasComAvaliacoes
            .filter((reserva) => ['CONCLUIDA', 'FINALIZADA'].includes(reserva.status))
            .map((reserva) => reserva.caronaId),
        ];
        const idsDeCaronas = [...new Set(caronasFinalizadas.filter(Boolean))];

        const pendencias = await Promise.all(
          idsDeCaronas.map(async (caronaId) => {
            try {
              return [caronaId, await listarAvaliacoesPendentes(caronaId)];
            } catch {
              // Mantém o botão disponível se não for possível consultar as pendências.
              return [caronaId, undefined];
            }
          }),
        );

        if (ativo) {
          setPendentesPorCarona(Object.fromEntries(pendencias));
        }
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

      await criarAvaliacao({
        caronaId: caronaParaAvaliar.caronaId,
        avaliadoId: caronaParaAvaliar.avaliadoId,
        nota,
        comentario,
      });

      setPendentesPorCarona((pendentesAtuais) => ({
        ...pendentesAtuais,
        [caronaParaAvaliar.caronaId]: (pendentesAtuais[caronaParaAvaliar.caronaId] || [])
          .filter((participante) => participante.id !== caronaParaAvaliar.avaliadoId),
      }));
      setCaronaParaAvaliar(null);
      setMensagemSucesso('Avaliação enviada com sucesso.');
    } catch (error) {
      setErro(error.message || 'Não foi possível enviar a avaliação.');
      setCaronaParaAvaliar(null);
    } finally {
      setEnviandoAvaliacao(false);
    }
  }

  async function iniciarAvaliacao(carona) {
    try {
      setErro('');
      setMensagemSucesso('');

      const passageiros = (await listarAvaliacoesPendentes(carona.id))
        .filter((participante) => participante.tipo === 'PASSAGEIRO');

      if (passageiros.length === 0) {
        setMensagemSucesso('NÃ£o hÃ¡ passageiros pendentes de avaliaÃ§Ã£o nesta carona.');
        return;
      }

      if (passageiros.length > 1) {
        setCaronaParaEscolherPassageiro({ ...carona, passageirosPendentes: passageiros });
        return;
      }

      selecionarPassageiroParaAvaliar(carona, passageiros[0]);
    } catch (error) {
      setErro(error.message || 'NÃ£o foi possÃ­vel carregar as avaliaÃ§Ãµes pendentes.');
    }
  }

  function selecionarPassageiroParaAvaliar(carona, passageiro) {
    setCaronaParaEscolherPassageiro(null);
    setCaronaParaAvaliar({
      caronaId: carona.id,
      avaliadoId: passageiro.id,
      nome: passageiro.nome,
      tipo: 'PASSAGEIRO',
    });
  }

  async function iniciarAvaliacaoMotorista(reserva) {
    try {
      setErro('');
      setMensagemSucesso('');

      const motorista = (await listarAvaliacoesPendentes(reserva.caronaId))
        .find((participante) => participante.tipo === 'MOTORISTA');

      if (!motorista) {
        setMensagemSucesso('NÃ£o hÃ¡ avaliaÃ§Ã£o pendente para esta carona.');
        return;
      }

      setCaronaParaAvaliar({
        caronaId: reserva.caronaId,
        avaliadoId: motorista.id,
        nome: motorista.nome,
        tipo: 'MOTORISTA',
      });
    } catch (error) {
      setErro(error.message || 'NÃ£o foi possÃ­vel carregar as avaliaÃ§Ãµes pendentes.');
    }
  }

  return (
    <main className="historico-page">
      <section className="historico-shell">
        <h1 className="historico-title">Histórico</h1>

        <section className="historico-resumo" aria-label="Resumo do histórico">
          <div className="historico-resumo__rating">
            <strong>{formatarMedia(resumo.avaliacaoMedia)}</strong>
            <span aria-label={`${formatarMedia(resumo.avaliacaoMedia)} estrelas`}>
              {Array.from({ length: 5 }).map((_, index) => (
                <Star
                  key={index}
                  size={15}
                  fill={index < Math.round(resumo.avaliacaoMedia) ? 'currentColor' : 'none'}
                  className={index < Math.round(resumo.avaliacaoMedia) ? 'is-filled' : ''}
                />
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
            pendentesPorCarona={pendentesPorCarona}
          />
        ) : (
          <HistoricoPassageiro
            carregando={carregando}
            erro={erro}
            reservas={reservas}
            onAvaliarMotorista={iniciarAvaliacaoMotorista}
            pendentesPorCarona={pendentesPorCarona}
          />
        )}
      </section>

      {caronaParaEscolherPassageiro && (
        <EscolherPassageiroModal
          carona={caronaParaEscolherPassageiro}
          passageiros={caronaParaEscolherPassageiro.passageirosPendentes}
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
    </main>
  );
}

function calcularMediaAvaliacoes(avaliacoes, mediaFallback) {
  const notas = (Array.isArray(avaliacoes) ? avaliacoes : [])
    .map((avaliacao) => Number(avaliacao.nota))
    .filter((nota) => Number.isFinite(nota) && nota >= 1 && nota <= 5);

  if (notas.length === 0) return Number(mediaFallback) || 0;

  return notas.reduce((total, nota) => total + nota, 0) / notas.length;
}

async function enriquecerAvaliacoesDosMotoristas(reservas) {
  const ids = [...new Set(reservas.map((reserva) => reserva.motorista?.id).filter(Boolean))];
  const avaliacoes = await Promise.all(ids.map(async (id) => {
    try {
      const perfil = await obterPerfilPublicoUsuario(id);
      return [String(id), Number(perfil.avaliacao)];
    } catch {
      return [String(id), null];
    }
  }));
  const avaliacaoPorMotorista = new Map(avaliacoes);

  return reservas.map((reserva) => {
    const avaliacao = avaliacaoPorMotorista.get(String(reserva.motorista?.id));
    const avaliacaoAtual = Number(reserva.motorista?.avaliacao);

    // Uma resposta sem avaliações não pode apagar uma nota já entregue pelo histórico.
    if (!Number.isFinite(avaliacao) || (avaliacao <= 0 && avaliacaoAtual > 0)) return reserva;

    return {
      ...reserva,
      motorista: { ...reserva.motorista, avaliacao },
    };
  });
}

function contarCaronasConcluidas(reservas = [], caronas = []) {
  const reservasConcluidas = reservas.filter((reserva) =>
    ['CONCLUIDA', 'FINALIZADA'].includes(reserva.status)).length;
  const caronasConcluidas = caronas.filter((carona) => carona.status === 'FINALIZADA').length;

  return reservasConcluidas + caronasConcluidas;
}

function HistoricoMotorista({ carregando, erro, caronas, onAvaliar, pendentesPorCarona }) {
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
            <CaronaMotoristaCard
              carona={carona}
              onAvaliar={onAvaliar}
              pendentes={pendentesPorCarona[carona.id]}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function CaronaMotoristaCard({ carona, onAvaliar, pendentes }) {
  const status = STATUS_CARONA[carona.status] || {
    rotulo: carona.status || 'Carona',
    classe: 'ativa',
  };

  return (
    <article className="historico-card historico-card--clicavel historico-card--carona-motorista">
      <Link
        to={`/historico/${carona.id}`}
        state={{ papel: 'motorista' }}
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

      {carona.status === 'FINALIZADA' && (pendentes === undefined || pendentes.some(
        (participante) => participante.tipo === 'PASSAGEIRO',
      )) && (
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
              {obterFotoPerfil(passageiro) ? (
                <img src={obterFotoPerfil(passageiro)} alt={`Foto de ${passageiro.nome}`} />
              ) : <span>{inicialDoNome(passageiro.nome)}</span>}
              {passageiro.nome}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function HistoricoPassageiro({ carregando, erro, reservas, onAvaliarMotorista, pendentesPorCarona }) {
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
            <ReservaPassageiroCard
              reserva={reserva}
              onAvaliarMotorista={onAvaliarMotorista}
              pendentes={pendentesPorCarona[reserva.caronaId]}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ReservaPassageiroCard({ reserva, onAvaliarMotorista, pendentes }) {
  const status = STATUS_RESERVA[reserva.status] || {
    rotulo: reserva.status || 'Reserva',
    classe: 'pendente',
  };

  return (
    <article className="historico-card historico-card--clicavel">
      <Link
        to={`/historico/${reserva.caronaId}`}
        state={{ papel: 'passageiro' }}
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

      {['CONCLUIDA', 'FINALIZADA'].includes(reserva.status) && (pendentes === undefined || pendentes.some(
        (participante) => participante.tipo === 'MOTORISTA',
      )) && (
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
  const foto = obterFotoPerfil(motorista);

  if (foto) {
    return (
      <Link
        to={perfilUrl}
        className="historico-avatar-link"
        aria-label={`Ver perfil de ${motorista.nome}`}
        onClick={(event) => event.stopPropagation()}
      >
        <img
          className="historico-avatar"
          src={foto}
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
