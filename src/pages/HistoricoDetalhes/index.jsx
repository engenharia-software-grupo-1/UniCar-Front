import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CarFront,
  CheckCircle2,
  Clock,
  DollarSign,
  MapPin,
  ShieldAlert,
  Star,
  UserRound,
  Users,
  XCircle,
} from 'lucide-react';
import NavegacaoInferior from '../../components/layout/NavegacaoInferior.jsx';
import { getSession } from '../../services/authService.js';
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
            <ShieldAlert size={36} aria-hidden="true" />
            <strong>Erro 403</strong>
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
  const finalizada = status.classe === 'finalizada' || status.classe === 'confirmada';
  const usuarioId = getSession()?.usuario?.id;
  const motorista = String(detalhe.motorista.id) === String(usuarioId);
  const totalVagas = Number(detalhe.vagasTotais || detalhe.reservas.reduce((total, reserva) => total + Number(reserva.vagas || 1), 0));
  const vagasOcupadas = detalhe.reservas.reduce((total, reserva) => total + Number(reserva.vagas || 1), 0);

  return (
    <>
      <header className="historico-detalhes-hero">
        {finalizada ? <CheckCircle2 aria-hidden="true" /> : <XCircle aria-hidden="true" />}
        <div>
          <h1>{finalizada ? 'Viagem concluída' : 'Viagem cancelada'}</h1>
          <span className="historico-detalhes-papel">
            {motorista ? <CarFront size={14} /> : <UserRound size={14} />}
            Você foi {motorista ? 'motorista' : 'passageiro'}
          </span>
        </div>
      </header>

      <section className="historico-detalhes-card historico-detalhes-trajeto">
        <div className="historico-detalhes-mapa" aria-hidden="true">
          <span><MapPin size={14} /> Trajeto</span>
          <svg viewBox="0 0 400 160" preserveAspectRatio="none">
            <path d="M20 120 C 100 40, 200 140, 380 40" />
            <circle cx="20" cy="120" r="7" />
            <circle cx="380" cy="40" r="7" />
          </svg>
        </div>
        <div className="historico-detalhes-trajeto-corpo">
          <h2>{detalhe.origem}<ArrowRight size={18} />{montarDestino(detalhe)}</h2>
          <div className="historico-detalhes-horarios">
            <Metrica icone={<CalendarDays />} rotulo="Data" valor={formatarData(detalhe.dataHoraSaida)} />
            <Metrica icone={<Clock />} rotulo="Saída" valor={formatarHora(detalhe.dataHoraSaida)} />
            <Metrica icone={<Clock />} rotulo="Chegada" valor={formatarHora(detalhe.dataHoraChegada)} />
          </div>
          {detalhe.paradas.length > 0 && <div className="historico-detalhes-paradas-bloco">
            <h3>Pontos de parada</h3>
            <ol className="historico-detalhes-paradas">
              {detalhe.paradas.map((parada, indice) => <li key={parada}><b>{indice + 1}</b><span>{parada}</span></li>)}
            </ol>
          </div>}
          <div className="historico-detalhes-valor">
            <span><DollarSign size={16} /> Valor por passageiro</span>
            <strong>{formatarMoeda(detalhe.valor)}</strong>
          </div>
        </div>
      </section>

      <section className="historico-detalhes-card">
        <h2 className="historico-detalhes-label">Motorista</h2>
        <div className="historico-detalhes-motorista">
          <Avatar pessoa={detalhe.motorista} />
          <div>
            <strong>{detalhe.motorista.nome}</strong>
            <span>
              <Star size={15} fill="currentColor" aria-hidden="true" />
              {formatarMedia(detalhe.motorista.avaliacao)}
            </span>
          </div>
          {detalhe.veiculo && <div className="historico-detalhes-veiculo">
            <strong>{detalhe.veiculo.modelo}</strong>
            <span>{[detalhe.veiculo.cor, detalhe.veiculo.placa].filter(Boolean).join(' · ')}</span>
          </div>}
        </div>
      </section>

      <section className="historico-detalhes-card">
        <div className="historico-detalhes-reservas-topo">
          <h2 className="historico-detalhes-label">Reservas ({detalhe.reservas.length})</h2>
          <span><Users size={15} /> {vagasOcupadas}/{totalVagas} vagas</span>
        </div>
        <ul className="historico-detalhes-reservas">
          {detalhe.reservas.map((reserva) => (
            <li key={reserva.id}>
              <Avatar pessoa={reserva} />
              <div>
                <strong>{reserva.nome}</strong>
                <span><Star size={13} fill="currentColor" /> {formatarMedia(reserva.avaliacao)}</span>
              </div>
              <em className={`historico-detalhes-reserva-status historico-detalhes-reserva-status--${String(reserva.status).toLowerCase()}`}>{rotuloStatusReserva(reserva.status)}</em>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function Metrica({ icone, rotulo, valor }) {
  return (
    <div>{icone}<span>{rotulo}</span><strong>{valor || '—'}</strong></div>
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

function formatarData(valor) {
  if (!valor) {
    return '';
  }

  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return valor;
  }

  return data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatarHora(valor) {
  if (!valor) return '';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return valor;
  return data.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function rotuloStatusReserva(status = '') {
  return /confirmada|finalizada/i.test(status) ? 'Confirmado' : status.charAt(0) + status.slice(1).toLowerCase();
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
