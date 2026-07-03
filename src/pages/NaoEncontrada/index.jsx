import { Link } from 'react-router-dom';
import Logo from '../../components/common/Logo.jsx';
import './style.css';

export default function NaoEncontrada() {
  return (
    <main className="paginaNaoEncontrada">
      <div className="caixaNaoEncontrada">
        <Logo alt="UniCar" />
        <strong>404</strong>
        <h1>Página não encontrada</h1>
        <p>A página que você tentou acessar não existe ou mudou de endereço.</p>
        <Link to="/" className="botaoVoltarHome">
          Voltar para a Home
        </Link>
      </div>
    </main>
  );
}
