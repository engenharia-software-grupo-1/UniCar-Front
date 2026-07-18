import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Check,
  Clock3,
  Star,
  X,
} from 'lucide-react';
import {
  listarNotificacoes,
  marcarNotificacaoComoLida,
} from '../../services/notificationService.js';
import './style.css';

const ICONES_POR_TIPO = {
  confirmada: Check,
  lembrete: Clock3,
  compativel: Bell,
  compatível: Bell,
  cancelada: X,
  avaliacao: Star,
  avaliação: Star,
};

function Notificacoes() {
  const navigate = useNavigate();
  const [notificacoes, setNotificacoes] = useState([]);
  const [notificacaoSelecionada, setNotificacaoSelecionada] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  const totalNaoLidas = useMemo(
    () => notificacoes.filter((notificacao) => !notificacao.lida).length,
    [notificacoes],
  );
  const notificacoesOrdenadas = useMemo(
    () => ordenarNotificacoesPorDataDesc(notificacoes),
    [notificacoes],
  );

  async function carregarNotificacoes() {
    try {
      setLoading(true);
      setErro('');

      const dados = await listarNotificacoes();
      setNotificacoes(dados);
    } catch (error) {
      setErro(error.message || 'Não foi possível carregar as notificações.');
    } finally {
      setLoading(false);
    }
  }

  function abrirDetalhesNotificacao(notificacao) {
    setNotificacaoSelecionada(notificacao);

    if (notificacao.lida) {
      return;
    }

    setNotificacoes((notificacoesAtuais) =>
      notificacoesAtuais.map((item) =>
        item.id === notificacao.id ? { ...item, lida: true } : item,
      ),
    );

    marcarNotificacaoComoLida(notificacao.id).catch(() => undefined);
  }


  useEffect(() => {
    let ativo = true;

    async function carregarInicial() {
      try {
        const dados = await listarNotificacoes();

        if (!ativo) {
          return;
        }

        setNotificacoes(dados);
        setErro('');
      } catch (error) {
        if (ativo) {
          setErro(error.message || 'Não foi possível carregar as notificações.');
        }
      } finally {
        if (ativo) {
          setLoading(false);
        }
      }
    }

    carregarInicial();

    return () => {
      ativo = false;
    };
  }, []);

  return (
    <main className="notificacoes-page">
      <section className="notificacoes-shell">
        <div className="notificacoes-titlebar">
          <div>
            <h1>Notificações</h1>
            <p>
              {totalNaoLidas} {totalNaoLidas === 1 ? 'não lida' : 'não lidas'}
            </p>
          </div>

        </div>

        {loading && (
          <section className="notificacoes-state-card" aria-live="polite">
            <div className="notificacoes-spinner" />
            <p>Carregando notificações...</p>
          </section>
        )}

        {!loading && erro && (
          <section className="notificacoes-state-card">
            <div className="notificacoes-error">{erro}</div>
            <button type="button" onClick={carregarNotificacoes}>
              Tentar novamente
            </button>
          </section>
        )}

        {!loading && !erro && notificacoes.length === 0 && (
          <section className="notificacoes-empty">
            <Bell aria-hidden="true" />
            <h2>Nenhuma notificação</h2>
            <p>Atualizações sobre suas caronas aparecerão aqui.</p>
          </section>
        )}

        {!loading && !erro && notificacoesOrdenadas.length > 0 && (
          <ul className="notificacoes-lista" aria-label="Lista de notificações">
            {notificacoesOrdenadas.map((notificacao) => (
              <NotificacaoCard
                key={notificacao.id}
                notificacao={notificacao}
                onAbrir={() => abrirDetalhesNotificacao(notificacao)}
              />
            ))}
          </ul>
        )}

        <div className="notificacoes-footer-actions">
          <button type="button" onClick={() => navigate('/perfil')}>
            Voltar para o perfil
          </button>
        </div>
      </section>

      {notificacaoSelecionada && (
        <NotificacaoModal
          notificacao={notificacaoSelecionada}
          onClose={() => setNotificacaoSelecionada(null)}
        />
      )}
    </main>
  );
}

function NotificacaoCard({ notificacao, onAbrir }) {
  const Icone = ICONES_POR_TIPO[notificacao.tipo] || Bell;
  const estadoClasse = notificacao.lida
    ? 'notificacoes-card notificacoes-card--lida'
    : 'notificacoes-card notificacoes-card--nao-lida';

  return (
    <li className={estadoClasse}>
      <button
        type="button"
        className="notificacoes-card__summary"
        onClick={onAbrir}
      >
        <span className="notificacoes-card__icon" aria-hidden="true">
          <Icone size={21} />
        </span>

        <span className="notificacoes-card__content">
          <span className="notificacoes-card__header">
            <strong>{notificacao.titulo}</strong>
            {!notificacao.lida && (
              <span
                className="notificacoes-unread-dot"
                aria-label="Notificação não lida"
              />
            )}
          </span>

          <span className="notificacoes-card__message">{notificacao.mensagem}</span>

          <time dateTime={notificacao.dataHora}>
            {formatarDataAmigavel(notificacao.dataHora)}
          </time>
        </span>
      </button>
    </li>
  );
}

function NotificacaoModal({ notificacao, onClose }) {
  const Icone = ICONES_POR_TIPO[notificacao.tipo] || Bell;

  return (
    <div className="notificacoes-modal-overlay" role="presentation" onClick={onClose}>
      <section
        className="notificacoes-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="notificacoes-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="notificacoes-modal__close"
          aria-label="Fechar detalhes da notificação"
          onClick={onClose}
        >
          <X size={22} />
        </button>

        <header className="notificacoes-modal__header">
          <span className="notificacoes-modal__icon" aria-hidden="true">
            <Icone size={22} />
          </span>

          <div>
            <h2 id="notificacoes-modal-title">{notificacao.titulo}</h2>
            <time dateTime={notificacao.dataHora}>
              {formatarDataAmigavel(notificacao.dataHora)}
            </time>
          </div>
        </header>

        <div className="notificacoes-modal__body">
          <p>{getMensagemDetalhada(notificacao)}</p>
        </div>

        <footer className="notificacoes-modal__actions">
          <button type="button" onClick={onClose}>
            Fechar
          </button>
        </footer>
      </section>
    </div>
  );
}

function getMensagemDetalhada(notificacao) {
  const mensagensPorTipo = {
    confirmada:
      'Sua vaga na carona de Marina (07:20) foi confirmada. Ponto de encontro: Praça da Bandeira, saída às 07:15. Leve o comprovante da matrícula para agilizar o embarque.',
    lembrete:
      'Sua carona com Lucas sai em 30 minutos. Não esqueça de estar no ponto combinado com antecedência.',
    compatível:
      'Marina abriu vaga no trajeto Centenário → UFCG (07:20). Restam 2 vagas disponíveis por R$ 8,00.',
    compativel:
      'Marina abriu vaga no trajeto Centenário → UFCG (07:20). Restam 2 vagas disponíveis por R$ 8,00.',
    cancelada:
      'Ana cancelou a carona de amanhã 06:45. Sugerimos buscar alternativas no painel de caronas próximas.',
    avaliacao:
      'Você recebeu 5 estrelas de João Mendes. "Motorista pontual e super tranquilo!"',
  };

  return mensagensPorTipo[notificacao.tipo] || notificacao.detalhes || notificacao.mensagem;
}

function formatarDataAmigavel(dataHora) {
  const data = new Date(dataHora);

  if (Number.isNaN(data.getTime())) {
    return 'Data não informada';
  }

  const agora = new Date();
  const diferencaMs = agora.getTime() - data.getTime();
  const diferencaMinutos = Math.floor(diferencaMs / 60000);
  const diferencaHoras = Math.floor(diferencaMinutos / 60);

  if (diferencaMinutos >= 0 && diferencaMinutos < 60) {
    return diferencaMinutos <= 1 ? 'agora' : `há ${diferencaMinutos} min`;
  }

  if (diferencaHoras >= 0 && diferencaHoras < 24 && mesmoDia(data, agora)) {
    return `há ${diferencaHoras} h`;
  }

  if (ehOntem(data, agora)) {
    return 'ontem';
  }

  const diferencaDias = Math.floor(diferencaMs / 86400000);

  if (diferencaDias > 0 && diferencaDias < 7) {
    return `${diferencaDias} ${diferencaDias === 1 ? 'dia' : 'dias'}`;
  }

  if (mesmoDia(data, agora)) {
    return `Hoje, ${formatarHora(data)}`;
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(data);
}

function ordenarNotificacoesPorDataDesc(notificacoes) {
  return [...notificacoes].sort((a, b) => {
    const dataA = new Date(a.dataHora).getTime();
    const dataB = new Date(b.dataHora).getTime();

    return normalizarTempo(dataB) - normalizarTempo(dataA);
  });
}

function normalizarTempo(tempo) {
  return Number.isNaN(tempo) ? 0 : tempo;
}

function mesmoDia(data, referencia) {
  return (
    data.getFullYear() === referencia.getFullYear() &&
    data.getMonth() === referencia.getMonth() &&
    data.getDate() === referencia.getDate()
  );
}

function ehOntem(data, referencia) {
  const ontem = new Date(referencia);
  ontem.setDate(referencia.getDate() - 1);

  return mesmoDia(data, ontem);
}

function formatarHora(data) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(data);
}

export default Notificacoes;
