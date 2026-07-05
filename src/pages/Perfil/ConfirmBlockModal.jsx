import Confirmacao from '../../components/common/Confirmacao.jsx';

export default function ConfirmBlockModal({
  open,
  userName,
  loading = false,
  onConfirm,
  onCancel,
}) {
  const nome = userName || 'este usuário';

  return (
    <Confirmacao
      open={open}
      danger
      title="Bloquear usuário?"
      message={`Tem certeza que deseja bloquear ${nome}?`}
      confirmLabel="Bloquear"
      loadingLabel="Bloqueando..."
      loading={loading}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
