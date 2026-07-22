import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, Clock3, MessageSquare, Star } from 'lucide-react';
import {
  criarAvaliacao,
  listarAvaliacoesPendentes,
  listarAvaliacoesRecebidas,
} from '../../services/avaliacaoService.js';
import { listarHistoricoComoMotorista } from '../../services/historicoCaronasService.js';
import { listarHistoricoComoPassageiro } from '../../services/historicoPassageiroService.js';
import './style.css';

function AvaliacoesRecebidas() {
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [pendentes, setPendentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [erroPendentes, setErroPendentes] = useState('');
  const [avaliando, setAvaliando] = useState('');
  const [mensagem, setMensagem] = useState('');

  const resumo = useMemo(() => calcularResumo(avaliacoes), [avaliacoes]);

  async function carregarAvaliacoes() {
    try {
      setLoading(true);
      setErro('');
      setErroPendentes('');

      const dados = await carregarDadosDaPagina();
      setAvaliacoes(dados.avaliacoes);
      setPendentes(dados.pendentes);
      setErroPendentes(dados.erroPendentes);
    } catch (error) {
      setErro(error.message || 'Não foi possível carregar as avaliações.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let ativo = true;

    async function carregarInicial() {
      try {
        const dados = await carregarDadosDaPagina();

        if (!ativo) {
          return;
        }

        setAvaliacoes(dados.avaliacoes);
        setPendentes(dados.pendentes);
        setErroPendentes(dados.erroPendentes);
        setErro('');
      } catch (error) {
        if (ativo) {
          setErro(error.message || 'Não foi possível carregar as avaliações.');
        }
      } finally {
        if (ativo) {
          setLoading(false);
        }
      }
    }

    carregarInicial();

    return () => {
      ativo = false;
    };
  }, []);

  async function avaliar(pendencia, nota) {
    const chave = chavePendencia(pendencia);

    try {
      setAvaliando(chave);
      setMensagem('');
      setErroPendentes('');
      await criarAvaliacao({
        caronaId: pendencia.caronaId,
        avaliadoId: pendencia.usuarioId,
        nota,
      });
      setPendentes((atuais) => atuais.filter((item) => chavePendencia(item) !== chave));
      setMensagem(`Avaliação de ${pendencia.nome} enviada com sucesso.`);
    } catch (error) {
      setErroPendentes(error.message || 'Não foi possível enviar a avaliação.');
    } finally {
      setAvaliando('');
    }
  }

  if (loading) {
    return (
      <main className="avaliacoes-page">
        <section className="avaliacoes-loading-card">
          <div className="avaliacoes-spinner" />
          <p>Carregando avaliações...</p>
        </section>
      </main>
    );
  }

  if (erro) {
    return (
      <main className="avaliacoes-page">
        <section className="avaliacoes-shell">
          <ResumoHeader averageRating={0} totalReviews={0} />

          <div className="avaliacoes-error">{erro}</div>

          <div className="avaliacoes-actions">
            <button type="button" onClick={carregarAvaliacoes}>
              Tentar novamente
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="avaliacoes-page">
      <section className="avaliacoes-shell">
        <ResumoHeader averageRating={resumo.media} totalReviews={resumo.total} />

        <PendenciasSection
          pendentes={pendentes}
          avaliando={avaliando}
          erro={erroPendentes}
          mensagem={mensagem}
          onAvaliar={avaliar}
        />

        <section className="avaliacoes-section" aria-labelledby="avaliacoes-title">
          <h2 id="avaliacoes-title">Avaliações recebidas</h2>

          {resumo.total === 0 ? (
            <div className="avaliacoes-empty">
              <Star aria-hidden="true" />
              <h3>Nenhuma avaliação ainda</h3>
              <p>
                Você ainda não recebeu avaliações. Complete caronas para que outros
                usuários possam te avaliar.
              </p>
            </div>
          ) : (
            <ul className="avaliacoes-lista" aria-label="Lista de avaliações recebidas">
              {avaliacoes.map((avaliacao) => (
                <AvaliacaoItem key={avaliacao.id} avaliacao={avaliacao} />
              ))}
            </ul>
          )}
        </section>
      </section>
    </main>
  );
}

function PendenciasSection({ pendentes, avaliando, erro, mensagem, onAvaliar }) {
  return (
    <section className="avaliacoes-pendentes" aria-labelledby="avaliacoes-pendentes-title">
      <header className="avaliacoes-pendentes__header">
        <h2 id="avaliacoes-pendentes-title">
          <Clock3 aria-hidden="true" />
          Aguardando sua avaliação
        </h2>
        <span aria-label={`${pendentes.length} avaliações pendentes`}>{pendentes.length}</span>
      </header>

      {mensagem && <p className="avaliacoes-success" role="status">{mensagem}</p>}
      {erro && <p className="avaliacoes-pending-error" role="alert">{erro}</p>}

      {pendentes.length === 0 ? (
        <div className="avaliacoes-pendentes__empty">
          Você não possui avaliações pendentes.
        </div>
      ) : (
        <ul className="avaliacoes-pendentes__lista">
          {pendentes.map((pendencia) => {
            const chave = chavePendencia(pendencia);
            const enviando = avaliando === chave;

            return (
              <li className="avaliacoes-pendente-card" key={chave}>
                <div className="avaliacoes-pendente-user">
                  <Link to={`/usuarios/${pendencia.usuarioId}`} className="avaliacoes-pendente-avatar">
                    {pendencia.fotoUrl
                      ? <img src={pendencia.fotoUrl} alt={`Foto de ${pendencia.nome}`} />
                      : getInitial(pendencia.nome)}
                  </Link>
                  <div>
                    <strong>{pendencia.nome}</strong>
                    <span>
                      {formatarTipo(pendencia.tipo)}
                      <i>•</i>
                      <Calendar aria-hidden="true" />
                      {formatarDataCurta(pendencia.dataHora)}
                    </span>
                  </div>
                </div>

                <p className="avaliacoes-pendente-rota">
                  <span>{pendencia.origem || 'Origem não informada'}</span>
                  <ArrowRight aria-hidden="true" />
                  <span>{pendencia.destino || 'Destino não informado'}</span>
                </p>

                <div className="avaliacoes-pendente-acao">
                  <span>{enviando ? 'Enviando avaliação...' : 'Toque para avaliar'}</span>
                  <div className="avaliacoes-pendente-stars" role="group" aria-label={`Avaliar ${pendencia.nome}`}>
                    {[1, 2, 3, 4, 5].map((nota) => (
                      <button
                        key={nota}
                        type="button"
                        disabled={Boolean(avaliando)}
                        aria-label={`${nota} ${nota === 1 ? 'estrela' : 'estrelas'}`}
                        onClick={() => onAvaliar(pendencia, nota)}
                      >
                        <Star aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

async function carregarDadosDaPagina() {
  const [avaliacoes, caronasMotorista, reservasPassageiro] = await Promise.all([
    listarAvaliacoesRecebidas(),
    listarHistoricoComoMotorista().catch(() => []),
    listarHistoricoComoPassageiro().catch(() => []),
  ]);

  const viagens = [
    ...caronasMotorista.map((carona) => ({
      caronaId: carona.id,
      dataHora: carona.dataHoraSaida,
      origem: carona.origem,
      destino: carona.destino,
    })),
    ...reservasPassageiro.map((reserva) => ({
      caronaId: reserva.caronaId,
      dataHora: reserva.dataHora,
      origem: reserva.origem,
      destino: reserva.destino,
    })),
  ].filter((viagem) => viagem.caronaId);

  try {
    const resultados = await Promise.all(viagens.map(async (viagem) => {
      const participantes = await listarAvaliacoesPendentes(viagem.caronaId);
      return participantes.map((participante) => ({
        ...participante,
        usuarioId: participante.id,
        ...viagem,
      }));
    }));

    const porChave = new Map();
    resultados.flat().forEach((pendencia) => porChave.set(chavePendencia(pendencia), pendencia));

    return { avaliacoes, pendentes: [...porChave.values()], erroPendentes: '' };
  } catch {
    return {
      avaliacoes,
      pendentes: [],
      erroPendentes: 'Não foi possível carregar as avaliações pendentes.',
    };
  }
}

function chavePendencia(pendencia) {
  return `${pendencia.caronaId}-${pendencia.usuarioId || pendencia.id}`;
}

function formatarTipo(tipo) {
  return String(tipo).toUpperCase() === 'PASSAGEIRO' ? 'Passageiro(a)' : 'Motorista';
}

function formatarDataCurta(data) {
  const dataFormatada = formatarData(data);
  return dataFormatada === 'Data não informada' ? dataFormatada : dataFormatada.slice(0, 5);
}

function ResumoHeader({ averageRating, totalReviews }) {
  return (
    <header className="avaliacoes-hero">
      <div className="avaliacoes-hero__top">
        <div className="avaliacoes-hero__icon">
          <Star aria-hidden="true" />
        </div>

        <div>
          <h1>Minhas avaliações</h1>
          <p>Veja o que outros usuários disseram sobre você</p>
        </div>
      </div>

      <section className="avaliacoes-summary" aria-label="Resumo das avaliações">
        <div className="avaliacoes-summary-card">
          <strong>{formatarMediaResumo(averageRating)}</strong>
          <span>Média geral</span>
          <StarRating rating={Math.round(averageRating)} size="medium" />
        </div>

        <div className="avaliacoes-summary-card">
          <strong>{totalReviews}</strong>
          <span>Total de avaliações</span>
          <div className="avaliacoes-comments-label">
            <MessageSquare aria-hidden="true" />
            Comentários
          </div>
        </div>
      </section>
    </header>
  );
}

function AvaliacaoItem({ avaliacao }) {
  return (
    <li className="avaliacoes-item">
      <div className="avaliacoes-item__top">
        <div className="avaliacoes-user">
          <Link
            to={`/usuarios/${avaliacao.autorId}`}
            className="avaliacoes-avatar"
            aria-label={`Ver perfil de ${avaliacao.from}`}
          >
            {avaliacao.fotoUrl ? (
              <img src={avaliacao.fotoUrl} alt={`Foto de ${avaliacao.from}`} />
            ) : getInitial(avaliacao.from)}
          </Link>

          <div>
            <strong>{avaliacao.from}</strong>
            <StarRating rating={avaliacao.nota} />
          </div>
        </div>

        <time className="avaliacoes-date" dateTime={avaliacao.dataAvaliacao}>
          <Calendar aria-hidden="true" />
          {formatarData(avaliacao.dataAvaliacao)}
        </time>
      </div>

      {avaliacao.comentario && (
        <div className="avaliacoes-comment">
          <MessageSquare aria-hidden="true" />
          <p>{avaliacao.comentario}</p>
        </div>
      )}
    </li>
  );
}

function StarRating({ rating, size = 'small' }) {
  const roundedRating = Math.round(Number(rating) || 0);

  return (
    <div className={`avaliacoes-stars avaliacoes-stars--${size}`} aria-label={`${roundedRating} de 5 estrelas`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          aria-hidden="true"
          className={index < roundedRating ? 'avaliacoes-star--filled' : ''}
          key={index}
        />
      ))}
    </div>
  );
}

function calcularResumo(avaliacoes) {
  const total = avaliacoes.length;

  if (total === 0) {
    return { media: 0, total };
  }

  const soma = avaliacoes.reduce((acc, avaliacao) => acc + avaliacao.nota, 0);

  return {
    media: soma / total,
    total,
  };
}

function formatarMediaResumo(media) {
  return Number(media || 0).toFixed(1);
}

function formatarData(data) {
  if (!data) {
    return 'Data não informada';
  }

  const apenasData = String(data).match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (apenasData) {
    const [, ano, mes, dia] = apenasData;
    return `${dia}/${mes}/${ano}`;
  }

  const dataObj = new Date(data);

  if (Number.isNaN(dataObj.getTime())) {
    return 'Data não informada';
  }

  return new Intl.DateTimeFormat('pt-BR').format(dataObj);
}

function getInitial(nome) {
  return (nome || 'U').trim().charAt(0).toUpperCase() || 'U';
}

export default AvaliacoesRecebidas;
