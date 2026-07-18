import { Link } from 'react-router-dom';
import Logo from '../common/Logo.jsx';

export default function Cabecalho() {
  return (
    <header className="cabecalho">
      <div className="container conteudoCabecalho">
        <Link to="/home" className="marcaCabecalho" aria-label="UniCar">
          <Logo />
        </Link>

        <nav className="navegacao" aria-label="Principal">
          <a href="#features">Recursos</a>
          <a href="#como-funciona">Como funciona</a>
          <a href="#buscar">Buscar carona</a>
        </nav>

        <div className="acoesCabecalho">
          <Link to="/login" className="botao botaoPequeno botaoCadastro">
            Entrar
          </Link>
        </div>
      </div>
    </header>
  );
}
