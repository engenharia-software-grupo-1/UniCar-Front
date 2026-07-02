import { Link } from 'react-router-dom';
import logoAsset from '../../assets/unicar-logo-transparent.png';

export default function Footer() {
  return (
    <footer className="unicar-footer">
      <div className="unicar-container unicar-footer__inner">
        <Link to="/home" className="unicar-brand" aria-label="UniCar">
          <img src={logoAsset} alt="UniCar" />
        </Link>

        <div className="unicar-footer__links">
          <p>© {new Date().getFullYear()} UniCar - Caronas universitárias</p>
          <Link to="/politica-de-privacidade">Política de Privacidade</Link>
        </div>
      </div>
    </footer>
  );
}
