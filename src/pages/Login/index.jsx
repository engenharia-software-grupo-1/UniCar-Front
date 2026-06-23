import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Loader2 } from 'lucide-react';
import { hasAcceptedTerms } from '../../services/termsService.js';
import logoAsset from '../../assets/unicar-logo-transparent.png';
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

      if (hasAcceptedTerms()) {
        navigate('/home');
      } else {
        navigate('/termos-de-uso');
      }
    }, 900);
  }

  return (
    <main className="login-page">
      <section className="login-container">
        <div className="login-logo">
          <img src={logoAsset} alt="UniCar" />
        </div>

        <div className="login-card">
          <h1>Entrar com SIGAA</h1>

          <p className="login-subtitle">
            Use suas credenciais institucionais da UFCG
          </p>

          <form onSubmit={submit} className="login-form">
            <Field
              icon={User}
              label="Matrícula"
              value={matricula}
              onChange={setMatricula}
              placeholder="121110000"
              disabled={loading}
            />

            <Field
              icon={Lock}
              label="Senha"
              type="password"
              value={senha}
              onChange={setSenha}
              placeholder="••••••••"
              disabled={loading}
            />

            {erro && (
              <div className="login-error">
                {erro}
              </div>
            )}

            <button type="submit" disabled={loading} className="login-submit">
              {loading && <Loader2 className="login-spinner" />}
              {loading ? 'Autenticando...' : 'Entrar'}
            </button>

            <button type="button" className="forgot-button">
              Esqueci minha senha
            </button>
          </form>
        </div>

        <p className="login-footer">
          🔒 Apenas estudantes com vínculo ativo na UFCG
        </p>
      </section>
    </main>
  );
}

function Field({
  icon: Icon,
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
        <Icon className="field-icon" />

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