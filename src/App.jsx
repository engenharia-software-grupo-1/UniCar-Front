import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import './App.css';
import Home from './routes/index.jsx';
import Login from './pages/Login/index.jsx';
import Perfil from './pages/Perfil/index.jsx';

function InitialRoute() {
  const session = localStorage.getItem('unicar.session');

  if (session) {
    return <Navigate to="/home" replace />;
  }

  return <Navigate to="/login" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<InitialRoute />} />
        <Route path="/login" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/perfil" element={<Perfil />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;