import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import './App.css';

import Home from './routes/index.jsx';
import Login from './pages/Login/index.jsx';
import Perfil from './pages/Perfil/index.jsx';
import TermosUso from './pages/TermosUso/index.jsx';

import { isAuthenticated } from './services/authService.js';
import { hasAcceptedTerms } from './services/termsService.js';

function InitialRoute() {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (!hasAcceptedTerms()) {
    return <Navigate to="/termos-de-uso" replace />;
  }

  return <Navigate to="/home" replace />;
}

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
        <Route path="/" element={<InitialRoute />} />

        <Route path="/login" element={<Login />} />

        <Route
          path="/termos-de-uso"
          element={
            <RequireAuth>
              <TermosUso />
            </RequireAuth>
          }
        />

        <Route
          path="/home"
          element={
            <RequireAuthAndTerms>
              <Home />
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
      </Routes>
    </BrowserRouter>
  );
}

export default App;