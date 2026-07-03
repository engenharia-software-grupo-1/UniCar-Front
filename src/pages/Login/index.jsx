import { useId, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, User, Loader2 } from 'lucide-react';
import { login } from '../../services/authService.js';
import logoAsset from '../../assets/unicar-logo-transparent.png';
import { hasAcceptedTerms } from '../../services/termsService.js';
import Logo from '../../components/common/Logo.jsx';
import './style.css';

function Login() {
  const navigate = useNavigate();

  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  async function submit(event) {
    event.preventDefault();

    setErro('');

    const usuarioNormalizado = usuario.trim();

    if (!usuarioNormalizado && !senha) {
      setErro('Informe usuário e senha institucional.');
      return;
    }

    if (!usuarioNormalizado) {
      setErro('Informe o usuário institucional.');
      return;
    }

    if (!senha) {
      setErro('Informe a senha institucional.');
      return;
    }

    try {
      setLoading(true);

      await login({
        usuario: usuarioNormalizado,
        senha,
      });

      if (hasAcceptedTerms()) {
        navigate('/inicio', { replace: true });
      } else {
        navigate('/termos-de-uso', { replace: true });
      }
    } catch (error) {
      setErro(error.message || 'Não foi possível realizar o login.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <Link to="/home" className="login-back">
        &larr; Voltar
      </Link>

      <section className="login-container">
        <div className="login-logo">
          <Logo />
        </div>

        <div className="login-card">
          <h1>Entrar com SIGAA</h1>

          <p className="login-subtitle">
            Use suas credenciais institucionais da UFCG
          </p>

          <form onSubmit={submit} className="login-form">
            <Field
              icon={User}
              id="usuario"
              label="Usuário"
              value={usuario}
              onChange={setUsuario}
              placeholder="121110000"
              autoComplete="username"
              inputMode="numeric"
              disabled={loading}
            />

            <Field
              icon={Lock}
              id="senha"
              label="Senha"
              type="password"
              value={senha}
              onChange={setSenha}
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={loading}
            />

            {erro && (
              <div className="login-error" role="alert">
                {erro}
              </div>
            )}

            <button type="submit" disabled={loading} className="login-submit">
              {loading && <Loader2 className="login-spinner" />}
              {loading ? 'Autenticando...' : 'Entrar'}
            </button>

            <a
              href="https://sigadmin.ufcg.edu.br/admin/public/recuperar_senha.jsf"
              target="_blank"
              rel="noopener noreferrer"
              className="forgot-button"
              aria-label="Abrir recuperação de senha institucional em nova aba"
            >
              Esqueci minha senha
            </a>
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
  id,
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  autoComplete,
  inputMode,
  disabled = false,
}) {
  const generatedId = useId();
  const inputId = id || generatedId;

  return (
    <div className="field-group">
      <label htmlFor={inputId}>{label}</label>

      <div className="field-input">
        <Icon className="field-icon" />

        <input
          id={inputId}
          type={type}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={inputMode}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </div>
  );
}

export default Login;
