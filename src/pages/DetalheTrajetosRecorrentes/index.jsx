import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Logo from '../../components/common/Logo';
import {
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

  const [trajeto, setTrajeto] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarTrajeto();
  }, []);

  function carregarTrajeto() {
    const mock = {
      id,
      origem: 'Bodocongó',
      enderecoOrigem: 'Rua Aprígio Veloso, Bodocongó - Campina Grande/PB',
      destino: 'UFCG - Campus Sede',
      enderecoDestino: 'Av. Aprígio Veloso, 882 - Universitário, Campina Grande/PB',
      horario: '07:00',
      vagas: 3,
      preco: 5,
      dias: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'],
      quantidadeViagens: 42,
      ultimaViagem: '02/07/2026',
      historico: [
        { id: 1, data: '02/07', horario: '07:02', passageiros: 3, status: 'Finalizada' },
        { id: 2, data: '01/07', horario: '07:05', passageiros: 2, status: 'Finalizada' },
        { id: 3, data: '27/06', horario: '07:10', passageiros: 1, status: 'Cancelada' },
      ],
    };

    setTrajeto(mock);
    setLoading(false);
  }

  if (loading) {
    return (
      <main className="detalhe-page">
        <p>Carregando trajeto...</p>
      </main>
    );
  }

  return (
    <main className="detalhe-page">
      <header className="detalhe-header">
        <Logo />
        <button className="voltar-btn" onClick={() => navigate('/trajetos-recorrentes')}>
          ←
        </button>

        <div>
          <h1>Detalhes da rota</h1>
          <p>Rota #{trajeto.id}</p>
        </div>
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
          <strong>{trajeto.ultimaViagem}</strong>
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
        <RotateCcw size={14} /> Recriar viagem →
      </button>

      <section className="historico">

        <div className="historico-topo">
          <h2>Histórico de viagens</h2>
          <span>{trajeto.historico.length} registros</span>
        </div>

        {trajeto.historico.map((v) => (
          <div key={v.id} className="historico-item">

            <div className="historico-info">
              <strong>
                {v.data} • {v.horario}
              </strong>
              <p>
                {v.status === 'Finalizada'
                  ? `${v.passageiros} passageiro(s)`
                  : 'Viagem cancelada'}
              </p>
            </div>

            <span className={`status ${v.status === 'Finalizada' ? 'finalizada' : 'cancelada'}`}>
              {v.status === 'Finalizada' ? (
                <><CheckCircle2 size={12} /> Finalizada</>
              ) : (
                <><Repeat size={12} /> Cancelada</>
              )}
            </span>

          </div>
        ))}

      </section>

    </main>
  );
}

export default DetalheTrajetoRecorrente;