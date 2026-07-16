import { useEffect, useMemo, useState } from 'react';
import { Calendar, MessageSquare, Star } from 'lucide-react';
import { listarAvaliacoesRecebidas } from '../../services/avaliacaoService.js';
import './style.css';

function AvaliacoesRecebidas() {
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  const resumo = useMemo(() => calcularResumo(avaliacoes), [avaliacoes]);

  async function carregarAvaliacoes() {
    try {
      setLoading(true);
      setErro('');

      const dados = await listarAvaliacoesRecebidas();
      setAvaliacoes(dados);
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
        const dados = await listarAvaliacoesRecebidas();

        if (!ativo) {
          return;
        }

        setAvaliacoes(dados);
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
          <div className="avaliacoes-avatar" aria-hidden="true">
            {getInitial(avaliacao.from)}
          </div>

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
