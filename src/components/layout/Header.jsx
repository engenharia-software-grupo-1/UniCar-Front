import { Link, useNavigate } from 'react-router-dom';
import logoAsset from '../../assets/unicar-logo-transparent.png';
import { isAuthenticated, logout } from '../../services/authService.js';

export default function Header() {
  const navigate = useNavigate();
  const estaLogado = isAuthenticated();

  async function handleLogout() {
    await logout();

    navigate('/login', { replace: true });
  }

  return (
    <header className="unicar-header">
      <div className="unicar-container unicar-header__inner">
        <Link to="/home" className="unicar-brand" aria-label="UniCar">
          <img src={logoAsset} alt="UniCar" />
        </Link>

        <nav className="unicar-nav" aria-label="Principal">
          <a href="#features">Recursos</a>
          <a href="#como-funciona">Como funciona</a>
          <a href="#buscar">Buscar carona</a>
        </nav>

        <div className="unicar-header__actions">
          {estaLogado ? (
            <>
              <Link to="/perfil" className="unicar-link">
                Meu perfil
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="unicar-button unicar-button--small"
              >
                Sair
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="unicar-link">
                Entrar
              </Link>

              <Link to="/login" className="unicar-button unicar-button--small">
                Cadastrar
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}