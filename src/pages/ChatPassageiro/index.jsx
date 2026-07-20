import { useEffect, useState } from 'react';
import { Send } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { getSession } from '../../services/authService.js';
import {
  enviarMensagemChat,
  listarMensagensChat,
  marcarMensagensComoLidas,
  obterChatDaReserva,
} from '../../services/chatService.js';
import './style.css';

export default function ChatPassageiro() {
  const { caronaId, reservaId, usuarioId } = useParams();
  const location = useLocation();
  const passageiro = location.state?.passageiro || {};
  const reservaAlvo = reservaId || location.state?.reservaId;
  const status = String(location.state?.status || '').toUpperCase();
  const permiteMensagem = !['FINALIZADA', 'CANCELADA', 'RECUSADA', 'CONCLUIDA', 'REMOVIDA'].includes(status);
  const usuarioAutenticadoId = getSession()?.usuario?.id;
  const [nome, setNome] = useState(passageiro.nome || 'Passageiro');
  const [fotoUrl, setFotoUrl] = useState(passageiro.fotoUrl || passageiro.linkFoto || '');
  const [chatId, setChatId] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [texto, setTexto] = useState('');
  const [carregando, setCarregando] = useState(Boolean(reservaAlvo));
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(reservaAlvo ? '' : 'Reserva inválida para esta conversa.');

  useEffect(() => {
    let ativo = true;

    async function carregarChat() {
      try {
        setCarregando(true);
        setErro('');

        const chat = await obterChatDaReserva(reservaAlvo);
        const lista = await listarMensagensChat(chat.id);

        if (ativo) {
          setChatId(chat.id);
          setNome(chat.nomeParticipante || passageiro.nome || 'Passageiro');
          setFotoUrl(chat.linkFotoParticipante || passageiro.fotoUrl || passageiro.linkFoto || '');
          setMensagens(lista);
        }

        marcarMensagensComoLidas(chat.id).catch(() => undefined);
      } catch (error) {
        if (ativo) setErro(error.message || 'Não foi possível carregar a conversa.');
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    if (reservaAlvo) {
      carregarChat();
    }

    return () => {
      ativo = false;
    };
  }, [passageiro.nome, reservaAlvo]);

  async function enviarMensagem(event) {
    event?.preventDefault();
    if (!permiteMensagem || !chatId || enviando) return;
    const mensagem = texto.trim();
    if (!mensagem) return;

    try {
      setEnviando(true);
      setErro('');
      const novaMensagem = await enviarMensagemChat(chatId, mensagem);
      setMensagens((atuais) => [...atuais, novaMensagem]);
      setTexto('');
    } catch (error) {
      setErro(error.message || 'Não foi possível enviar a mensagem.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="chat-passageiro-page">
      <section className="chat-passageiro-shell" aria-label={`Conversa com ${nome}`}>
        <header className="chat-passageiro-header">
          <Link
            to={`/usuarios/${usuarioId}`}
            state={{ perfilFallback: passageiro }}
            className="chat-passageiro-avatar"
            aria-label={`Ver perfil de ${nome}`}
          >
            {fotoUrl ? <img src={fotoUrl} alt={`Foto de ${nome}`} /> : nome.charAt(0).toUpperCase()}
          </Link>
          <div className="chat-passageiro-identidade">
            <strong>{nome}</strong>
            <span>{passageiro.curso || 'Comunidade UFCG'} • UFCG</span>
          </div>
        </header>

        <div className="chat-passageiro-mensagens" aria-live="polite">
          {carregando && <p>Carregando mensagens...</p>}
          {!carregando && erro && <p role="alert">{erro}</p>}
          {mensagens.map((mensagem) => (
            <article
              key={mensagem.id}
              className={String(mensagem.remetenteId) === String(usuarioAutenticadoId) ? 'is-minha' : ''}
            >
              <p>{mensagem.texto}</p>
              <time dateTime={mensagem.dataEnvio}>{formatarHorario(mensagem.dataEnvio)}</time>
            </article>
          ))}
        </div>

        <form className="chat-passageiro-composer" onSubmit={enviarMensagem}>
          <label className="sr-only" htmlFor={`mensagem-${chatId || caronaId || reservaId || 'chat'}`}>Escreva uma mensagem</label>
          <input
            id={`mensagem-${chatId || caronaId || reservaId || 'chat'}`}
            value={texto}
            onChange={(event) => setTexto(event.target.value)}
            placeholder={permiteMensagem ? 'Escreva uma mensagem...' : 'Conversa disponível somente para leitura'}
            autoComplete="off"
            readOnly={!permiteMensagem}
          />
          <button type="submit" aria-label="Enviar mensagem" disabled={!permiteMensagem || !chatId || enviando || !texto.trim()}>
            <Send size={20} />
          </button>
        </form>
      </section>
    </main>
  );
}

function formatarHorario(valor) {
  if (!valor) return '';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return valor;
  return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
