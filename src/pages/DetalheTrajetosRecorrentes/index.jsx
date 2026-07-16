import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  MapPin,
  Clock,
  Users,
  DollarSign,
  TrendingUp,
  Calendar,
  CheckCircle2,
  RotateCcw,
  Repeat,
} from 'lucide-react';
import {
  listarCaronasDoTrajeto,
  obterTrajetoRecorrente,
} from '../../services/caronaService.js';
import { formatarData, formatarHorario } from '../../utils/datas.js';
import './style.css';

// Indexado por Date#getDay() (0 = domingo).
const DIAS_POR_INDICE = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// Ordem de exibição, igual à do formulário de ofertar: a semana começa na segunda.
const ORDEM_DA_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

const STATUS = {
  CRIADA: { rotulo: 'Aguardando', concluida: false },
  EM_ANDAMENTO: { rotulo: 'Em andamento', concluida: false },
  FINALIZADA: { rotulo: 'Finalizada', concluida: true },
  CANCELADA: { rotulo: 'Cancelada', concluida: false },
  EXPIRADA: { rotulo: 'Expirada', concluida: false },
};

function DetalheTrajetoRecorrente() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [trajeto, setTrajeto] = useState(null);
  const [viagens, setViagens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        setCarregando(true);
        setErro('');

        const recorrente = await obterTrajetoRecorrente(id);

        if (!ativo) {
          return;
        }

        // O trajeto só descreve origem e destino (RN-TRJ-08); horários, vagas,
        // contribuição e histórico saem das caronas daquele par origem→destino.
        const caronas = await listarCaronasDoTrajeto(
          recorrente.origem,
          recorrente.destino,
        );

        if (!ativo) {
          return;
        }

        setTrajeto(recorrente);
        setViagens(caronas);
      } catch (error) {
        if (ativo) {
          setErro(error.message || 'Não foi possível carregar o trajeto.');
        }
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    }

    carregar();

    return () => {
      ativo = false;
    };
  }, [id]);

  if (carregando) {
    return (
      <main className="detalhe-page">
        <p className="detalhe-estado">Carregando o trajeto...</p>
      </main>
    );
  }

  if (erro || !trajeto) {
    return (
      <main className="detalhe-page">
        <p className="detalhe-estado" role="alert">
          {erro || 'Trajeto recorrente não encontrado.'}
        </p>

        <button
          type="button"
          className="recriar-btn"
          onClick={() => navigate('/trajetos-recorrentes')}
        >
          Voltar para os trajetos
        </button>
      </main>
    );
  }

  // A última viagem é a referência do trajeto: é dela que saem o horário, as
  // vagas e a contribuição mostrados aqui — e é ela que o formulário sugere ao
  // recriar. Esses valores variam entre viagens, então nunca são "do trajeto".
  const ultima = viagens[0];
  const diasUtilizados = diasDaSemanaDasViagens(viagens);

  return (
    <main className="detalhe-page">
      <header className="detalhe-header">
        <div className="detalhe-title">
          <h1>Detalhes da rota</h1>
          <p>Rota recorrente #{trajeto.id}</p>
        </div>

        <span className="badge-status ativo">
          <Repeat size={12} />
          {trajeto.quantidadeViagens}x
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
          </div>
        </div>

        {ultima && (
          <div className="info-viagem">
            <span>
              <Clock size={14} /> {formatarHorario(ultima.dataHoraSaida)}
            </span>
            <span>
              <Users size={14} /> {ultima.quantidadeVagas} vagas
            </span>
            <span>
              <DollarSign size={14} /> R$ {ultima.valorContribuicao}
            </span>
            {diasUtilizados.map((dia) => (
              <span key={dia} className="dia-chip">
                {dia}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="metricas">
        <div className="metrica-card">
          <span>
            <TrendingUp size={14} /> Total de viagens
          </span>
          <strong>{trajeto.quantidadeViagens}</strong>
          <small>realizadas nesse trajeto</small>
        </div>

        <div className="metrica-card">
          <span>
            <Calendar size={14} /> Última viagem
          </span>
          <strong>{formatarData(trajeto.ultimaUtilizacao)}</strong>
          <small>desde {formatarData(trajeto.primeiraUtilizacao)}</small>
        </div>
      </section>

      <button
        className="recriar-btn"
        onClick={() =>
          navigate('/ofertar-carona', {
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
          <span>
            {viagens.length} {viagens.length === 1 ? 'registro' : 'registros'}
          </span>
        </div>

        <div className="historico-lista">
          {viagens.map((viagem) => {
            const status = STATUS[viagem.status] || {
              rotulo: viagem.status,
              concluida: false,
            };

            return (
              <div key={viagem.id} className="historico-item">
                <div
                  className={`historico-icon ${status.concluida ? 'finalizada' : 'cancelada'}`}
                >
                  {status.concluida ? <CheckCircle2 size={16} /> : <Repeat size={16} />}
                </div>

                <div className="historico-info">
                  <strong>
                    {formatarData(viagem.dataHoraSaida)} •{' '}
                    {formatarHorario(viagem.dataHoraSaida)}
                  </strong>
                  <p>
                    {status.concluida
                      ? `${viagem.passageirosConfirmados ?? 0} passageiro(s)`
                      : status.rotulo}
                  </p>
                </div>

                <span
                  className={`status ${status.concluida ? 'finalizada' : 'cancelada'}`}
                >
                  {status.rotulo.toLowerCase()}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}

// Dias em que o trajeto se repete, na ordem da semana. A recorrência não é um
// campo da carona: ao ofertar, os dias marcados viram uma carona por data. Logo
// os dias do trajeto são o dia da semana em que suas viagens de fato acontecem.
function diasDaSemanaDasViagens(viagens) {
  const observados = new Set();

  viagens.forEach((viagem) => {
    const data = new Date(viagem.dataHoraSaida);

    if (!Number.isNaN(data.getTime())) {
      observados.add(DIAS_POR_INDICE[data.getDay()]);
    }
  });

  return ORDEM_DA_SEMANA.filter((dia) => observados.has(dia));
}

export default DetalheTrajetoRecorrente;
