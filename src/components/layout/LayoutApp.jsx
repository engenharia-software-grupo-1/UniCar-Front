import { useLayoutEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Topbar from './Topbar.jsx';
import NavegacaoInferior from './NavegacaoInferior.jsx';
import './LayoutApp.css';

// Casca do app autenticado: topbar flutuante em cima, barra inferior fixa embaixo,
// e o conteúdo da rota no meio. Cada página só cuida do próprio conteúdo/título.
export default function LayoutApp() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    const voltarAoTopo = () => {
      const elementoRolavel = document.scrollingElement || document.documentElement;

      elementoRolavel.scrollTop = 0;
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    voltarAoTopo();

    // O Safari móvel pode restaurar a posição anterior depois da primeira
    // pintura da nova rota. Repetir no frame seguinte mantém a tela no início.
    const frame = window.requestAnimationFrame(voltarAoTopo);

    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

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
