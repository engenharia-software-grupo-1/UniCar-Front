import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell } from 'lucide-react';
import Logo from '../common/Logo.jsx';
import { listarNotificacoes } from '../../services/notificationService.js';
import './Topbar.css';

// Telas-raiz da barra inferior: nelas o "voltar" não faz sentido (poderia sair
// do app), então a setinha some — a navegação entre elas é pela barra inferior.
const ROTAS_RAIZ = new Set([
  '/inicio',
  '/buscar-carona',
  '/ofertar-carona',
  '/minhas-caronas',
  '/perfil',
]);

// Barra superior global do app autenticado: voltar + logo à esquerda, sino à
// direita. Flutuante e translúcida. O título de cada tela fica no corpo, não aqui.
export default function Topbar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [temNaoLida, setTemNaoLida] = useState(false);

  const mostrarVoltar = !ROTAS_RAIZ.has(pathname);

  useEffect(() => {
    let ativo = true;

    listarNotificacoes()
      .then((notificacoes) => {
        if (ativo) {
          setTemNaoLida(
            Array.isArray(notificacoes) && notificacoes.some((n) => !n.lida),
          );
        }
      })
      .catch(() => {});

    return () => {
      ativo = false;
    };
    // Reavalia a cada navegação para o badge acompanhar leituras recentes.
  }, [pathname]);

  return (
    <header className="topbar">
      <div className="topbar__conteudo">
        <div className="topbar__esquerda">
          {mostrarVoltar && (
            <button
              type="button"
              className="topbar__voltar"
              onClick={() => navigate(-1)}
              aria-label="Voltar"
            >
              <ArrowLeft size={22} />
            </button>
          )}

          <Link to="/home" className="topbar__logo" aria-label="UniCar — página inicial">
            <Logo />
          </Link>
        </div>

        <Link to="/notificacoes" className="topbar__sino" aria-label="Notificações">
          <Bell size={22} />
          {temNaoLida && <span className="topbar__badge" aria-hidden="true" />}
        </Link>
      </div>
    </header>
  );
}
