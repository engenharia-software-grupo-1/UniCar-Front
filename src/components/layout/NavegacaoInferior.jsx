import { NavLink } from 'react-router-dom';
import { Home, PlusCircle, Route, Search, User } from 'lucide-react';
import './NavegacaoInferior.css';

// Barra de navegação inferior compartilhada por todo o fluxo autenticado.
// O item "Caronas" leva sempre para a listagem de caronas do motorista.
export default function NavegacaoInferior() {
  return (
    <nav className="nav-inferior" aria-label="Navegação principal">
      <NavLink to="/inicio" end>
        <Home size={24} />
        Início
      </NavLink>

      <NavLink to="/buscar-carona" className={() => ''}>
        <Search size={24} />
        Buscar
      </NavLink>

      <NavLink to="/ofertar-carona" className={() => 'nav-inferior__ofertar'}>
        <span>
          <PlusCircle size={30} />
        </span>
        Ofertar
      </NavLink>

      <NavLink to="/minhas-caronas">
        <Route size={24} />
        Caronas
      </NavLink>

      <NavLink to="/perfil">
        <User size={24} />
        Perfil
      </NavLink>
    </nav>
  );
}
