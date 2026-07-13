import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Plus, Repeat, RotateCcw } from 'lucide-react';
import { listarTrajetosRecorrentes } from '../../services/caronaService';
import { formatarData } from '../../utils/datas.js';
import './style.css';

// Um trajeto recorrente é derivado do histórico: o par origem→destino que o
// motorista já usou duas vezes ou mais (RN-TRJ-02). Não é uma entidade, então
// não há o que pausar nem excluir aqui — e ele descreve APENAS origem e destino
// (RN-TRJ-08). Horário, vagas e contribuição variam a cada viagem e vivem nas
// caronas do trajeto: quem os mostra, derivados do histórico, é a tela de
// detalhe.
function TrajetosRecorrentes() {
  const navigate = useNavigate();

  const [trajetos, setTrajetos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;

    async function carregarTrajetos() {
      try {
        const dados = await listarTrajetosRecorrentes();

        if (ativo) {
          setTrajetos(dados);
        }
      } catch (error) {
        if (ativo) {
          setErro(error.message || 'Não foi possível carregar seus trajetos.');
        }
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    }

    carregarTrajetos();

    return () => {
      ativo = false;
    };
  }, []);

  if (carregando) {
    return (
      <main className="trajetos-page">
        <p>Carregando trajetos...</p>
      </main>
    );
  }

  return (
    <main className="trajetos-page">
      <header className="trajetos-header">
        <div className="trajetos-title">
          <h1>Trajetos recorrentes</h1>
          <p>As rotas que você mais faz</p>
        </div>

        <button
          onClick={() => navigate('/ofertar-carona')}
          className="add-btn"
          aria-label="Ofertar carona"
        >
          <Plus size={14} />
        </button>
      </header>

      {erro && (
        <p className="trajetos-erro" role="alert">
          {erro}
        </p>
      )}

      {!erro && trajetos.length === 0 ? (
        <div className="trajetos-empty">
          <p>Você ainda não possui trajetos recorrentes.</p>
          <p>
            Uma rota aparece aqui depois que você faz a mesma viagem duas vezes.
          </p>
        </div>
      ) : (
        <section className="trajetos-lista">
          {trajetos.map((trajeto) => (
            <article key={trajeto.id} className="trajeto-card-recorrente">
              <div
                className="trajeto-click-area"
                role="link"
                tabIndex={0}
                aria-label={`Ver detalhes da rota ${trajeto.origem} para ${trajeto.destino}`}
                onClick={() => navigate(`/trajetos-recorrentes/${trajeto.id}`)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    navigate(`/trajetos-recorrentes/${trajeto.id}`);
                  }
                }}
              >
                <div className="trajeto-card-topo">
                  <span className="badge">
                    <Repeat size={10} />
                    {trajeto.quantidadeViagens}x realizadas
                  </span>
                </div>

                <div className="trajeto-rota">
                  <span>{trajeto.origem}</span>
                  <ArrowRight size={12} />
                  <span>{trajeto.destino}</span>
                </div>

                <div className="trajeto-ultima">
                  Última viagem em {formatarData(trajeto.ultimaUtilizacao)}
                </div>
              </div>

              <button
                className="trajeto-btn-primary"
                onClick={() =>
                  navigate('/ofertar-carona', {
                    state: { trajetoId: trajeto.id },
                  })
                }
              >
                <RotateCcw size={14} />
                Recriar viagem
              </button>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

export default TrajetosRecorrentes;
