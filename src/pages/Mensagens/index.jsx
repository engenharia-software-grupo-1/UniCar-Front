import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, MessageCircle, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { listarChats } from '../../services/chatService.js';
import { obterFotoPerfil } from '../../utils/fotoPerfil.js';
import './style.css';

export default function Mensagens() {
  const navigate = useNavigate();
  const [chats, setChats] = useState([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;

    listarChats()
      .then((dados) => {
        if (ativo) setChats(dados);
      })
      .catch((error) => {
        if (ativo) setErro(error.message || 'Não foi possível carregar suas conversas.');
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => { ativo = false; };
  }, []);

  const chatsFiltrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR');
    if (!termo) return chats;
    return chats.filter((chat) =>
      [chat.nomeParticipante, chat.origem, chat.destino, chat.ultimaMensagem]
        .some((valor) => String(valor || '').toLocaleLowerCase('pt-BR').includes(termo)),
    );
  }, [busca, chats]);

  const totalNaoLidas = chats.reduce(
    (total, chat) => total + Number(chat.mensagensNaoLidas || 0),
    0,
  );

  function abrirConversa(chat) {
    setChats((atuais) => atuais.map((item) =>
      item.id === chat.id ? { ...item, mensagensNaoLidas: 0 } : item,
    ));
    navigate(`/reservas/${chat.reservaId}/chat/${chat.participanteId || 'participante'}`, {
      state: {
        reservaId: chat.reservaId,
        passageiro: {
          id: chat.participanteId,
          nome: chat.nomeParticipante,
          fotoUrl: chat.fotoParticipante,
        },
      },
    });
  }

  return (
    <main className="mensagens-page">
      <section className="mensagens-shell">
        <header className="mensagens-header">
          <div>
            <h1>Mensagens</h1>
            <p>{formatarNaoLidas(totalNaoLidas)}</p>
          </div>
        </header>

        <label className="mensagens-busca">
          <Search size={20} aria-hidden="true" />
          <input
            aria-label="Buscar conversa"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar conversa"
          />
        </label>

        {carregando && <p className="mensagens-estado">Carregando conversas...</p>}
        {!carregando && erro && <p className="mensagens-estado mensagens-estado--erro" role="alert">{erro}</p>}
        {!carregando && !erro && chatsFiltrados.length === 0 && (
          <div className="mensagens-estado mensagens-estado--vazio">
            <MessageCircle aria-hidden="true" />
            <strong>{busca ? 'Nenhuma conversa encontrada' : 'Você ainda não possui conversas'}</strong>
            <span>{busca ? 'Tente buscar por outro nome ou trajeto.' : 'Seus chats de caronas aparecerão aqui.'}</span>
          </div>
        )}

        {!carregando && !erro && chatsFiltrados.length > 0 && (
          <ul className="mensagens-lista">
            {chatsFiltrados.map((chat) => (
              <li key={chat.id}>
                <button type="button" className="mensagens-conversa" onClick={() => abrirConversa(chat)}>
                  <Avatar chat={chat} />
                  <span className="mensagens-conversa__conteudo">
                    <strong>
                      {chat.nomeParticipante}
                      {chat.verificado && <CheckCircle2 size={15} aria-label="Participante verificado" />}
                    </strong>
                    {(chat.origem || chat.destino) && (
                      <span className="mensagens-conversa__trajeto">
                        {chat.origem || 'Origem'} → {chat.destino || 'Destino'}
                        {chat.dataCarona ? ` • ${formatarDataCarona(chat.dataCarona)}` : ''}
                      </span>
                    )}
                    <span className={chat.mensagensNaoLidas > 0 ? 'mensagens-conversa__previa is-nao-lida' : 'mensagens-conversa__previa'}>
                      {chat.ultimaMensagem}
                    </span>
                  </span>
                  <span className="mensagens-conversa__meta">
                    <time dateTime={chat.dataUltimaMensagem}>{formatarDataMensagem(chat.dataUltimaMensagem)}</time>
                    {chat.mensagensNaoLidas > 0 && <b aria-label={`${chat.mensagensNaoLidas} mensagens não lidas`}>{chat.mensagensNaoLidas}</b>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function Avatar({ chat }) {
  const foto = obterFotoPerfil({ fotoUrl: chat.fotoParticipante });
  return (
    <span className="mensagens-avatar" aria-hidden="true">
      {foto ? <img src={foto} alt="" /> : iniciais(chat.nomeParticipante)}
    </span>
  );
}

function iniciais(nome = '') {
  return nome.trim().split(/\s+/).slice(0, 2).map((parte) => parte[0]).join('').toUpperCase() || 'U';
}

function formatarNaoLidas(total) {
  if (total === 0) return 'Nenhuma mensagem não lida';
  return `${total} ${total === 1 ? 'não lida' : 'não lidas'}`;
}

function formatarDataMensagem(valor) {
  if (!valor) return '';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '';
  const hoje = new Date();
  const ontem = new Date();
  ontem.setDate(ontem.getDate() - 1);
  if (mesmoDia(data, hoje)) return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (mesmoDia(data, ontem)) return 'Ontem';
  const dias = Math.floor((inicioDia(hoje) - inicioDia(data)) / 86400000);
  if (dias < 7) return data.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function formatarDataCarona(valor) {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '';
  const hoje = new Date();
  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 1);
  const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (mesmoDia(data, hoje)) return `Hoje ${hora}`;
  if (mesmoDia(data, amanha)) return `Amanhã ${hora}`;
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function mesmoDia(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function inicioDia(data) {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate()).getTime();
}
