import Confirmacao from '../../components/common/Confirmacao.jsx';

export default function ConfirmUnblockModal({
  open,
  userName,
  loading = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Confirmacao
      open={open}
      title="Desbloquear usuário?"
      message={`Tem certeza que deseja desbloquear ${userName || 'este usuário'}?`}
      confirmLabel="Desbloquear"
      loadingLabel="Desbloqueando..."
      loading={loading}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
