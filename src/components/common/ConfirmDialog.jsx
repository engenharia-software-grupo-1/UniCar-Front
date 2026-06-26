import './ConfirmDialog.css';

export default function ConfirmDialog({
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
  if (!open) {
    return null;
  }

  return (
    <div
      className="unicar-modal-overlay"
      onClick={loading ? undefined : onCancel}
    >
      <div
        className="unicar-modal-card"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        {title && <h2>{title}</h2>}
        {message && <p>{message}</p>}

        <div className="unicar-modal-actions">
          <button
            type="button"
            className="secondary"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            className={danger ? 'danger' : ''}
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
