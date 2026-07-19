import { useEffect, useState } from 'react';
import {
  ArrowRight,
  BellRing,
  CalendarDays,
  Clock,
  Loader2,
  MapPinOff,
  Trash2,
  X,
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import NavegacaoInferior from '../../components/layout/NavegacaoInferior.jsx';
import {
  listarInteresses,
  removerInteresse,
  registrarInteresse
} from '../../services/interesseService.js';

import './style.css';

function Interesses() {
  const [interesses, setInteresses] = useState([]);
  const [interesseSelecionado, setInteresseSelecionado] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const location = useLocation();
  const origemRecebida = location.state?.origem;
  const destinoRecebido = location.state?.destino;
  const origemCoordenadasRecebidas = location.state?.origemCoordenadas;
  const destinoCoordenadasRecebidas = location.state?.destinoCoordenadas;
  const [mostrarModalCriacao, setMostrarModalCriacao] = useState(Boolean(
    origemRecebida &&
    destinoRecebido &&
    origemCoordenadasRecebidas &&
    destinoCoordenadasRecebidas,
  ));
 
  useEffect(() => {
    carregarInteresses();
  }, []);

  async function carregarInteresses() {
    try {
      const dados = await listarInteresses();
      setInteresses(dados);
    } catch (erro) {
      alert(
        erro.message ||
          'Não foi possível carregar seus alertas.'
      );
    }
  }

  async function confirmarCriacao() {
    try {
        setCarregando(true);

        await registrarInteresse({
        origem: origemCoordenadasRecebidas,
        destino: destinoCoordenadasRecebidas,
        });

        await carregarInteresses();

        setMostrarModalCriacao(false);

        alert('Alerta criado com sucesso!');
    } catch (erro) {
        alert(
        erro.message ||
        'Não foi possível criar o alerta.'
        );
    } finally {
        setCarregando(false);
    }
  }

  async function confirmarRemocao() {
    if (!interesseSelecionado) return;

    try {
      setCarregando(true);

      await removerInteresse(interesseSelecionado.id);

      setInteresses((atuais) =>
        atuais.filter(
          (item) => item.id !== interesseSelecionado.id
        )
      );

      alert('Alerta removido com sucesso.');

      setInteresseSelecionado(null);
    } catch (erro) {
      alert(
        erro.message ||
          'Não foi possível remover o alerta.'
      );
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="interesses-page">
      <section className="interesses-shell">

        <header className="interesses-header">
          <div className="interesses-header-icon">
            <BellRing size={22} />
          </div>

          <div>
            <h1>Alertas de carona</h1>

            <p>
              {interesses.length}{' '}
              {interesses.length === 1
                ? 'trajeto monitorado'
                : 'trajetos monitorados'}
            </p>
          </div>
        </header>

        {interesses.length === 0 ? (
          <section className="interesses-vazio">
            <div className="interesses-vazio-icone">
              <MapPinOff size={28} />
            </div>

            <h2>Nenhum alerta ativo</h2>

            <p>
              Crie um alerta na busca para ser avisado
              quando surgir uma carona para seu trajeto.
            </p>
          </section>
        ) : (
          <section className="interesses-lista">
            {interesses.map((interesse) => (
              <article
                key={interesse.id}
                className="interesse-card"
              >
                <div className="interesse-info">

                  <div className="interesse-trajeto">
                    <span>{interesse.origem}</span>

                    <ArrowRight size={14} />

                    <span>{interesse.destino}</span>
                  </div>

                  <div className="interesse-meta">

                    <div className="interesse-meta">
                        <span>
                            <Clock size={12} />
                            {interesse.horario}
                        </span>

                        <span>
                            <CalendarDays size={12} />
                            Criado em {interesse.criadoEm}
                        </span>
                        </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="interesse-remover"
                  onClick={() =>
                    setInteresseSelecionado(interesse)
                  }
                >
                  <Trash2 size={16} />
                </button>

              </article>
            ))}
          </section>
        )}

      </section>

      <NavegacaoInferior />

      {interesseSelecionado && (
        <div
          className="interesse-modal-backdrop"
          onClick={() =>
            !carregando &&
            setInteresseSelecionado(null)
          }
        >
          <div
            className="interesse-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="interesse-modal-header">

              <h3>
                <Trash2 size={16} />
                Remover alerta
              </h3>

              <button
                type="button"
                onClick={() =>
                  !carregando &&
                  setInteresseSelecionado(null)
                }
              >
                <X size={16} />
              </button>

            </div>

            <p>
              Remover o alerta de{' '}
              <strong>
                {interesseSelecionado.origem}
              </strong>{' '}
              <ArrowRight
                size={13}
                style={{
                  display: 'inline',
                  verticalAlign: 'middle',
                }}
              />{' '}
              <strong>
                {interesseSelecionado.destino}
              </strong>
              ?
            </p>

            <p className="interesse-modal-texto">
              Você deixará de receber notificações
              para esse trajeto.
            </p>

            <div className="interesse-modal-botoes">

              <button
                type="button"
                className="cancelar"
                disabled={carregando}
                onClick={() =>
                  setInteresseSelecionado(null)
                }
              >
                Cancelar
              </button>

              <button
                type="button"
                className="remover"
                disabled={carregando}
                onClick={confirmarRemocao}
              >
                {carregando && (
                  <Loader2
                    size={16}
                    className="spin"
                  />
                )}

                {carregando
                  ? 'Removendo...'
                  : 'Remover'}
              </button>

            </div>

          </div>
        </div>
      )}

    {mostrarModalCriacao && (
    <div
        className="interesse-modal-backdrop"
        onClick={() =>
        !carregando &&
        setMostrarModalCriacao(false)
        }
    >
        <div
        className="interesse-modal"
        onClick={(e) => e.stopPropagation()}
        >
        <div className="interesse-modal-header">
            <h3>
            <BellRing size={16} />
            Criar alerta
            </h3>

            <button
            type="button"
            onClick={() =>
                setMostrarModalCriacao(false)
            }
            >
            <X size={16} />
            </button>
        </div>

        <p>
            Deseja criar um alerta para o trajeto
            <strong> {origemRecebida}</strong>
            <ArrowRight
            size={13}
            style={{
                display: 'inline',
                verticalAlign: 'middle',
            }}
            />
            <strong> {destinoRecebido}</strong>?
        </p>

        <p className="interesse-modal-texto">
            Você será notificado quando uma nova
            carona compatível for publicada.
        </p>

        <div className="interesse-modal-botoes">
            <button
            className="cancelar"
            onClick={() =>
                setMostrarModalCriacao(false)
            }
            >
            Cancelar
            </button>

            <button
            className="remover"
            onClick={confirmarCriacao}
            disabled={carregando}
            >
            {carregando && (
                <Loader2 size={16} className="spin" />
            )}

            {carregando
                ? 'Criando...'
                : 'Criar alerta'}
            </button>
        </div>
        </div>
    </div>
    )}
    </main>
  );
}

export default Interesses;
