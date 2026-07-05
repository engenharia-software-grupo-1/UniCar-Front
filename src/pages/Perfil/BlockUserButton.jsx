import { ShieldOff } from 'lucide-react';

export default function BlockUserButton({
  isBlocked = false,
  loading = false,
  onClick,
}) {
  return (
    <button
      type="button"
      className={isBlocked ? 'perfil-block-button perfil-block-button--blocked' : 'perfil-block-button'}
      disabled={isBlocked || loading}
      onClick={onClick}
    >
      <ShieldOff size={18} />
      {loading ? 'Bloqueando...' : isBlocked ? 'Usuário bloqueado' : 'Bloquear Usuário'}
    </button>
  );
}
