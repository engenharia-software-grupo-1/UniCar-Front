import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../../components/common/Logo';
import './style.css';
import { listarTrajetosRecorrentes } from '../../services/caronaService';

function TrajetosRecorrentes() {
  const navigate = useNavigate();

  const [trajetos, setTrajetos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarTrajetos();
  }, []);

  async function carregarTrajetos() {
    try {
      const dados = await listarTrajetosRecorrentes();
      setTrajetos(dados);
    } catch (error) {
      console.error('Erro ao carregar trajetos');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="trajetos-page">
        <p>Carregando trajetos...</p>
      </main>
    );
  }

  return (
    <main className="trajetos-page">
      <header className="trajetos-header">
        <Logo />
        <h1>Trajetos recorrentes</h1>
      </header>

      {trajetos.length === 0 ? (
        <div className="trajetos-empty">
          <p>Você ainda não possui trajetos recorrentes.</p>
          <p>
            Eles aparecerão aqui conforme você criar e finalizar caronas!
          </p>
        </div>
      ) : (
        <section className="trajetos-lista">
          {trajetos.map((trajeto) => (
            <article key={trajeto.id} className="trajeto-card-recorrente">

              <div className="trajeto-card-topo">
                <span className="badge ativo">Ativa</span>

                <span className="preco">
                  R$ {trajeto.price ?? 5}
                </span>
              </div>

              <div className="trajeto-rota">
                <span>{trajeto.origem}</span>
                <span>→</span>
                <span>{trajeto.destino}</span>
              </div>

              <div className="trajeto-info">
                07:00 • 3 vagas
              </div>

              <div className="trajeto-dias">
                {["Seg", "Ter", "Qua", "Qui", "Sex"].map((d) => (
                  <span key={d} className="dia-chip">{d}</span>
                ))}
              </div>

              <button
                className="trajeto-btn"
                onClick={() =>
                  navigate(`/trajetos-recorrentes/${trajeto.id}`)
                }
              >
                Visualizar
              </button>

            </article>
          ))}
        </section>
      )}
    </main>
  );
}

export default TrajetosRecorrentes;