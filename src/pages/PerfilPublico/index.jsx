import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { CalendarDays, Car, ShieldCheck, Star } from 'lucide-react';
import BlockUserButton from '../Perfil/BlockUserButton.jsx';
import ConfirmBlockModal from '../Perfil/ConfirmBlockModal.jsx';
import { bloquearUsuario } from '../../services/blockUserService.js';
import { obterPerfilPublicoUsuario } from '../../services/publicProfileService.js';
import './style.css';

function PerfilPublico() {
  const { usuarioId } = useParams();
  const location = useLocation();
  const [perfil, setPerfil] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [modalBloqueioAberto, setModalBloqueioAberto] = useState(false);
  const [bloqueando, setBloqueando] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    let ativo = true;

    async function carregarPerfil() {
      try {
        setCarregando(true);
        setErro('');
        const dados = await obterPerfilPublicoUsuario(usuarioId);

        if (ativo) {
          const perfilFallback = location.state?.perfilFallback;
          setPerfil(
            dados.nome === 'Usuário UniCar' && perfilFallback
              ? {
                  ...dados,
                  id: perfilFallback.id ?? dados.id,
                  nome: perfilFallback.nome ?? dados.nome,
                  curso: perfilFallback.curso ?? dados.curso,
                  avaliacao: perfilFallback.avaliacao ?? dados.avaliacao,
                }
              : dados,
          );
        }
      } catch (error) {
        if (ativo) {
          setErro(error.message || 'Nao foi possivel carregar o perfil.');
        }
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    }

    carregarPerfil();

    return () => {
      ativo = false;
    };
  }, [usuarioId, location.state]);

  useEffect(() => {
    if (!feedback) return undefined;

    const timeout = window.setTimeout(() => setFeedback(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  async function confirmarBloqueio() {
    try {
      setBloqueando(true);
      const resultado = await bloquearUsuario(perfil.id);

      setPerfil((perfilAtual) => ({ ...perfilAtual, isBlocked: true }));
      setModalBloqueioAberto(false);
      setFeedback({
        tipo: 'sucesso',
        mensagem: resultado.alreadyBlocked
          ? 'Este usuário já estava bloqueado.'
          : 'Usuário bloqueado com sucesso',
      });
    } catch (error) {
      setModalBloqueioAberto(false);
      setFeedback({ tipo: 'erro', mensagem: mensagemErroBloqueio(error) });
    } finally {
      setBloqueando(false);
    }
  }

  return (
    <main className="perfil-publico-page">
      <section className="perfil-publico-shell">
        {carregando ? (
          <p className="perfil-publico-state">Carregando perfil...</p>
        ) : erro ? (
          <p className="perfil-publico-state perfil-publico-state--erro" role="alert">
            {erro}
          </p>
        ) : (
          <>
            <section className="perfil-publico-card" aria-label={`Perfil de ${perfil.nome}`}>
              <div className="perfil-publico-header">
                <Avatar fotoUrl={perfil.fotoUrl} nome={perfil.nome} verificado={perfil.verificado} />

                <div className="perfil-publico-identidade">
                  <h1>
                    {perfil.nome}
                    {perfil.verificado && <span>Verificado</span>}
                  </h1>
                  <p>{perfil.curso}</p>
                  <strong>
                    <Star size={17} fill="currentColor" aria-hidden="true" />
                    {formatarMedia(perfil.avaliacao)}
                    <small>• {perfil.quantidadeCaronas} caronas</small>
                  </strong>
                </div>
              </div>

              <p className="perfil-publico-bio">{perfil.biografia}</p>

              <div className="perfil-publico-metricas" aria-label="Resumo do usuário">
                <Metrica icon={Car} valor={perfil.quantidadeCaronas} label="Caronas" />
                <Metrica icon={Star} valor={formatarMedia(perfil.avaliacao)} label="Avaliação" />
                <Metrica icon={CalendarDays} valor={perfil.membroDesde} label="Membro" />
              </div>

              <BlockUserButton
                isBlocked={perfil.isBlocked}
                loading={bloqueando}
                onClick={() => setModalBloqueioAberto(true)}
              />
            </section>

            <section className="perfil-publico-avaliacoes">
              <h2>Avaliações recentes</h2>

              {perfil.avaliacoes.length === 0 ? (
                <p className="perfil-publico-sem-avaliacoes">
                  Este usuário ainda não recebeu avaliações.
                </p>
              ) : (
                perfil.avaliacoes.map((avaliacao) => (
                 <article className="perfil-publico-avaliacao">
                  <div className="perfil-publico-avaliacao-topo">
                    <div className="perfil-publico-avaliacao-nota">
                      <Star size={16} fill="currentColor" />
                      <span>{avaliacao.nota.toFixed(1)}</span>
                    </div>

                    <time dateTime={avaliacao.dataAvaliacao}>
                      {formatarData(avaliacao.dataAvaliacao)}
                    </time>
                  </div>

                  <strong className="perfil-publico-avaliador">
                    {avaliacao.avaliador.nome}
                  </strong>

                  {avaliacao.comentario && (
                    <p className="perfil-publico-comentario">
                      {avaliacao.comentario}
                    </p>
                  )}
                </article>
                ))
              )}
            </section>
          </>
        )}
      </section>

      <ConfirmBlockModal
        open={modalBloqueioAberto}
        userName={perfil?.nome}
        loading={bloqueando}
        onConfirm={confirmarBloqueio}
        onCancel={() => setModalBloqueioAberto(false)}
      />

      {feedback && (
        <div
          className={`perfil-publico-toast perfil-publico-toast--${feedback.tipo}`}
          role={feedback.tipo === 'erro' ? 'alert' : 'status'}
          aria-live="polite"
        >
          {feedback.mensagem}
        </div>
      )}
    </main>
  );
}

function formatarData(valor) {
  if (!valor) return '';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return valor;
  return data.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function mensagemErroBloqueio(error) {
  if (error?.status === 409) return 'Este usuário já está bloqueado.';
  if (error?.status >= 500) return 'Não foi possível bloquear o usuário agora. Tente novamente.';
  if (/conectar|network|fetch/i.test(error?.message || '')) {
    return 'Não foi possível conectar ao servidor. Verifique sua conexão.';
  }
  return error?.message || 'Não foi possível bloquear o usuário.';
}

function Avatar({ fotoUrl, nome, verificado }) {
  return (
    <div className="perfil-publico-avatar">
      {fotoUrl ? <img src={fotoUrl} alt={`Foto de ${nome}`} /> : nome.trim()[0]?.toUpperCase() || 'U'}
      {verificado && <span aria-label="Usuário verificado">
        <ShieldCheck size={16} />
      </span>}
    </div>
  );
}

function Metrica({ icon: Icon, valor, label }) {
  return (
    <div className="perfil-publico-metrica">
      <Icon size={20} aria-hidden="true" />
      <strong>{valor}</strong>
      <span>{label}</span>
    </div>
  );
}

function formatarMedia(valor) {
  const numero = Number(valor);

  if (!Number.isFinite(numero) || numero <= 0) {
    return '0';
  }

  return numero.toLocaleString('pt-BR', {
    minimumFractionDigits: Number.isInteger(numero) ? 0 : 1,
    maximumFractionDigits: 1,
  });
}

export default PerfilPublico;
