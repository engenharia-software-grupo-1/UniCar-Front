import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Logo from '../../components/common/Logo';
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
    // dados mockados

    const mock = {
      id,
      origem: 'Bodocongó',
      enderecoOrigem:
        'Rua Aprígio Veloso, Bodocongó - Campina Grande/PB',
      destino: 'UFCG - Campus Sede',
      enderecoDestino:
        'Av. Aprígio Veloso, 882 - Universitário, Campina Grande/PB',
      horario: '07:00',
      vagas: 3,
      preco: 5,
      dias: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'],
      quantidadeViagens: 42,
      ultimaViagem: '02/07/2026',
      historico: [
        {
          id: 1,
          data: '02/07',
          horario: '07:02',
          passageiros: 3,
          status: 'Finalizada',
        },
        {
          id: 2,
          data: '01/07',
          horario: '07:05',
          passageiros: 2,
          status: 'Finalizada',
        },
        {
          id: 3,
          data: '30/06',
          horario: '07:00',
          passageiros: 3,
          status: 'Finalizada',
        },
        {
          id: 4,
          data: '27/06',
          horario: '07:10',
          passageiros: 1,
          status: 'Cancelada',
        },
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
        <button
          className="voltar-btn"
          onClick={() => navigate('/trajetos-recorrentes')}
        >
          ←
        </button>

        <div>
          <h1>Detalhes da rota</h1>
          <p>Rota #{trajeto.id}</p>
        </div>
      </header>

      <section className="card-principal">
        <div className="local">
          <h3>Origem</h3>
          <strong>{trajeto.origem}</strong>
          <p>{trajeto.enderecoOrigem}</p>
        </div>

        <div className="linha"></div>
        <div className="local">
          <h3>Destino</h3>
          <strong>{trajeto.destino}</strong>
          <p>{trajeto.enderecoDestino}</p>
        </div>

        <div className="info-viagem">
          <span>{trajeto.horario}</span>
          <span>{trajeto.vagas} vagas</span>
          <span>R$ {trajeto.preco}</span>
        </div>

        <div className="dias">
          {trajeto.dias.map((dia) => (
            <span
              key={dia}
              className="dia-chip"
            >
              {dia}
            </span>
          ))}
        </div>

      </section>
      <section className="metricas">
        <div className="metrica-card">
          <span>Total de viagens</span>
          <strong>{trajeto.quantidadeViagens}</strong>
          <small>realizadas nesse trajeto</small>
        </div>

        <div className="metrica-card">
          <span>Última viagem</span>
          <strong>{trajeto.ultimaViagem}</strong>
        </div>
      </section>

      <button
        className="recriar-btn"
        onClick={() =>
          navigate('/ofertar', {
            state: {
              trajetoId: trajeto.id,
            },
          })
        }
      >
        Recriar viagem →
      </button>
      <section className="historico">
        <div className="historico-topo">
          <h2>Histórico de viagens</h2>
          <span>
            {trajeto.historico.length} registros
          </span>

        </div>
        {trajeto.historico.map((viagem) => (
          <div
            key={viagem.id}
            className="historico-item"
          >
            <div className="historico-info">
              <strong>
                {viagem.data} • {viagem.horario}
              </strong>
              <p>
                {viagem.status === 'Finalizada'
                  ? `${viagem.passageiros} passageiro(s)`
                  : 'Viagem cancelada'}
              </p>
            </div>

            <span
              className={
                viagem.status === 'Finalizada'
                  ? 'status finalizada'
                  : 'status cancelada'
              }
            >
              {viagem.status}
            </span>
          </div>

        ))}

      </section>

    </main>
  );
}

export default DetalheTrajetoRecorrente;