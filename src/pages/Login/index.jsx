import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './style.css';

function Login() {
  const navigate = useNavigate();

  const [matricula, setMatricula] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  function submit(event) {
    event.preventDefault();

    setErro('');

    if (!matricula && !senha) {
      setErro('Informe matrícula e senha institucional.');
      return;
    }

    if (!matricula) {
      setErro('Informe a matrícula institucional.');
      return;
    }

    if (!senha) {
      setErro('Informe a senha institucional.');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      if (matricula.toLowerCase() === 'erro') {
        setErro('Usuário ou senha inválidos.');
        setLoading(false);
        return;
      }

      localStorage.setItem('unicar.session', '1');

      navigate('/home');
    }, 900);
  }

  return (
    <main className="login-page">
      <section className="login-container">
        <div className="login-logo">
          <h1>UniCar</h1>
          <p>Carona universitária segura</p>
        </div>

        <div className="login-card">
          <h2>Entrar com credenciais UFCG</h2>

          <p className="login-subtitle">
            Use suas credenciais institucionais para acessar o sistema.
          </p>

          <form onSubmit={submit} className="login-form">
            <Field
              icon="👤"
              label="Matrícula"
              value={matricula}
              onChange={setMatricula}
              placeholder="Digite sua matrícula"
              disabled={loading}
            />

            <Field
              icon="🔒"
              label="Senha"
              type="password"
              value={senha}
              onChange={setSenha}
              placeholder="Digite sua senha"
              disabled={loading}
            />

            {erro && (
              <div className="login-error">
                {erro}
              </div>
            )}

            <button type="submit" disabled={loading}>
              {loading && <span className="spinner" />}
              {loading ? 'Autenticando...' : 'Entrar'}
            </button>

            <button type="button" className="forgot-button">
              Esqueci minha senha
            </button>
          </form>
        </div>

        <p className="login-footer">
          🔒 Apenas usuários com vínculo ativo na UFCG
        </p>
      </section>
    </main>
  );
}

function Field({
  icon,
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  disabled = false,
}) {
  return (
    <div className="field-group">
      <label>{label}</label>

      <div className="field-input">
        <span>{icon}</span>

        <input
          type={type}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </div>
  );
}

export default Login;