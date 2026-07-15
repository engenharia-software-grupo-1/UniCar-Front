import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';

import './App.css';

import Home from './routes/index.jsx';
import Inicio from './pages/Inicio/index.jsx';
import Login from './pages/Login/index.jsx';
import Perfil from './pages/Perfil/index.jsx';
import MeusVeiculos from './pages/MeusVeiculos/index.jsx';
import MinhasCaronas from './pages/MinhasCaronas/index.jsx';
import DetalheCarona from './pages/DetalheCarona/index.jsx';
import EditarCarona from './pages/EditarCarona/index.jsx';
import OfertarCarona from './pages/OfertarCarona/index.jsx';
import HistoricoCaronas from './pages/HistoricoCaronas/index.jsx';
import HistoricoDetalhes from './pages/HistoricoDetalhes/index.jsx';
import PerfilPublico from './pages/PerfilPublico/index.jsx';
import AvaliacoesRecebidas from './pages/AvaliacoesRecebidas/index.jsx';
import Notificacoes from './pages/Notificacoes/index.jsx';
import CentralAjuda from './pages/CentralAjuda/index.jsx';
import UsuariosBloqueados from './pages/UsuariosBloqueados/index.jsx';
import PoliticaPrivacidade from './pages/PoliticaPrivacidade/index.jsx';
import TermosUso from './pages/TermosUso/index.jsx';
import NaoEncontrada from './pages/NaoEncontrada/index.jsx';
import TrajetosRecorrentes from './pages/TrajetosRecorrentes/index.jsx';
import DetalheTrajetosRecorrentes from './pages/DetalheTrajetosRecorrentes/index.jsx';
import BuscarCarona from './pages/BuscarCarona/index.jsx';

import LayoutApp from './components/layout/LayoutApp.jsx';
import { isAuthenticated } from './services/authService.js';
import { hasAcceptedTerms } from './services/termsService.js';

// Só exige sessão (termos/política podem ser acessados antes de aceitar os termos).
// Sem o shell do app — são páginas de leitura, não fazem parte da navegação logada.
function RequireAuth() {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

// Layout do app autenticado: exige sessão + termos aceitos e monta o shell global
// (topbar + barra inferior) em volta de cada página filha.
function AppAutenticado() {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (!hasAcceptedTerms()) {
    return <Navigate to="/termos-de-uso" replace />;
  }

  return <LayoutApp />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Públicas — mantêm identidade própria, sem o shell do app. */}
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Login mode="cadastro" />} />

        {/* Autenticadas sem shell (só sessão). */}
        <Route element={<RequireAuth />}>
          <Route path="/termos-de-uso" element={<TermosUso />} />
          <Route path="/politica-de-privacidade" element={<PoliticaPrivacidade />} />
        </Route>

        {/* App autenticado com o shell global (topbar + barra inferior). */}
        <Route element={<AppAutenticado />}>
          <Route path="/inicio" element={<Inicio />} />
          <Route path="/perfil" element={<Perfil />} />
          <Route path="/trajetos-recorrentes" element={<TrajetosRecorrentes />} />
          <Route path="/trajetos-recorrentes/:id" element={<DetalheTrajetosRecorrentes />} />
          <Route path="/buscar-carona" element={<BuscarCarona />} />
          <Route path="/ofertar-carona" element={<OfertarCarona />} />
          <Route path="/meus-veiculos" element={<MeusVeiculos />} />
          <Route path="/minhas-caronas" element={<MinhasCaronas />} />
          <Route path="/minhas-caronas/:id" element={<DetalheCarona />} />
          <Route path="/minhas-caronas/:id/editar" element={<EditarCarona />} />
          <Route path="/historico-caronas" element={<HistoricoCaronas />} />
          <Route path="/historico/:id" element={<HistoricoDetalhes />} />
          <Route path="/usuarios/:usuarioId" element={<PerfilPublico />} />
          <Route path="/avaliacoes-recebidas" element={<AvaliacoesRecebidas />} />
          <Route path="/notificacoes" element={<Notificacoes />} />
          <Route path="/central-ajuda" element={<CentralAjuda />} />
          <Route path="/bloqueados" element={<UsuariosBloqueados />} />
        </Route>

        <Route path="*" element={<NaoEncontrada />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
