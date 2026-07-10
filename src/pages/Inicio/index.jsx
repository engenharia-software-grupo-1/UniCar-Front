import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bell,
  CalendarX,
  CalendarDays,
  CarFront,
  MapPin,
  Sparkles,
  Star,
  UserRound,
} from 'lucide-react';
import Logo from '../../components/common/Logo.jsx';
import NavegacaoInferior from '../../components/layout/NavegacaoInferior.jsx';
import { getSession } from '../../services/authService.js';
import { getPerfilUsuarioAutenticado } from '../../services/profileService.js';
import {
  buscarProximaCarona,
  buscarSugestoesDeCaronas,
} from '../../services/caronaService.js';
import './style.css';

function Inicio() {
  const [usuario, setUsuario] = useState(() => getSession()?.usuario || {});
  const [proximaCarona, setProximaCarona] = useState(null);
  const [sugestoes, setSugestoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const nome = getPrimeiroNome(usuario.nomeCompleto || usuario.nome);
  const motoristaExibido = getMotoristaExibido(proximaCarona, usuario);

  useEffect(() => {
    let ativo = true;

    async function carregarDados() {
      try {
        setCarregando(true);
        setErro('');

        const [perfil, proxima, listaSugestoes] = await Promise.all([
          getPerfilUsuarioAutenticado(),
          buscarProximaCarona().catch(() => null),
          buscarSugestoesDeCaronas().catch(() => []),
        ]);

        if (!ativo) {
          return;
        }

        setUsuario(perfil);
        setProximaCarona(proxima);
        setSugestoes(listaSugestoes);
      } catch (error) {
        if (ativo) {
          setErro(error.message || 'Não foi possível carregar seus dados.');
        }
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    }

    carregarDados();

    return () => {
      ativo = false;
    };
  }, []);

  return (
    <main className="inicio-page">
      <header className="inicio-topbar">
        <Link to="/inicio" className="inicio-logo" aria-label="UniCar">
          <Logo />
        </Link>

        <button type="button" className="inicio-notification" aria-label="Notificações">
          <Bell size={24} />
          <span />
        </button>
      </header>

      <section className="inicio-shell">
        <div className="inicio-greeting">
          <span>Olá,</span>
          <h1>
            {nome}
          </h1>
        </div>

        {erro && (
          <div className="inicio-message" role="alert">
            {erro}
          </div>
        )}

        <section className={`inicio-next-ride ${proximaCarona ? '' : 'inicio-next-ride--empty'}`} aria-labelledby="proxima-carona">
          {proximaCarona ? (
            <Link to={`/minhas-caronas/${proximaCarona.id}`} className="inicio-next-card-link">
              <div className="inicio-next-heading">
                <p id="proxima-carona" className="inicio-card-label">
                  <Sparkles size={18} />
                  Próxima carona
                </p>
                <span className="inicio-next-role">
                  {proximaCarona.papel === 'MOTORISTA' ? <CarFront size={14} /> : <UserRound size={14} />}
                  Você é {proximaCarona.papel === 'MOTORISTA' ? 'motorista' : 'passageiro'}
                </span>
              </div>

              <div className="inicio-next-content">
                <div>
                  <div className="inicio-next-schedule">
                    <strong className="inicio-next-time">{formatarHorario(proximaCarona.horario)}</strong>
                    <span className="inicio-next-date"><CalendarDays size={14} />{formatarData(proximaCarona.horario)}</span>
                  </div>
                <div className="inicio-next-route">
                    {proximaCarona.origem || 'Origem não informada'} → {proximaCarona.destino || 'Destino não informado'}
                </div>
                </div>

                {proximaCarona.papel !== 'MOTORISTA' && <div className="inicio-driver">
                <div className="inicio-driver-avatar" aria-label={`Motorista: ${motoristaExibido.nome}`}>
                  {motoristaExibido.fotoUrl ? (
                    <img src={motoristaExibido.fotoUrl} alt={`Foto de ${motoristaExibido.nome}`} />
                  ) : (
                    motoristaExibido.avatar
                  )}
                </div>
                <strong className="inicio-driver-name">{motoristaExibido.nome}</strong>
                {motoristaExibido.avaliacao !== '' && (
                  <span>
                    <Star size={16} fill="currentColor" />
                    {motoristaExibido.avaliacao}
                  </span>
                )}
                </div>}
              </div>

              <div className="inicio-details">
                {proximaCarona.papel === 'MOTORISTA' ? 'Gerenciar carona' : 'Ver detalhes'}
                <ArrowRight size={21} />
              </div>
            </Link>
          ) : (
            <div className="inicio-empty-ride">
              <div className="inicio-empty-icon"><CalendarX size={24} /></div>
              <strong id="proxima-carona">{carregando ? 'Carregando...' : 'Nenhuma carona futura'}</strong>
              <span>
                {carregando
                  ? 'Buscando suas informações no backend.'
                  : 'Você ainda não tem caronas agendadas. Que tal buscar ou ofertar uma agora?'}
              </span>
              {!carregando && <div className="inicio-empty-actions">
                <Link to="/inicio">Buscar carona</Link>
                <Link to="/ofertar-carona">Ofertar carona</Link>
              </div>}
            </div>
          )}
        </section>

        <section className="inicio-section" aria-labelledby="atalhos">
          <h2 id="atalhos">ATALHOS</h2>

          <div className="inicio-shortcuts">
            <Link to="/inicio" className="inicio-shortcut">
              <span>
                <MapPin size={27} />
              </span>
              Buscar carona
            </Link>

            <Link to="/ofertar-carona" className="inicio-shortcut">
              <span>
                <CalendarDays size={27} />
              </span>
              Ofertar carona
            </Link>
          </div>
        </section>

        <section className="inicio-section" aria-labelledby="sugestoes">
          <div className="inicio-section-header">
            <h2 id="sugestoes">SUGESTÕES PARA VOCÊ</h2>
            <Link to="/inicio">Ver todas</Link>
          </div>

          <div className="inicio-suggestions">
            {sugestoes.length > 0 ? (
              sugestoes.map((sugestao) => (
                <article key={sugestao.id || sugestao.rota} className="inicio-suggestion">
                  <div className="inicio-suggestion-avatar">
                    {sugestao.motorista.avatar || 'U'}
                  </div>

                  <div className="inicio-suggestion-main">
                    <h3>{sugestao.motorista.nome || 'Motorista'}</h3>
                    <p>{sugestao.rota}</p>
                  </div>

                  <div className="inicio-suggestion-meta">
                    <strong>{formatarHorario(sugestao.horario)}</strong>
                    <span>{formatarPreco(sugestao.preco)}</span>
                  </div>
                </article>
              ))
            ) : (
              <div className="inicio-empty-list">
                {carregando ? 'Carregando sugestões...' : 'Nenhuma sugestão encontrada.'}
              </div>
            )}
          </div>
        </section>
      </section>

      <NavegacaoInferior />
    </main>
  );
}

function getPrimeiroNome(nome = '') {
  const primeiroNome = nome.trim().split(' ')[0];

  return primeiroNome || 'Usuário';
}

function getMotoristaExibido(carona, usuario = {}) {
  const ehUsuarioLogado = carona?.papel === 'MOTORISTA';
  const nome = ehUsuarioLogado
    ? usuario.nomeCompleto || usuario.nome || 'Você'
    : carona?.motorista?.nome || 'Motorista';

  return {
    nome,
    fotoUrl: ehUsuarioLogado ? usuario.fotoUrl || '' : '',
    avatar: ehUsuarioLogado
      ? getIniciais(nome)
      : carona?.motorista?.avatar || getIniciais(nome),
    avaliacao: ehUsuarioLogado
      ? usuario.avaliacao ?? ''
      : carona?.motorista?.avaliacao ?? '',
  };
}

function getIniciais(nome = '') {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join('') || 'U';
}

function formatarHorario(valor) {
  if (!valor) {
    return '--:--';
  }

  if (/^\d{2}:\d{2}/.test(valor)) {
    return valor.slice(0, 5);
  }

  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return valor;
  }

  return data.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatarData(valor) {
  if (!valor || /^\d{2}:\d{2}/.test(valor)) {
    return 'Data não informada';
  }

  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return 'Data não informada';
  }

  return data.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });
}

function formatarPreco(valor) {
  if (valor === null || valor === undefined || valor === '') {
    return '';
  }

  if (typeof valor === 'number') {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }

  return String(valor).startsWith('R$') ? valor : `R$ ${valor}`;
}

export default Inicio;
