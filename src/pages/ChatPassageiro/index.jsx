import { useState } from 'react';
import { ArrowLeft, Flag, Send } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import './style.css';

export default function ChatPassageiro() {
  const { caronaId, reservaId, usuarioId } = useParams();
  const conversaId = caronaId || reservaId;
  const location = useLocation();
  const navigate = useNavigate();
  const passageiro = location.state?.passageiro || {};
  const status = String(location.state?.status || '').toUpperCase();
  const permiteMensagem = ['EM_ANDAMENTO', 'ACEITA', 'CRIADA'].includes(status);
  const nome = passageiro.nome || 'Passageiro';
  const [mensagens, setMensagens] = useState([]);
  const [texto, setTexto] = useState('');

  function enviarMensagem(event) {
    event?.preventDefault();
    if (!permiteMensagem) return;
    const mensagem = texto.trim();
    if (!mensagem) return;

    setMensagens((atuais) => [
      ...atuais,
      {
        id: Date.now(),
        texto: mensagem,
        horario: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        minha: true,
      },
    ]);
    setTexto('');
  }

  return (
    <main className="chat-passageiro-page">
      <section className="chat-passageiro-shell" aria-label={`Conversa com ${nome}`}>
        <header className="chat-passageiro-header">
          <button type="button" onClick={() => navigate(-1)} aria-label="Voltar">
            <ArrowLeft size={23} />
          </button>
          <Link
            to={`/usuarios/${usuarioId}`}
            state={{ perfilFallback: passageiro }}
            className="chat-passageiro-avatar"
            aria-label={`Ver perfil de ${nome}`}
          >
            {nome.charAt(0).toUpperCase()}
          </Link>
          <div className="chat-passageiro-identidade">
            <strong>{nome}</strong>
            <span>{passageiro.curso || 'Comunidade UFCG'} • UFCG</span>
          </div>
          <button type="button" aria-label={`Denunciar ${nome}`}>
            <Flag size={21} />
          </button>
        </header>

        <div className="chat-passageiro-mensagens" aria-live="polite">
          {mensagens.map((mensagem) => (
            <article key={mensagem.id} className={mensagem.minha ? 'is-minha' : ''}>
              <p>{mensagem.texto}</p>
              <time>{mensagem.horario}</time>
            </article>
          ))}
        </div>

        <form className="chat-passageiro-composer" onSubmit={enviarMensagem}>
          <label className="sr-only" htmlFor={`mensagem-${conversaId}`}>Escreva uma mensagem</label>
          <input
            id={`mensagem-${conversaId}`}
            value={texto}
            onChange={(event) => setTexto(event.target.value)}
            placeholder={permiteMensagem ? 'Escreva uma mensagem...' : 'Conversa disponível somente para leitura'}
            autoComplete="off"
            readOnly={!permiteMensagem}
          />
          <button type="submit" aria-label="Enviar mensagem" disabled={!permiteMensagem || !texto.trim()}>
            <Send size={20} />
          </button>
        </form>
      </section>
    </main>
  );
}
