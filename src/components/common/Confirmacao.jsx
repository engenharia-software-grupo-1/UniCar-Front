import './Confirmacao.css';

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
  if (!open) {
    return null;
  }

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
        {title && <h2>{title}</h2>}
        {message && <p>{message}</p>}

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
