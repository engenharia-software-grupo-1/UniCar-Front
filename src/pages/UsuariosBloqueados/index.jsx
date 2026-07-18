import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ban, ShieldOff } from 'lucide-react';
import BlockedUserListItem from './BlockedUserListItem.jsx';
import ConfirmUnblockModal from './ConfirmUnblockModal.jsx';
import {
  desbloquearUsuario,
  listarUsuariosBloqueados,
} from '../../services/blockUserService.js';
import { logout } from '../../services/authService.js';
import './style.css';

function UsuariosBloqueados() {
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState([]);
  const [target, setTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [desbloqueando, setDesbloqueando] = useState(false);
  const [erro, setErro] = useState('');
  const [mensagemSucesso, setMensagemSucesso] = useState('');

  useEffect(() => {
    let ativo = true;

    async function carregarBloqueados() {
      try {
        setLoading(true);
        const lista = await listarUsuariosBloqueados();

        if (!ativo) {
          return;
        }

        setUsuarios(lista);
        setErro('');
      } catch (error) {
        if (!ativo) {
          return;
        }

        if (isErroDeAutenticacao(error)) {
          await logout();
          navigate('/login', { replace: true });
          return;
        }

        setErro(error.message || 'Não foi possível carregar os usuários bloqueados.');
      } finally {
        if (ativo) {
          setLoading(false);
        }
      }
    }

    carregarBloqueados();

    return () => {
      ativo = false;
    };
  }, [navigate]);

  async function confirmarDesbloqueio() {
    if (!target) {
      return;
    }

    try {
      setDesbloqueando(true);
      setErro('');
      setMensagemSucesso('');
      await desbloquearUsuario(target.id);
      setUsuarios((listaAtual) => listaAtual.filter((usuario) => usuario.id !== target.id));
      setMensagemSucesso(`${target.name} foi desbloqueado.`);
      setTarget(null);
    } catch (error) {
      setErro(error.message || 'Não foi possível desbloquear. Tente novamente.');
    } finally {
      setDesbloqueando(false);
    }
  }

  return (
    <main className="bloqueados-page">
      <section className="bloqueados-shell">
        <section className="bloqueados-hero">
          <div className="bloqueados-hero-icon">
            <Ban size={24} />
          </div>

          <div>
            <h1>Usuários bloqueados</h1>
            <p>{formatarTotalBloqueados(usuarios.length)}</p>
          </div>
        </section>

        {(erro || mensagemSucesso) && (
          <div
            className={erro ? 'bloqueados-message bloqueados-message--error' : 'bloqueados-message bloqueados-message--success'}
            role={erro ? 'alert' : 'status'}
          >
            {erro || mensagemSucesso}
          </div>
        )}

        {loading ? (
          <section className="bloqueados-empty" aria-live="polite">
            <div className="bloqueados-empty-icon">
              <ShieldOff size={26} />
            </div>
            <strong>Carregando usuários bloqueados...</strong>
          </section>
        ) : usuarios.length === 0 ? (
          <section className="bloqueados-empty">
            <div className="bloqueados-empty-icon">
              <ShieldOff size={26} />
            </div>
            <strong>Nenhum usuário bloqueado</strong>
            <p>Você pode bloquear usuários pela tela de perfil.</p>
          </section>
        ) : (
          <section className="bloqueados-list" aria-label="Usuários bloqueados">
            {usuarios.map((usuario) => (
              <BlockedUserListItem
                key={usuario.id}
                usuario={usuario}
                loading={desbloqueando && target?.id === usuario.id}
                onUnblock={setTarget}
              />
            ))}
          </section>
        )}
      </section>

      <ConfirmUnblockModal
        open={Boolean(target)}
        userName={target?.name}
        loading={desbloqueando}
        onConfirm={confirmarDesbloqueio}
        onCancel={() => setTarget(null)}
      />
    </main>
  );
}

function formatarTotalBloqueados(total) {
  return `${total} ${total === 1 ? 'usuário bloqueado' : 'usuários bloqueados'}`;
}

function isErroDeAutenticacao(error) {
  return /não autenticado|nao autenticado|unauthorized|forbidden|acesso negado/i.test(
    error?.message || '',
  );
}

export default UsuariosBloqueados;
