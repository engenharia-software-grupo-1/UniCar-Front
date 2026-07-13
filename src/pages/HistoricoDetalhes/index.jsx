import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarClock, CircleDollarSign, Star } from 'lucide-react';
import NavegacaoInferior from '../../components/layout/NavegacaoInferior.jsx';
import { obterDetalhesHistorico } from '../../services/historicoDetalhesService.js';
import './style.css';

const STATUS = {
  CONFIRMADA: { rotulo: 'Confirmada', classe: 'confirmada' },
  FINALIZADA: { rotulo: 'Finalizada', classe: 'finalizada' },
  CANCELADA: { rotulo: 'Cancelada', classe: 'cancelada' },
  RECUSADA: { rotulo: 'Recusada', classe: 'recusada' },
  PENDENTE: { rotulo: 'Pendente', classe: 'pendente' },
};

function HistoricoDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [detalhe, setDetalhe] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    let ativo = true;

    async function carregarDetalhe() {
      try {
        setCarregando(true);
        setErro(null);

        const dados = await obterDetalhesHistorico(id);

        if (ativo) {
          setDetalhe(dados);
        }
      } catch (error) {
        if (ativo) {
          setErro({
            status: error.status,
            mensagem: error.message || 'Não foi possível carregar os detalhes da carona.',
          });
        }
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    }

    carregarDetalhe();

    return () => {
      ativo = false;
    };
  }, [id]);

  return (
    <main className="historico-detalhes-page">
      <section className="historico-detalhes-shell">
        <button type="button" className="historico-detalhes-voltar" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} aria-hidden="true" />
          Voltar
        </button>

        {carregando && <p className="historico-detalhes-feedback">Carregando detalhes...</p>}

        {!carregando && erro?.status === 403 && (
          <section className="historico-detalhes-erro historico-detalhes-erro--403" role="alert">
            <strong>403</strong>
            <h1>Acesso negado</h1>
            <p>Você não participou desta carona como motorista nem como passageiro.</p>
            <Link to="/historico-caronas">Voltar ao histórico</Link>
          </section>
        )}

        {!carregando && erro && erro.status !== 403 && (
          <section className="historico-detalhes-erro" role="alert">
            <h1>Não foi possível carregar</h1>
            <p>{erro.mensagem}</p>
            <Link to="/historico-caronas">Voltar ao histórico</Link>
          </section>
        )}

        {!carregando && detalhe && !erro && <ConteudoDetalhe detalhe={detalhe} />}
      </section>

      <NavegacaoInferior />
    </main>
  );
}

function ConteudoDetalhe({ detalhe }) {
  const status = STATUS[detalhe.status] || { rotulo: detalhe.status, classe: 'pendente' };

  return (
    <>
      <header className="historico-detalhes-hero">
        <div>
          <span className={`historico-detalhes-status historico-detalhes-status--${status.classe}`}>
            {status.rotulo}
          </span>
          <h1>{detalhe.origem} → {montarDestino(detalhe)}</h1>
          <p>{formatarIntervalo(detalhe)}</p>
        </div>
      </header>

      <section className="historico-detalhes-grid">
        <CardInfo titulo="Horários" icone={<CalendarClock size={20} aria-hidden="true" />}>
          <p>Saída: {formatarDataHora(detalhe.dataHoraSaida)}</p>
          <p>Chegada: {detalhe.dataHoraChegada ? formatarDataHora(detalhe.dataHoraChegada) : 'Não informada'}</p>
        </CardInfo>

        <CardInfo titulo="Valores e custos" icone={<CircleDollarSign size={20} aria-hidden="true" />}>
          <p>{formatarMoeda(detalhe.valor)}</p>
          <p>{detalhe.custos || 'Sem observações de custo.'}</p>
        </CardInfo>
      </section>

      <section className="historico-detalhes-card">
        <h2>Pontos de parada</h2>
        {detalhe.paradas.length > 0 ? (
          <ul className="historico-detalhes-paradas">
            {detalhe.paradas.map((parada) => (
              <li key={parada}>{parada}</li>
            ))}
          </ul>
        ) : (
          <p className="historico-detalhes-muted">Nenhum ponto de parada informado.</p>
        )}
      </section>

      <section className="historico-detalhes-card">
        <h2>Motorista</h2>
        <div className="historico-detalhes-motorista">
          <Avatar pessoa={detalhe.motorista} />
          <div>
            <strong>{detalhe.motorista.nome}</strong>
            <span>
              <Star size={15} fill="currentColor" aria-hidden="true" />
              {formatarMedia(detalhe.motorista.avaliacao)}
            </span>
          </div>
        </div>
      </section>

      <section className="historico-detalhes-card">
        <h2>Reservas</h2>
        <ul className="historico-detalhes-reservas">
          {detalhe.reservas.map((reserva) => (
            <li key={reserva.id}>
              <Avatar pessoa={reserva} />
              <div>
                <strong>{reserva.nome}</strong>
                <span>{reserva.vagas} {Number(reserva.vagas) === 1 ? 'vaga' : 'vagas'} • {reserva.status}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function CardInfo({ titulo, icone, children }) {
  return (
    <section className="historico-detalhes-card historico-detalhes-info">
      <div>
        {icone}
        <h2>{titulo}</h2>
      </div>
      {children}
    </section>
  );
}

function Avatar({ pessoa }) {
  if (pessoa.fotoPerfil) {
    return <img className="historico-detalhes-avatar" src={pessoa.fotoPerfil} alt={`Foto de ${pessoa.nome}`} />;
  }

  return <span className="historico-detalhes-avatar">{pessoa.nome?.trim()[0]?.toUpperCase() || 'U'}</span>;
}

function montarDestino(detalhe) {
  return detalhe.pontoReferencia ? `${detalhe.destino} • ${detalhe.pontoReferencia}` : detalhe.destino;
}

function formatarIntervalo(detalhe) {
  const saida = formatarDataHora(detalhe.dataHoraSaida);
  const chegada = detalhe.dataHoraChegada ? formatarDataHora(detalhe.dataHoraChegada) : '';

  return chegada ? `${saida} até ${chegada}` : saida;
}

function formatarDataHora(valor) {
  if (!valor) {
    return '';
  }

  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return valor;
  }

  return data.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function formatarMedia(valor) {
  const numero = Number(valor);

  if (!Number.isFinite(numero) || numero <= 0) {
    return 'Sem avaliação';
  }

  return numero.toLocaleString('pt-BR', {
    minimumFractionDigits: Number.isInteger(numero) ? 0 : 1,
    maximumFractionDigits: 1,
  });
}

export default HistoricoDetalhes;
