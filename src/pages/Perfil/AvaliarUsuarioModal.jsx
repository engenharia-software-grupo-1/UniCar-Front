import { useState } from 'react';
import { Star, X } from 'lucide-react';
import './AvaliarUsuarioModal.css';

const NOTAS = [1, 2, 3, 4, 5];

// O componente é montado apenas enquanto o modal está aberto (o pai faz render
// condicional), então o estado local é reiniciado a cada abertura naturalmente.
export default function AvaliarUsuarioModal({
  userName,
  loading = false,
  onSubmit,
  onClose,
}) {
  const [nota, setNota] = useState(0);
  const [notaEmDestaque, setNotaEmDestaque] = useState(0);
  const [comentario, setComentario] = useState('');

  const nome = userName || 'usuário';
  const notaVisivel = notaEmDestaque || nota;

  function enviar(event) {
    event.preventDefault();

    if (loading || nota === 0) {
      return;
    }

    onSubmit?.({ nota, comentario });
  }

  return (
    <div className="avaliar-modal-overlay" onClick={loading ? undefined : onClose}>
      <form
        className="avaliar-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Avaliar ${nome}`}
        onClick={(event) => event.stopPropagation()}
        onSubmit={enviar}
      >
        <div className="avaliar-modal-header">
          <h2>Avaliar {nome}</h2>
          <button
            type="button"
            className="avaliar-modal-close"
            aria-label="Fechar"
            disabled={loading}
            onClick={onClose}
          >
            <X size={22} />
          </button>
        </div>

        <div
          className="avaliar-modal-stars"
          role="radiogroup"
          aria-label="Nota"
          onMouseLeave={() => setNotaEmDestaque(0)}
        >
          {NOTAS.map((valor) => (
            <button
              key={valor}
              type="button"
              className={
                valor <= notaVisivel
                  ? 'avaliar-modal-star avaliar-modal-star--ativa'
                  : 'avaliar-modal-star'
              }
              role="radio"
              aria-checked={nota === valor}
              aria-label={`${valor} ${valor === 1 ? 'estrela' : 'estrelas'}`}
              disabled={loading}
              onMouseEnter={() => setNotaEmDestaque(valor)}
              onFocus={() => setNotaEmDestaque(valor)}
              onClick={() => setNota(valor)}
            >
              <Star size={34} fill={valor <= notaVisivel ? 'currentColor' : 'none'} />
            </button>
          ))}
        </div>

        <textarea
          className="avaliar-modal-textarea"
          placeholder="Comentário (opcional)"
          value={comentario}
          disabled={loading}
          rows={4}
          onChange={(event) => setComentario(event.target.value)}
        />

        <button
          type="submit"
          className="avaliar-modal-submit"
          disabled={loading || nota === 0}
        >
          {loading ? 'Enviando...' : 'Enviar avaliação'}
        </button>
      </form>
    </div>
  );
}
