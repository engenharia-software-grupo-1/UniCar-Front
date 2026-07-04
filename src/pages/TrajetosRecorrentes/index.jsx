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
        setErro('Não foi possível carregar os trajetos.');
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
          <p>
            Você ainda não possui trajetos recorrentes.
          </p>

          <p>
            Eles aparecerão aqui conforme você criar e finalizar caronas!
          </p>
        </div>
      ) : (
        <section className="trajetos-lista">
          {trajetos.map((trajeto) => (
            <article key={trajeto.id} className="trajeto-card">
              <h2>
                {trajeto.origem} → {trajeto.destino}
              </h2>

              <p>
                {trajeto.quantidadeViagens} viagens realizadas
              </p>

              <button
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