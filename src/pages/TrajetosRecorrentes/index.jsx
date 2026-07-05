import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../../components/common/Logo';
import './style.css';
import { listarTrajetosRecorrentes } from '../../services/caronaService';
import { Plus, Pause, Play, Trash2, Repeat } from "lucide-react";

function TrajetosRecorrentes() {
  const navigate = useNavigate();

  const [trajetos, setTrajetos] = useState([]);
  const [loading, setLoading] = useState(true);

  const toggleAtivo = (id) => {
    setTrajetos((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, active: !t.active } : t
      )
    );
  };

  const deletar = (id) => {
    setTrajetos((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    carregarTrajetos();
  }, []);

  async function carregarTrajetos() {
    try {
      const dados = await listarTrajetosRecorrentes();

      setTrajetos(
        dados.map((t) => ({
          ...t,
          active: t.active ?? true,
        }))
      );
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

        <div>
          <h1>Caronas recorrentes</h1>
          <h3>Publicadas automaticamente nos dias selecionados</h3>
        </div>

        <button
          onClick={() => navigate("/ofertar-carona")}
          className="add-btn"
        >
          <Plus size={14} />
        </button>
      </header>

      {trajetos.length === 0 ? (
        <div className="trajetos-empty">
          <p>Você ainda não possui trajetos recorrentes.</p>
          <p>Eles aparecerão aqui conforme você criar e finalizar caronas!</p>
        </div>
      ) : (
        <section className="trajetos-lista">

          {trajetos.map((trajeto) => (
            <article key={trajeto.id} className="trajeto-card-recorrente">

              <div
                className="trajeto-click-area"
                onClick={() =>
                  navigate(`/trajetos-recorrentes/${trajeto.id}`)
                }
              >

                <div className="trajeto-card-topo">
                  <span className={`badge ${trajeto.active ? "ativo" : "inativo"}`}>
                    <Repeat size={10} />
                    {trajeto.active ? " Ativa" : " Pausada"}
                  </span>

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

                <div className="trajeto-days">
                  {["Seg", "Ter", "Qua", "Qui", "Sex"].map((d) => (
                    <span key={d} className="day-chip">{d}</span>
                  ))}
                </div>

              </div>

              <div
                className="trajeto-actions"
                onClick={(e) => e.stopPropagation()}
              >

                <button
                  className="trajeto-btn-secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleAtivo(trajeto.id);
                  }}
                >
                  {trajeto.active ? (
                    <>
                      <Pause size={14} /> Pausar
                    </>
                  ) : (
                    <>
                      <Play size={14} /> Ativar
                    </>
                  )}
                </button>

                <button
                  className="trajeto-btn-danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    deletar(trajeto.id);
                  }}
                >
                  <Trash2 size={14} />
                </button>

              </div>

            </article>
          ))}

        </section>
      )}
    </main>
  );
}

export default TrajetosRecorrentes;