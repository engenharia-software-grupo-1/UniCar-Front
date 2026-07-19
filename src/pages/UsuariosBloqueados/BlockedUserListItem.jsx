import UnblockButton from './UnblockButton.jsx';
import { Link } from 'react-router-dom';

export default function BlockedUserListItem({
  usuario,
  loading = false,
  onUnblock,
}) {
  return (
    <article className="bloqueados-item">
      <Link
        to={`/usuarios/${usuario.id}`}
        className="bloqueados-avatar"
        aria-label={`Ver perfil de ${usuario.name}`}
      >
        {usuario.fotoUrl ? (
          <img src={usuario.fotoUrl} alt={`Foto de ${usuario.name}`} />
        ) : usuario.avatar}
      </Link>

      <div className="bloqueados-info">
        <strong>{usuario.name}</strong>
        <span>{usuario.course}</span>
        <small>Bloqueado em {usuario.blockedAt}</small>
      </div>

      <UnblockButton loading={loading} onClick={() => onUnblock(usuario)} />
    </article>
  );
}
