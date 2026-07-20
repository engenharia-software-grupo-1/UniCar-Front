import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarX,
  CalendarDays,
  CarFront,
  MapPin,
  Repeat2,
  Sparkles,
  Star,
  UserRound,
} from 'lucide-react';
import { getSession } from '../../services/authService.js';
import { getPerfilUsuarioAutenticado } from '../../services/profileService.js';
import { buscarProximaCarona } from '../../services/caronaService.js';
import './style.css';

function Inicio() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState(() => getSession()?.usuario || {});
  const [proximaCarona, setProximaCarona] = useState(null);
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

        const perfil = await getPerfilUsuarioAutenticado();
        const proxima = await buscarProximaCarona().catch(() => null);

        if (!ativo) {
          return;
        }

        setUsuario(perfil);
        setProximaCarona(proxima);
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
                <div
                  className="inicio-driver-avatar"
                  role="link"
                  tabIndex={0}
                  aria-label={`Ver perfil de ${motoristaExibido.nome}`}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    navigate(`/usuarios/${motoristaExibido.id}`);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      navigate(`/usuarios/${motoristaExibido.id}`);
                    }
                  }}
                >
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
                  ? 'Buscando suas informações...'
                  : 'Você ainda não tem caronas agendadas. Que tal buscar ou ofertar uma agora?'}
              </span>
              {!carregando && <div className="inicio-empty-actions">
                <Link to="/buscar-carona">Buscar carona</Link>
                <Link to="/ofertar-carona">Ofertar carona</Link>
              </div>}
            </div>
          )}
        </section>

        <section className="inicio-section" aria-labelledby="atalhos">
          <h2 id="atalhos">ATALHOS</h2>

          <div className="inicio-shortcuts">
            <Link to="/buscar-carona" className="inicio-shortcut">
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

            <Link to="/meus-veiculos" className="inicio-shortcut inicio-shortcut--badge">
              <span>
                <CarFront size={27} />
              </span>
              Cadastrar veículo
            </Link>

            <Link to="/trajetos-recorrentes" className="inicio-shortcut inicio-shortcut--badge">
              <span>
                <Repeat2 size={27} />
              </span>
              Trajetos recorrentes
            </Link>
          </div>
        </section>
      </section>
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
    id: ehUsuarioLogado
      ? usuario.id ?? usuario.usuarioId
      : carona?.motorista?.id ?? carona?.motorista?.usuarioId ?? carona?.motoristaId,
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

  const hoje = new Date();
  const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const inicioData = new Date(data.getFullYear(), data.getMonth(), data.getDate());
  const diferencaDias = Math.round((inicioData - inicioHoje) / 86400000);

  if (diferencaDias === 0) return 'Hoje';
  if (diferencaDias === 1) return 'Amanhã';

  return data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
}

export default Inicio;
