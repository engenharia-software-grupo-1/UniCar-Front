import './Confirmacao.css';
import { Play } from 'lucide-react';

export default function Confirmacao({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  loadingLabel = 'Processando...',
  onConfirm,
  onCancel,
  loading = false,
  danger = false,
}) {
  if (!open) return null;

  return (
    <div
      className="confirmacaoFundo"
      onClick={loading ? undefined : onCancel}
    >
      <div
        className="confirmacaoCaixa"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        {!danger && (
          <div className="confirmacaoTitulo">
            <Play size={18} />
            <h2>{title}</h2>
          </div>
        )}

        {danger && <h2>{title}</h2>}

        {message && (
          <p className="confirmacaoMensagem">{message}</p>
        )}

        <div className="confirmacaoBotoes">
          <button
            type="button"
            className="botaoSecundario"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            className={danger ? 'botaoPerigo' : ''}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? loadingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
