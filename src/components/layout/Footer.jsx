import logoAsset from '../../assets/unicar-logo-transparent.png';

export default function Footer() {
  return (
    <footer className="unicar-footer">
      <div className="unicar-container unicar-footer__inner">
        <a href="/" className="unicar-brand" aria-label="UniCar">
          <img src={logoAsset} alt="UniCar" />
        </a>
        <p>© {new Date().getFullYear()} UniCar - Caronas universitárias</p>
      </div>
    </footer>
  );
}
