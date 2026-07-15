import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  Ban,
  Car,
  CheckCircle,
  Clock,
  Flag,
  MapPin,
  MessageCircle,
  MessageSquareText,
  Pencil,
  Send,
  Shield,
  Star,
  UserMinus,
  Users,
} from 'lucide-react';
import { obterCarona, removerReservaCarona } from '../../services/caronaService.js';
import { getPerfilUsuarioAutenticado } from '../../services/profileService.js';
import './style.css';

const STATUS = {
  CRIADA: { rotulo: 'Aguardando', classe: 'aguardando' },
  EM_ANDAMENTO: { rotulo: 'Em andamento', classe: 'andamento' },
  FINALIZADA: { rotulo: 'Finalizada', classe: 'finalizada' },
  CANCELADA: { rotulo: 'Cancelada', classe: 'cancelada' },
};

const PASSAGEIROS_MOCKADOS = [
  { id: 1, reservaId: 101, nome: 'Ana Clara', curso: 'Ciência da Computação', avaliacao: 4.9, status: 'Confirmado' },
  { id: 2, reservaId: 102, nome: 'Rafael Lima', curso: 'Design', avaliacao: 4.7, status: 'Pendente' },
];

const MENSAGENS_INICIAIS = [
  { id: 1, autor: 'Ana Clara', texto: 'Oi! O ponto é perto da biblioteca?', horario: '12:48' },
  { id: 2, autor: 'Voce', texto: 'Sim, em frente ao bloco principal.', horario: '12:51' },
];

const MOTIVOS_DENUNCIA = [
  'Comportamento inadequado',
  'Informações falsas',
  'Não compareceu',
  'Outro motivo',
];

function DetalheCarona() {
  const { id } = useParams();
  const location = useLocation();
  const [carona, setCarona] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [abaAtiva, setAbaAtiva] = useState('info');
  const [compartilhandoLocal, setCompartilhandoLocal] = useState(false);
  const [solicitada, setSolicitada] = useState(false);
  const [confirmada, setConfirmada] = useState(false);
  const [bloqueado, setBloqueado] = useState(false);
  const [bloqueando, setBloqueando] = useState(false);
  const [modalBloqueioAberto, setModalBloqueioAberto] = useState(false);
  const [modalDenunciaAberto, setModalDenunciaAberto] = useState(false);
  const [motivoDenuncia, setMotivoDenuncia] = useState(MOTIVOS_DENUNCIA[0]);
  const [denunciaEnviada, setDenunciaEnviada] = useState(false);
  const [mensagens, setMensagens] = useState(MENSAGENS_INICIAIS);
  const [textoMensagem, setTextoMensagem] = useState('');
  const [feedback, setFeedback] = useState(location.state?.mensagem || '');
  const [reservaParaRemover, setReservaParaRemover] = useState(null);
  const [removendoReserva, setRemovendoReserva] = useState(false);

  useEffect(() => {
    if (location.state?.mensagem) {
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  async function carregarDetalhe() {
    try {
      setCarregando(true);
      setErro('');

      const detalhe = await obterCarona(id);

      setCarona(detalhe);
    } catch (error) {
      setErro(error.message || 'Não foi possível carregar os detalhes da carona.');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    let ativo = true;

    async function carregarInicial() {
      try {
        const [detalhe, perfilAutenticado] = await Promise.all([
          obterCarona(id),
          getPerfilUsuarioAutenticado().catch(() => null),
        ]);

        if (!ativo) {
          return;
        }

        setCarona(detalhe);
        setPerfil(perfilAutenticado);
        setErro('');
      } catch (error) {
        if (ativo) {
          setErro(error.message || 'Não foi possível carregar os detalhes da carona.');
        }
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    }

    carregarInicial();

    return () => {
      ativo = false;
    };
  }, [id]);

  const status = getStatus(carona?.status);
  const passageiros = useMemo(() => montarPassageiros(carona), [carona]);
  const motoristaDaCarona = carona?.motorista || {};
  const isMinhaCarona = Boolean(
    perfil && (!motoristaDaCarona.id || String(motoristaDaCarona.id) === String(perfil.id)),
  );
  const motorista = isMinhaCarona
    ? {
        ...motoristaDaCarona,
        nome: perfil.nomeCompleto || motoristaDaCarona.nome,
        curso: perfil.curso,
        avaliacao: perfil.avaliacao,
        fotoUrl: perfil.fotoUrl,
        verificado: perfil.motoristaVerificado,
      }
    : motoristaDaCarona;
  const veiculo = carona?.veiculo || {};
  const destino = carona?.destino || 'Destino não informado';
  const destinoExibido = formatarDestino(destino, carona?.pontoEncontro);

  function enviarMensagem() {
    const texto = textoMensagem.trim();

    if (!texto) {
      return;
    }

    setMensagens((atuais) => [
      ...atuais,
      {
        id: Date.now(),
        autor: 'Voce',
        texto,
        horario: new Date().toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      },
    ]);
    setTextoMensagem('');
  }

  function alternarSolicitacao() {
    if (confirmada) {
      setConfirmada(false);
      setSolicitada(false);
      setFeedback('Participação cancelada.');
      return;
    }

    if (solicitada) {
      setConfirmada(true);
      setFeedback('Participação confirmada.');
      return;
    }

    setSolicitada(true);
    setFeedback('Solicitação enviada.');
  }

  function enviarDenuncia(event) {
    event.preventDefault();
    setDenunciaEnviada(true);
    setFeedback('Denúncia registrada com sucesso.');
  }

  function confirmarBloqueio() {
    setBloqueando(true);
    window.setTimeout(() => {
      setBloqueado(true);
      setBloqueando(false);
      setModalBloqueioAberto(false);
      setFeedback('Usuário bloqueado com sucesso.');
    }, 450);
  }

  async function confirmarRemocaoReserva() {
    if (!reservaParaRemover || !carona?.id) {
      return;
    }

    try {
      setRemovendoReserva(true);
      setErro('');
      setFeedback('');

      await removerReservaCarona(carona.id, reservaParaRemover.reservaId);

      setCarona((caronaAtual) => removerPassageiroDaCarona(caronaAtual, reservaParaRemover));
      setReservaParaRemover(null);
      setFeedback(`Reserva de ${reservaParaRemover.nome} removida com sucesso.`);
    } catch (error) {
      setFeedback('');
      setErro(error.message || 'Não foi possível remover a reserva.');
    } finally {
      setRemovendoReserva(false);
    }
  }

  return (
    <main className="detalhe-carona-page">
      <section className="detalhe-carona-shell">
        {carregando ? (
          <section className="detalhe-carona-state">
            <p>Carregando detalhes da carona...</p>
          </section>
        ) : erro ? (
          <section className="detalhe-carona-state detalhe-carona-state--error" role="alert">
            <p>{erro}</p>
            <button type="button" onClick={carregarDetalhe}>
              Tentar novamente
            </button>
          </section>
        ) : (
          <>
            {feedback && (
              <div className="detalhe-feedback" role="status">
                {feedback}
              </div>
            )}

            <section className="detalhe-card detalhe-main-card">
              <div className="detalhe-driver-header">
                <div className="detalhe-avatar-wrap">
                  <div className="detalhe-avatar">
                    {motorista.fotoUrl ? (
                      <img src={motorista.fotoUrl} alt={`Foto de ${motorista.nome || 'motorista'}`} />
                    ) : getInitial(motorista.nome)}
                  </div>
                  {motorista.verificado && (
                    <span className="detalhe-verified">
                      <CheckCircle size={14} />
                    </span>
                  )}
                </div>

                <div className="detalhe-driver-info">
                  <div className="detalhe-driver-title">
                    <h1>{isMinhaCarona ? 'Você (motorista)' : motorista.nome || 'Motorista'}</h1>
                    {motorista.verificado && <span className="detalhe-driver-badge">Verificado</span>}
                  </div>
                  <p>{motorista.curso || 'Curso não informado'} • UFCG</p>
                  {motorista.avaliacao !== '' && motorista.avaliacao != null && (
                    <span>
                      <Star size={14} fill="currentColor" />
                      {formatarAvaliacao(motorista.avaliacao)}
                    </span>
                  )}
                </div>

                {!isMinhaCarona && (
                  <div className="detalhe-actions">
                    <IconBtn icon={Flag} label="Denunciar" onClick={() => setModalDenunciaAberto(true)} />
                    <IconBtn icon={Ban} label="Bloquear" onClick={() => setModalBloqueioAberto(true)} />
                  </div>
                )}
              </div>

              {bloqueado && <span className="detalhe-blocked-chip">Usuário bloqueado</span>}

              <div className="detalhe-soft-block">
                <Row icon={MapPin} label="Origem" value={carona.origem || 'Origem não informada'} />
                <Row icon={MapPin} label="Destino" value={destinoExibido} />
                <Row icon={Clock} label="Saída" value={formatarDataHora(carona.dataHoraSaida)} />
                <Row
                  icon={Users}
                  label="Vagas"
                  value={`${formatarNumero(carona.vagasDisponiveis)} de ${formatarNumero(carona.quantidadeVagas)} disponíveis`}
                />
                <Row icon={Car} label="Veículo" value={formatarVeiculo(veiculo)} />
              </div>

              <div className="detalhe-status-price">
                <p>Contribuição estimada</p>
                <strong>{formatarValor(carona.valorContribuicao)}</strong>
              </div>

              <div className="detalhe-main-actions">
                <span className={`detalhe-status detalhe-status--${status.classe}`}>{status.rotulo}</span>
                {isMinhaCarona && carona.status === 'CRIADA' && (
                  <Link to={`/minhas-caronas/${id}/editar`} className="detalhe-edit-link">
                    <Pencil size={16} />
                    Editar
                  </Link>
                )}
              </div>
            </section>

            {confirmada && (
              <section className="detalhe-card detalhe-sharing-card">
                <Shield size={20} />
                <div>
                  <strong>Compartilhamento de localização</strong>
                  <p>Ative para que o motorista acompanhe sua chegada ao ponto de encontro.</p>
                </div>
                <button
                  type="button"
                  className={compartilhandoLocal ? 'is-on' : ''}
                  onClick={() => setCompartilhandoLocal((atual) => !atual)}
                >
                  {compartilhandoLocal ? 'Ativo' : 'Ativar'}
                </button>
              </section>
            )}

            <div className="detalhe-tabs" role="tablist" aria-label="Informações da carona">
              <button
                type="button"
                className={abaAtiva === 'info' ? 'is-active' : ''}
                onClick={() => setAbaAtiva('info')}
              >
                Detalhes
              </button>
              <button
                type="button"
                className={abaAtiva === 'passageiros' ? 'is-active' : ''}
                onClick={() => setAbaAtiva('passageiros')}
              >
                Passageiros
              </button>
              <button
                type="button"
                className={abaAtiva === 'chat' ? 'is-active' : ''}
                onClick={() => setAbaAtiva('chat')}
              >
                Chat
              </button>
            </div>

            {abaAtiva === 'info' && (
              <section className="detalhe-card detalhe-info-card">
                <Row icon={MapPin} label="Ponto de encontro" value={carona.pontoEncontro || 'Não informado'} />
                {carona.observacao && (
                  <div className="detalhe-row detalhe-observacao">
                    <span>
                      <MessageSquareText size={17} />
                    </span>
                    <div>
                      <p>Observações do motorista</p>
                      <span className="detalhe-observacao-texto">{carona.observacao}</span>
                    </div>
                  </div>
                )}
                <Row icon={Car} label="Modelo" value={veiculo.modelo || 'Não informado'} />
                <Row icon={Car} label="Cor" value={veiculo.cor || 'Não informado'} />
                {veiculo.placa && <Row icon={Car} label="Placa" value={veiculo.placa} />}

                <div className="detalhe-safety">
                  <Shield size={18} />
                  <span>Matrícula validada pelo SIGAA</span>
                </div>
              </section>
            )}

            {abaAtiva === 'passageiros' && (
              <section className="detalhe-passenger-list" aria-label="Passageiros">
                {passageiros.length === 0 ? (
                  <div className="detalhe-card detalhe-empty-passengers">
                    Nenhuma reserva aceita nesta carona.
                  </div>
                ) : passageiros.map((passageiro) => (
                  <article className="detalhe-card detalhe-passenger" key={passageiro.id}>
                    <div className="detalhe-avatar detalhe-avatar--small">{getInitial(passageiro.nome)}</div>
                    <div>
                      <strong>{passageiro.nome}</strong>
                      <p>{passageiro.curso}</p>
                      <span>
                        <Star size={13} fill="currentColor" />
                        {formatarAvaliacao(passageiro.avaliacao)}
                      </span>
                    </div>
                    <em className={passageiro.status === 'Confirmado' ? 'is-confirmed' : ''}>
                      {passageiro.status}
                    </em>
                    {isMinhaCarona && passageiro.status === 'Confirmado' && (
                      <button
                        type="button"
                        className="detalhe-remove-reservation"
                        onClick={() => setReservaParaRemover(passageiro)}
                      >
                        <UserMinus size={16} />
                        Remover Reserva
                      </button>
                    )}
                  </article>
                ))}
              </section>
            )}

            {abaAtiva === 'chat' && (
              <section className="detalhe-card detalhe-chat-card">
                <div className="detalhe-chat-messages">
                  {mensagens.map((mensagem) => (
                    <article
                      className={mensagem.autor === 'Voce' ? 'is-me' : ''}
                      key={mensagem.id}
                    >
                      <strong>{mensagem.autor}</strong>
                      <p>{mensagem.texto}</p>
                      <span>{mensagem.horario}</span>
                    </article>
                  ))}
                </div>

                <div className="detalhe-chat-input">
                  <MessageCircle size={18} />
                  <input
                    value={textoMensagem}
                    onChange={(event) => setTextoMensagem(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        enviarMensagem();
                      }
                    }}
                    placeholder="Mensagem"
                  />
                  <button type="button" onClick={enviarMensagem} aria-label="Enviar mensagem">
                    <Send size={18} />
                  </button>
                </div>
              </section>
            )}
          </>
        )}
      </section>

      {!carregando && !erro && !isMinhaCarona && (
        <div className="detalhe-sticky-action">
          <button type="button" onClick={alternarSolicitacao} disabled={bloqueado}>
            {confirmada ? 'Cancelar participação' : solicitada ? 'Confirmar participação' : 'Solicitar carona'}
          </button>
        </div>
      )}

      {modalDenunciaAberto && (
        <Modal title="Denunciar motorista" onClose={() => setModalDenunciaAberto(false)}>
          {denunciaEnviada ? (
            <div className="detalhe-modal-success">
              <CheckCircle size={28} />
              <strong>Denúncia enviada</strong>
              <p>Obrigado por ajudar a manter a comunidade segura.</p>
            </div>
          ) : (
            <form className="detalhe-report-form" onSubmit={enviarDenuncia}>
              {MOTIVOS_DENUNCIA.map((motivo) => (
                <label key={motivo}>
                  <input
                    type="radio"
                    name="motivo"
                    checked={motivoDenuncia === motivo}
                    onChange={() => setMotivoDenuncia(motivo)}
                  />
                  {motivo}
                </label>
              ))}
              <textarea placeholder="Descreva o ocorrido" rows={3} />
              <button type="submit">Enviar denúncia</button>
            </form>
          )}
        </Modal>
      )}

      {modalBloqueioAberto && (
        <Modal title="Bloquear usuário" onClose={() => setModalBloqueioAberto(false)}>
          <div className="detalhe-block-modal">
            <p>Tem certeza que deseja bloquear {motorista.nome || 'este usuário'}?</p>
            <button type="button" onClick={confirmarBloqueio} disabled={bloqueando}>
              {bloqueando ? 'Bloqueando...' : 'Bloquear usuário'}
            </button>
          </div>
        </Modal>
      )}

      {reservaParaRemover && (
        <Modal
          title="Remover reserva"
          onClose={() => {
            if (!removendoReserva) {
              setReservaParaRemover(null);
            }
          }}
        >
          <div className="detalhe-remove-modal">
            <p>
              Tem certeza que deseja remover a reserva de{' '}
              <strong>{reservaParaRemover.nome}</strong> desta carona?
            </p>
            <div>
              <button
                type="button"
                className="detalhe-remove-modal__cancel"
                onClick={() => setReservaParaRemover(null)}
                disabled={removendoReserva}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="detalhe-remove-modal__confirm"
                onClick={confirmarRemocaoReserva}
                disabled={removendoReserva}
              >
                {removendoReserva ? 'Removendo...' : 'Remover Reserva'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </main>
  );
}

function Row({ icon: Icon, label, value }) {
  return (
    <div className="detalhe-row">
      <span>
        <Icon size={17} />
      </span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function IconBtn({ icon: Icon, label, onClick }) {
  return (
    <button type="button" className="detalhe-icon-btn" onClick={onClick} aria-label={label} title={label}>
      <Icon size={18} />
    </button>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="detalhe-modal-overlay" role="presentation" onMouseDown={onClose}>
      <section
        className="detalhe-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <h2>{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar modal">
            x
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

function montarPassageiros(carona) {
  if (!carona || !Array.isArray(carona.passageiros)) {
    return PASSAGEIROS_MOCKADOS;
  }

  return carona.passageiros.map((passageiro, index) => ({
    id: passageiro.id || index,
    reservaId: passageiro.reservaId || passageiro.idReserva || passageiro.reservationId || passageiro.id || index,
    nome: passageiro.nome || passageiro.nomeCompleto || 'Passageiro',
    curso: passageiro.curso || 'Comunidade UFCG',
    avaliacao: passageiro.avaliacao || 4.8,
    status: passageiro.status || 'Confirmado',
  }));
}

function removerPassageiroDaCarona(carona, passageiroRemovido) {
  if (!carona) {
    return carona;
  }

  const passageirosAtuais = Array.isArray(carona.passageiros)
    ? carona.passageiros
    : PASSAGEIROS_MOCKADOS;
  const passageiros = passageirosAtuais.filter((passageiro) =>
    String(passageiro.reservaId || passageiro.id) !== String(passageiroRemovido.reservaId),
  );
  const vagasDisponiveis = passageiroRemovido.status === 'Confirmado'
    ? Math.min(
        Number(carona.quantidadeVagas ?? carona.vagasDisponiveis ?? 0),
        Number(carona.vagasDisponiveis ?? 0) + 1,
      )
    : carona.vagasDisponiveis;

  return {
    ...carona,
    passageiros,
    vagasDisponiveis,
  };
}

function getStatus(status) {
  return STATUS[status] || {
    rotulo: status || 'Carona',
    classe: 'aguardando',
  };
}

function formatarDataHora(valor) {
  if (!valor) {
    return 'Não informado';
  }

  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return valor;
  }

  return data.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function formatarValor(valor) {
  if (valor === null || valor === undefined || valor === '') {
    return 'Não informado';
  }

  const numero = Number(valor);

  if (!Number.isFinite(numero)) {
    return String(valor);
  }

  return numero.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function formatarNumero(valor) {
  if (valor === null || valor === undefined || valor === '') {
    return 'Não informado';
  }

  return String(valor);
}

function formatarVeiculo(veiculo) {
  const partes = [veiculo.modelo, veiculo.cor].filter(Boolean);

  return partes.length ? partes.join(' - ') : 'Não informado';
}

function formatarDestino(destino, pontoEncontro) {
  if (!pontoEncontro || destino.includes(pontoEncontro)) {
    return destino;
  }

  return `${destino} • ${pontoEncontro}`;
}

function getInitial(nome = '') {
  return nome.trim()[0]?.toUpperCase() || 'M';
}

function formatarAvaliacao(valor) {
  const numero = Number(valor);

  if (!Number.isFinite(numero)) {
    return valor;
  }

  return numero.toLocaleString('pt-BR', {
    maximumFractionDigits: 1,
  });
}

export default DetalheCarona;
