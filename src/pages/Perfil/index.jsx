import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPerfilUsuarioAutenticado } from '../../services/profileService.js';
import './style.css';

function Perfil() {
  const navigate = useNavigate();

  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  async function carregarPerfil() {
    try {
      setLoading(true);
      setErro('');

      const dados = await getPerfilUsuarioAutenticado();

      setPerfil(dados);
    } catch (error) {
      setErro(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarPerfil();
  }, []);

  if (loading) {
    return (
      <main className="perfil-page">
        <section className="perfil-card">
          <p className="perfil-loading">Carregando perfil...</p>
        </section>
      </main>
    );
  }

  if (erro) {
    return (
      <main className="perfil-page">
        <section className="perfil-card">
          <h1>Perfil do Usuário</h1>

          <div className="perfil-error">
            {erro}
          </div>

          <div className="perfil-actions">
            <button type="button" onClick={carregarPerfil}>
              Tentar novamente
            </button>

            <button type="button" onClick={() => navigate('/login')}>
              Voltar para o login
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="perfil-page">
      <section className="perfil-card">
        <div className="perfil-header">
          <div>
            <h1>Perfil do Usuário</h1>
            <p>Informações cadastrais recuperadas do backend.</p>
          </div>

          <button type="button" onClick={() => navigate('/home')}>
            Voltar para Home
          </button>
        </div>

        <div className="perfil-grid">
          <InfoItem label="Nome completo" value={perfil.nomeCompleto} />
          <InfoItem label="Matrícula" value={perfil.matricula} />
          <InfoItem label="CPF" value={perfil.cpf} />
          <InfoItem label="E-mail institucional" value={perfil.emailInstitucional} />
          <InfoItem label="Curso" value={perfil.curso} />
          <InfoItem label="Gênero" value={perfil.genero} />
          <InfoItem
            label="Preferência de recebimento de e-mails"
            value={perfil.recebeEmails ? 'Aceita receber e-mails' : 'Não aceita receber e-mails'}
          />
        </div>

        <div className="perfil-footer">
          <button type="button" onClick={() => navigate('/meus-veiculos')}>
            Meus veículos
          </button>
        </div>
      </section>
    </main>
  );
}

function InfoItem({ label, value }) {
  return (
    <div className="perfil-info-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default Perfil;