import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

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

import { isAuthenticated } from './services/authService.js';
import { hasAcceptedTerms } from './services/termsService.js';

function RequireAuth({ children }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function RequireAuthAndTerms({ children }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (!hasAcceptedTerms()) {
    return <Navigate to="/termos-de-uso" replace />;
  }

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />

        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Login mode="cadastro" />} />

        <Route
          path="/termos-de-uso"
          element={
            <RequireAuth>
              <TermosUso />
            </RequireAuth>
          }
        />

        <Route
          path="/politica-de-privacidade"
          element={
            <RequireAuth>
              <PoliticaPrivacidade />
            </RequireAuth>
          }
        />

        <Route path="/home" element={<Home />} />

        <Route
          path="/inicio"
          element={
            <RequireAuthAndTerms>
              <Inicio />
            </RequireAuthAndTerms>
          }
        />

        <Route
          path="/perfil"
          element={
            <RequireAuthAndTerms>
              <Perfil />
            </RequireAuthAndTerms>
          }
        />

        <Route
          path="/trajetos-recorrentes"
          element={
            <RequireAuthAndTerms>
              <TrajetosRecorrentes />
            </RequireAuthAndTerms>
          }
        />

        <Route
          path="/trajetos-recorrentes/:id"
          element={
            <RequireAuthAndTerms>
              <DetalheTrajetosRecorrentes />
            </RequireAuthAndTerms>
          }
        />

        <Route
          path="/buscar-carona"
          element={
            <RequireAuthAndTerms>
              <BuscarCarona />
            </RequireAuthAndTerms>
          }
        />

        <Route
          path="/ofertar"
          element={
            <RequireAuthAndTerms>
              <OfertarCarona />
            </RequireAuthAndTerms>
          }
        />

        <Route
          path="/meus-veiculos"
          element={
            <RequireAuthAndTerms>
              <MeusVeiculos />
            </RequireAuthAndTerms>
          }
        />

        <Route
          path="/ofertar-carona"
          element={
            <RequireAuthAndTerms>
              <OfertarCarona />
            </RequireAuthAndTerms>
          }
        />

        <Route
          path="/minhas-caronas"
          element={
            <RequireAuthAndTerms>
              <MinhasCaronas />
            </RequireAuthAndTerms>
          }
        />

        <Route
          path="/minhas-caronas/:id"
          element={
            <RequireAuthAndTerms>
              <DetalheCarona />
            </RequireAuthAndTerms>
          }
        />

        <Route
          path="/minhas-caronas/:id/editar"
          element={
            <RequireAuthAndTerms>
              <EditarCarona />
            </RequireAuthAndTerms>
          }
        />

        <Route
          path="/historico-caronas"
          element={
            <RequireAuthAndTerms>
              <HistoricoCaronas />
            </RequireAuthAndTerms>
          }
        />

        <Route
          path="/historico/:id"
          element={
            <RequireAuthAndTerms>
              <HistoricoDetalhes />
            </RequireAuthAndTerms>
          }
        />

        <Route
          path="/usuarios/:usuarioId"
          element={
            <RequireAuthAndTerms>
              <PerfilPublico />
            </RequireAuthAndTerms>
          }
        />

        <Route
          path="/avaliacoes-recebidas"
          element={
            <RequireAuthAndTerms>
              <AvaliacoesRecebidas />
            </RequireAuthAndTerms>
          }
        />

        <Route
          path="/notificacoes"
          element={
            <RequireAuthAndTerms>
              <Notificacoes />
            </RequireAuthAndTerms>
          }
        />

        <Route
          path="/central-ajuda"
          element={
            <RequireAuthAndTerms>
              <CentralAjuda />
            </RequireAuthAndTerms>
          }
        />

        <Route
          path="/bloqueados"
          element={
            <RequireAuthAndTerms>
              <UsuariosBloqueados />
            </RequireAuthAndTerms>
          }
        />

        <Route path="*" element={<NaoEncontrada />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
