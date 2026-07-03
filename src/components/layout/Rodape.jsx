import Logo from '../common/Logo.jsx';

export default function Rodape() {
  return (
    <footer className="rodape">
      <div className="conteudoRodape">
        <a href="/" className="marcaRodape" aria-label="UniCar">
          <Logo />
        </a>
        <p>© {new Date().getFullYear()} UniCar - Caronas universitárias</p>
      </div>
    </footer>
  );
}
