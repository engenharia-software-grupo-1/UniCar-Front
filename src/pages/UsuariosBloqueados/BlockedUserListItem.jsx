import UnblockButton from './UnblockButton.jsx';

export default function BlockedUserListItem({
  usuario,
  loading = false,
  onUnblock,
}) {
  return (
    <article className="bloqueados-item">
      <div className="bloqueados-avatar">{usuario.avatar}</div>

      <div className="bloqueados-info">
        <strong>{usuario.name}</strong>
        <span>{usuario.course}</span>
        <small>Bloqueado em {usuario.blockedAt}</small>
      </div>

      <UnblockButton loading={loading} onClick={() => onUnblock(usuario)} />
    </article>
  );
}
