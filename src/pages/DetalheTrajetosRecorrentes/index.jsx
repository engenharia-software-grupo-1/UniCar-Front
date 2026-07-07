import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  Clock,
  Users,
  DollarSign,
  TrendingUp,
  Calendar,
  CheckCircle2,
  RotateCcw,
  Repeat
} from "lucide-react";
import './style.css';

function DetalheTrajetoRecorrente() {
  const navigate = useNavigate();
  const { id } = useParams();

  const trajeto = {
    id,
    origem: 'Bodocongó',
    enderecoOrigem: 'Rua Aprígio Veloso, Bodocongó - Campina Grande/PB',
    destino: 'UFCG - Campus Sede',
    enderecoDestino: 'Av. Aprígio Veloso, 882 - Universitário, Campina Grande/PB',
    horario: '07:00',
    vagas: 3,
    preco: 5,
    active: true,
    dias: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'],
    quantidadeViagens: 42,
    ultimaViagem: '02/07/2026',
    historico: [
      { id: 1, data: '02/07', horario: '07:02', passageiros: 3, status: 'Finalizada' },
      { id: 2, data: '01/07', horario: '07:05', passageiros: 2, status: 'Finalizada' },
      { id: 3, data: '30/06', horario: '07:00', passageiros: 3, status: 'Finalizada' },
      { id: 4, data: '27/06', horario: '07:10', passageiros: 1, status: 'Cancelada' },
      { id: 5, data: '26/06', horario: '07:00', passageiros: 3, status: 'Finalizada' },
      { id: 6, data: '25/06', horario: '07:04', passageiros: 2, status: 'Finalizada' },
    ],
  };

  return (
    <main className="detalhe-page">
      <header className="detalhe-header">
        <button className="voltar-btn" onClick={() => navigate('/trajetos-recorrentes')}>
          <ArrowLeft size={16} />
        </button>

        <div className="detalhe-title">
          <h1>Detalhes da rota</h1>
          <p>Rota recorrente #{trajeto.id}</p>
        </div>

        <span className={`badge-status ${trajeto.active ? 'ativo' : 'pausado'}`}>
          <Repeat size={12} />
          {trajeto.active ? 'Ativa' : 'Pausada'}
        </span>
      </header>

      <section className="card-principal">

        <div className="local-row">
        <div className="icon">
            <MapPin size={14} />
        </div>

        <div className="text">
            <h3>Origem</h3>
            <strong>{trajeto.origem}</strong>
            <p>{trajeto.enderecoOrigem}</p>
        </div>
        </div>

        <div className="linha"></div>

        <div className="local-row">
        <div className="icon destination">
            <MapPin size={14} />
        </div>

        <div className="text">
            <h3>Destino</h3>
            <strong>{trajeto.destino}</strong>
            <p>{trajeto.enderecoDestino}</p>
        </div>
        </div>

        <div className="info-viagem">
          <span><Clock size={14} /> {trajeto.horario}</span>
          <span><Users size={14} /> {trajeto.vagas} vagas</span>
          <span><DollarSign size={14} /> R$ {trajeto.preco}</span>
          {trajeto.dias.map((dia) => (
            <span key={dia} className="dia-chip">{dia}</span>
          ))}
        </div>

      </section>

      <section className="metricas">
        <div className="metrica-card">
          <span><TrendingUp size={14} /> Total de viagens</span>
          <strong>{trajeto.quantidadeViagens}</strong>
          <small>realizadas nesse trajeto</small>
        </div>

        <div className="metrica-card">
          <span><Calendar size={14} /> Última viagem</span>
          <strong>{trajeto.ultimaViagem.slice(0, 5)}</strong>
          <small>{trajeto.ultimaViagem}</small>
        </div>
      </section>

      <button
        className="recriar-btn"
        onClick={() =>
          navigate("/ofertar-carona", {
            state: { trajetoId: trajeto.id },
          })
        }
      >
        <RotateCcw size={16} />
        Recriar viagem
        <ArrowRight size={16} />
      </button>

      <section className="historico">

        <div className="historico-topo">
          <h2>Histórico de viagens</h2>
          <span>{trajeto.historico.length} registros</span>
        </div>

        <div className="historico-lista">
          {trajeto.historico.map((v) => (
            <div key={v.id} className="historico-item">

              <div className={`historico-icon ${v.status === 'Finalizada' ? 'finalizada' : 'cancelada'}`}>
                {v.status === 'Finalizada' ? <CheckCircle2 size={16} /> : <Repeat size={16} />}
              </div>

              <div className="historico-info">
                <strong>
                  {v.data} • {v.horario}
                </strong>
                <p>
                  {v.status === 'Finalizada'
                    ? `${v.passageiros} passageiro(s)`
                    : 'Cancelada'}
                </p>
              </div>

              <span className={`status ${v.status === 'Finalizada' ? 'finalizada' : 'cancelada'}`}>
                {v.status.toLowerCase()}
              </span>

            </div>
          ))}
        </div>

      </section>

    </main>
  );
}

export default DetalheTrajetoRecorrente;
