import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Ban, CalendarDays, Car, ShieldCheck, Star } from 'lucide-react';
import NavegacaoInferior from '../../components/layout/NavegacaoInferior.jsx';
import { obterPerfilPublicoUsuario } from '../../services/publicProfileService.js';
import './style.css';

function PerfilPublico() {
  const { usuarioId } = useParams();
  const navigate = useNavigate();
  const [perfil, setPerfil] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;

    async function carregarPerfil() {
      try {
        setCarregando(true);
        setErro('');
        const dados = await obterPerfilPublicoUsuario(usuarioId);

        if (ativo) {
          setPerfil(dados);
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
  }, [usuarioId]);

  return (
    <main className="perfil-publico-page">
      <section className="perfil-publico-shell">
        <button type="button" className="perfil-publico-voltar" onClick={() => navigate(-1)}>
          <ArrowLeft size={19} aria-hidden="true" />
          Voltar
        </button>

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
                <Avatar nome={perfil.nome} />

                <div className="perfil-publico-identidade">
                  <h1>
                    {perfil.nome}
                    {perfil.verificado && <span>Verificado</span>}
                  </h1>
                  <p>{perfil.curso} • {perfil.instituicao}</p>
                  <strong>
                    <Star size={17} fill="currentColor" aria-hidden="true" />
                    {formatarMedia(perfil.avaliacao)}
                    <small>• {perfil.totalCaronas} caronas</small>
                  </strong>
                </div>
              </div>

              <p className="perfil-publico-bio">{perfil.biografia}</p>

              <div className="perfil-publico-metricas" aria-label="Resumo do usuário">
                <Metrica icon={Car} valor={perfil.totalCaronas} label="Caronas" />
                <Metrica icon={Star} valor={formatarMedia(perfil.avaliacao)} label="Avaliação" />
                <Metrica icon={CalendarDays} valor={perfil.membroDesde} label="Membro" />
              </div>

              <button type="button" className="perfil-publico-bloquear">
                <Ban size={20} aria-hidden="true" />
                Bloquear usuário
              </button>
            </section>

            <section className="perfil-publico-avaliacoes">
              <h2>Avaliações recentes</h2>
              {perfil.avaliacoes.map((avaliacao) => (
                <article key={avaliacao.id} className="perfil-publico-avaliacao">
                  <div>
                    <strong>{avaliacao.autor}</strong>
                    <p>{avaliacao.comentario}</p>
                    <time>{avaliacao.data}</time>
                  </div>
                  <span>
                    <Star size={16} fill="currentColor" aria-hidden="true" />
                    {avaliacao.nota}
                  </span>
                </article>
              ))}
            </section>
          </>
        )}
      </section>

      <NavegacaoInferior />
    </main>
  );
}

function Avatar({ nome }) {
  return (
    <div className="perfil-publico-avatar">
      {nome.trim()[0]?.toUpperCase() || 'U'}
      <span aria-label="Usuário verificado">
        <ShieldCheck size={16} />
      </span>
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
