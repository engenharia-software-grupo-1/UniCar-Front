import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
  ArrowRight,
  Bell,
  CalendarDays,
  Car,
  Home,
  MapPin,
  PlusCircle,
  Search,
  Sparkles,
  Star,
  User,
} from 'lucide-react';
import Logo from '../../components/common/Logo.jsx';
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
          <h1>{nome} <span aria-hidden="true">👋</span></h1>
        </div>

        {erro && (
          <div className="inicio-message" role="alert">
            {erro}
          </div>
        )}

        <section className="inicio-next-ride" aria-labelledby="proxima-carona">
          {proximaCarona ? (
            <>
              <div>
                <p id="proxima-carona" className="inicio-card-label">
                  <Sparkles size={18} />
                  Próxima carona
                </p>

                <strong className="inicio-next-time">{formatarHorario(proximaCarona.horario)}</strong>
                <p className="inicio-next-route">{proximaCarona.rota}</p>
              </div>

              <div className="inicio-driver">
                <div className="inicio-driver-avatar">
                  {proximaCarona.motorista.avatar || 'U'}
                </div>
                {proximaCarona.motorista.avaliacao && (
                  <span>
                    <Star size={16} fill="currentColor" />
                    {proximaCarona.motorista.avaliacao}
                  </span>
                )}
              </div>

              <Link to="/inicio" className="inicio-details">
                Ver detalhes
                <ArrowRight size={21} />
              </Link>
            </>
          ) : (
            <div className="inicio-empty-ride">
              <p id="proxima-carona" className="inicio-card-label">
                <Sparkles size={18} />
                Próxima carona
              </p>
              <strong>{carregando ? 'Carregando...' : 'Nenhuma carona agendada'}</strong>
              <span>
                {carregando
                  ? 'Buscando suas informações no backend.'
                  : 'Quando você tiver uma carona marcada, ela aparecerá aqui.'}
              </span>
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

            <Link to="/meus-veiculos" className="inicio-shortcut">
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

      <nav className="inicio-bottom-nav" aria-label="Navegação principal">
        <NavLink to="/inicio" end>
          <Home size={24} />
          Início
        </NavLink>

        <NavLink to="/inicio" className={() => ''}>
          <Search size={24} />
          Buscar
        </NavLink>

        <NavLink to="/meus-veiculos" className={() => 'inicio-offer-link'}>
          <span>
            <PlusCircle size={30} />
          </span>
          Ofertar
        </NavLink>

        <NavLink to="/meus-veiculos">
          <Car size={24} />
          Minhas
        </NavLink>

        <NavLink to="/perfil">
          <User size={24} />
          Perfil
        </NavLink>
      </nav>
    </main>
  );
}

function getPrimeiroNome(nome = '') {
  const primeiroNome = nome.trim().split(' ')[0];

  return primeiroNome || 'Usuário';
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
