import { NavLink } from 'react-router-dom';
import { Car, Home, PlusCircle, Search, User } from 'lucide-react';
import './NavegacaoInferior.css';

// Barra de navegação inferior compartilhada por todo o fluxo autenticado.
// O item "Minhas" leva sempre para a listagem de caronas do motorista.
export default function NavegacaoInferior() {
  return (
    <nav className="nav-inferior" aria-label="Navegação principal">
      <NavLink to="/inicio" end>
        <Home size={24} />
        Início
      </NavLink>

      <NavLink to="/inicio" className={() => ''}>
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
        <Car size={24} />
        Minhas
      </NavLink>

      <NavLink to="/perfil">
        <User size={24} />
        Perfil
      </NavLink>
    </nav>
  );
}
