import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './style.css';
import { listarTrajetosRecorrentes } from '../../services/caronaService';
import { ArrowRight, Plus, Pause, Play, Trash2, Repeat } from "lucide-react";
import Confirmacao from '../../components/common/Confirmacao.jsx';

const defaultsPorTrajeto = {
  1: { horario: '07:00', dias: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'], vagas: 3, preco: 5 },
  2: { horario: '18:30', dias: ['Seg', 'Qua'], vagas: 2, preco: 6 },
  3: { horario: '13:00', dias: ['Ter', 'Qui'], vagas: 4, preco: 7 },
};

const fallbackTrajeto = { horario: '07:00', dias: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'], vagas: 3, preco: 5 };

function TrajetosRecorrentes() {
  const navigate = useNavigate();

  const [trajetos, setTrajetos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trajetoParaExcluir, setTrajetoParaExcluir] = useState(null);

  const toggleAtivo = (id) => {
    setTrajetos((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, active: !t.active } : t
      )
    );
  };

  const confirmarExclusao = () => {
    if (!trajetoParaExcluir) return;

    setTrajetos((prev) => prev.filter((t) => t.id !== trajetoParaExcluir.id));
    setTrajetoParaExcluir(null);
  };

  useEffect(() => {
    let ativo = true;

    async function carregarTrajetos() {
      try {
        const dados = await listarTrajetosRecorrentes();

        if (!ativo) return;

        setTrajetos(
          dados.map((t) => ({
            ...fallbackTrajeto,
            ...defaultsPorTrajeto[t.id],
            ...t,
            preco: t.preco ?? t.price ?? t.valorContribuicao ?? defaultsPorTrajeto[t.id]?.preco ?? fallbackTrajeto.preco,
            vagas: t.vagas ?? t.seats ?? t.quantidadeVagas ?? defaultsPorTrajeto[t.id]?.vagas ?? fallbackTrajeto.vagas,
            active: t.active ?? true,
          }))
        );
      } catch {
        console.error('Erro ao carregar trajetos');
      } finally {
        if (ativo) {
          setLoading(false);
        }
      }
    }

    carregarTrajetos();

    return () => {
      ativo = false;
    };
  }, []);

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
        <div className="trajetos-title">
          <h1>Caronas recorrentes</h1>
          <p>Publicadas automaticamente nos dias selecionados</p>
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
                role="link"
                tabIndex={0}
                aria-label={`Ver detalhes da rota ${trajeto.origem} para ${trajeto.destino}`}
                onClick={() =>
                  navigate(`/trajetos-recorrentes/${trajeto.id}`)
                }
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    navigate(`/trajetos-recorrentes/${trajeto.id}`);
                  }
                }}
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
                  <ArrowRight size={12} />
                  <span>{trajeto.destino}</span>
                </div>

                <div className="trajeto-info">
                  {trajeto.horario} • {trajeto.vagas} vagas
                </div>

                <div className="trajeto-days">
                  {trajeto.dias.map((d) => (
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
                  aria-label={`Excluir carona recorrente de ${trajeto.origem} para ${trajeto.destino}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setTrajetoParaExcluir(trajeto);
                  }}
                >
                  <Trash2 size={14} />
                </button>

              </div>

            </article>
          ))}

        </section>
      )}

      <Confirmacao
        open={Boolean(trajetoParaExcluir)}
        title="Excluir carona recorrente"
        message={
          trajetoParaExcluir
            ? `Deseja mesmo excluir a carona recorrente ${trajetoParaExcluir.origem} → ${trajetoParaExcluir.destino}? Esta ação não pode ser desfeita.`
            : ''
        }
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        danger
        onConfirm={confirmarExclusao}
        onCancel={() => setTrajetoParaExcluir(null)}
      />
    </main>
  );
}

export default TrajetosRecorrentes;
