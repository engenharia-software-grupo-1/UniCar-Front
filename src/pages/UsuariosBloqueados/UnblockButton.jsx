import { X } from 'lucide-react';

export default function UnblockButton({ loading = false, onClick }) {
  return (
    <button
      type="button"
      className="bloqueados-unblock-button"
      disabled={loading}
      onClick={onClick}
    >
      <X size={16} />
      {loading ? 'Desbloqueando...' : 'Desbloquear'}
    </button>
  );
}
