import { Outlet } from 'react-router-dom';
import Topbar from './Topbar.jsx';
import NavegacaoInferior from './NavegacaoInferior.jsx';
import './LayoutApp.css';

// Casca do app autenticado: topbar flutuante em cima, barra inferior fixa embaixo,
// e o conteúdo da rota no meio. Cada página só cuida do próprio conteúdo/título.
export default function LayoutApp() {
  return (
    <div className="app-shell">
      <Topbar />
      {/* div, não main: cada página já tem seu próprio <main>/conteúdo raiz. */}
      <div className="app-conteudo">
        <Outlet />
      </div>
      <NavegacaoInferior />
    </div>
  );
}
