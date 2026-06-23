import logoAsset from '../../assets/unicar-logo-transparent.png';

export default function Header() {
  return (
    <header className="unicar-header">
      <div className="unicar-container unicar-header__inner">
        <a href="/" className="unicar-brand" aria-label="UniCar">
          <img src={logoAsset} alt="UniCar" />
        </a>
        <nav className="unicar-nav" aria-label="Principal">
          <a href="#features">Recursos</a>
          <a href="#como-funciona">Como funciona</a>
          <a href="#buscar">Buscar carona</a>
        </nav>
        <div className="unicar-header__actions">
          <a href="/login" className="unicar-link">Entrar</a>
          <a href="/login" className="unicar-button unicar-button--small">Cadastrar</a>
        </div>
      </div>
    </header>
  );
}
