import { useEffect, useState } from 'react';
import { ArrowRight, CalendarDays, CheckCircle2, Clock, MapPin, MessageCircle, Star, UserRound, Users, X, XCircle } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import NavegacaoInferior from '../../components/layout/NavegacaoInferior.jsx';
import StatusReservaBadge from '../../components/common/StatusReservaBadge.jsx';
import { cancelarReserva, normalizarDetalhesReserva, obterDetalhesReserva } from '../../services/reservaService.js';
import './style.css';

const STATUS = {
  PENDENTE: ['Pendente', 'pendente'],
  ATIVA: ['Ativa', 'confirmada'],
  ACEITA: ['Aceita', 'confirmada'],
  CONFIRMADA: ['Confirmada', 'confirmada'],
  CANCELADA: ['Cancelada', 'cancelada'],
  RECUSADA: ['Recusada', 'recusada'],
  EXPIRADA: ['Expirada', 'recusada'],
  FINALIZADA: ['Finalizada', 'finalizada'],
};

function DetalheReserva() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [reserva, setReserva] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [erroCancelamento, setErroCancelamento] = useState('');
  const [modalCancelamentoAberto, setModalCancelamentoAberto] = useState(Boolean(location.state?.abrirCancelamento));
  const [cancelando, setCancelando] = useState(false);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        setCarregando(true);
        setErro('');
        const dados = await obterDetalhesReserva(id);
        if (ativo) setReserva(dados);
      } catch (error) {
        if (!ativo) return;

        if (location.state?.reserva) {
          setReserva(normalizarDetalhesReserva(location.state.reserva));
          setErro('');
        } else {
          setErro(error.message || 'Não foi possível carregar os detalhes da reserva.');
        }
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    carregar();
    return () => { ativo = false; };
  }, [id, location.state]);

  const [, classeStatus] = STATUS[reserva?.status] || [reserva?.status || 'Reserva', 'pendente'];

  async function confirmarCancelamento() {
    try {
      setCancelando(true);
      setErroCancelamento('');
      setMensagem('');
      await cancelarReserva(reserva.id);
      setReserva((reservaAtual) => ({
        ...reservaAtual,
        status: 'CANCELADA',
        podeCancelar: false,
        dataResposta: reservaAtual.dataResposta || new Date().toISOString(),
      }));
      setModalCancelamentoAberto(false);
      setMensagem('Reserva cancelada com sucesso.');
    } catch (error) {
      setErroCancelamento(error.message || 'Não foi possível cancelar a reserva.');
    } finally {
      setCancelando(false);
    }
  }

  return (
    <main className="detalhe-reserva-page">
      <section className="detalhe-reserva-shell">
        {carregando && <p className="detalhe-reserva-feedback">Carregando reserva...</p>}

        {!carregando && erro && (
          <section className="detalhe-reserva-erro" role="alert">
            <h1>Não foi possível carregar</h1>
            <p>{erro}</p>
            <Link to="/historico-caronas">Voltar às reservas</Link>
          </section>
        )}

        {!carregando && reserva && !erro && (
          <>
            {mensagem && <p className="detalhe-reserva-sucesso" role="status">{mensagem}</p>}
            <header className={`detalhe-reserva-hero detalhe-reserva-hero--${classeStatus}`}>
              {['cancelada', 'recusada'].includes(classeStatus) ? <XCircle /> : <CheckCircle2 />}
              <div>
                <h1>{tituloStatus(reserva.status)}</h1>
                <div className="detalhe-reserva-hero-metas">
                  <span className="detalhe-reserva-papel"><UserRound size={14} /> {rotuloParticipacao(reserva.status)}</span>
                  <StatusReservaBadge status={reserva.status} compacto />
                </div>
              </div>
            </header>

            <section className="detalhe-reserva-card detalhe-reserva-trajeto">
              <div className="detalhe-reserva-mapa">
                <span><MapPin size={16} strokeWidth={2} aria-hidden="true" /> Trajeto</span>
                <svg viewBox="0 0 800 180" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M40 140 C 190 35, 430 145, 760 45" />
                  <circle cx="40" cy="140" r="9" /><circle cx="760" cy="45" r="9" />
                </svg>
              </div>
              <div className="detalhe-reserva-trajeto-corpo">
                <h2>{reserva.carona.origem || 'Origem'} <ArrowRight size={18} /> {reserva.carona.destino || 'Destino'}</h2>
                <dl className="detalhe-reserva-metricas">
                  <Item icone={<CalendarDays />} termo="Data" valor={formatarData(reserva.carona.dataViagem)} />
                  <Item icone={<Clock />} termo="Saída" valor={formatarHora(reserva.carona.dataViagem)} />
                </dl>
                {reserva.carona.paradas.length > 0 && <div className="detalhe-reserva-paradas"><h3>Pontos de parada</h3><ol>{reserva.carona.paradas.map((parada, indice) => <li key={parada}><b>{indice + 1}</b>{parada}</li>)}</ol></div>}
                <div className="detalhe-reserva-valor"><span>＄ Contribuição por passageiro</span><strong>{formatarMoeda(reserva.carona.valor)}</strong></div>
              </div>
            </section>

            <Card titulo="Motorista">
              <div className="detalhe-reserva-motorista">
                <Avatar motorista={reserva.motorista} />
                <div>
                  <strong>{reserva.motorista.nome}</strong>
                  {reserva.motorista.avaliacao !== null && reserva.motorista.avaliacao !== '' && (
                    <span><Star size={15} fill="currentColor" /> {formatarAvaliacao(reserva.motorista.avaliacao)}</span>
                  )}
                </div>
                <button
                  type="button"
                  className="detalhe-reserva-chat"
                  aria-label={`Conversar com ${reserva.motorista.nome}`}
                  onClick={() => navigate(
                    `/reservas/${reserva.id}/chat/${reserva.motorista.id}`,
                    { state: { passageiro: reserva.motorista, status: reserva.status } },
                  )}
                >
                  <MessageCircle size={18} aria-hidden="true" />
                </button>
              </div>
            </Card>

            <Card titulo="Datas da reserva">
              <dl className="detalhe-reserva-grid">
                <Item icone={<Users />} termo="Quantidade de passageiros" valor={formatarPassageiros(obterQuantidadeConfirmada(reserva))} />
                <Item icone={<Clock />} termo="Solicitada em" valor={formatarDataHora(reserva.dataSolicitacao)} />
                {reserva.dataResposta && <Item icone={<Clock />} termo="Respondida em" valor={formatarDataHora(reserva.dataResposta)} />}
              </dl>
            </Card>

            {reserva.passageiros.length > 0 && <Card titulo={`RESERVAS (${reserva.passageiros.length})`}>
              <div className="detalhe-reserva-reservas-topo"><span><Users size={16} /> {reserva.passageiros.length}/{reserva.carona.vagasTotais || reserva.passageiros.length} vagas</span></div>
              <ul className="detalhe-reserva-reservas">{reserva.passageiros.map((passageiro) => <li key={passageiro.id}><Link className="detalhe-reserva-avatar-link" to={`/usuarios/${passageiro.id}`} aria-label={`Ver perfil de ${passageiro.nome}`}><span className="detalhe-reserva-avatar">{passageiro.nome[0]}</span></Link><div><strong>{passageiro.nome}</strong>{passageiro.avaliacao !== null && <span><Star size={14} fill="currentColor" /> {formatarAvaliacao(passageiro.avaliacao)}</span>}</div><em>Confirmado</em></li>)}</ul>
            </Card>}

            {reserva.podeCancelar && (
              <button className="detalhe-reserva-cancelar" type="button" onClick={() => {
                setErroCancelamento('');
                setModalCancelamentoAberto(true);
              }}>
                Cancelar Reserva
              </button>
            )}
          </>
        )}
      </section>

      {modalCancelamentoAberto && reserva?.podeCancelar && (
        <div className="detalhe-reserva-modal-fundo" role="presentation" onMouseDown={() => !cancelando && setModalCancelamentoAberto(false)}>
          <section className="detalhe-reserva-modal" role="dialog" aria-modal="true" aria-labelledby="titulo-cancelar-reserva" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <h2 id="titulo-cancelar-reserva">Cancelar reserva</h2>
              <button type="button" aria-label="Fechar" disabled={cancelando} onClick={() => setModalCancelamentoAberto(false)}>
                <X size={19} />
              </button>
            </header>
            <p>Tem certeza que deseja cancelar sua reserva para esta carona?</p>
            <div className="detalhe-reserva-modal-resumo">
              <span>{reserva?.carona.origem} → {reserva?.carona.destino}</span>
              <strong>{formatarPassageiros(reserva?.quantidadePassageiros)}</strong>
            </div>
            {erroCancelamento && <p className="detalhe-reserva-modal-erro" role="alert">{erroCancelamento}</p>}
            <div className="detalhe-reserva-modal-acoes">
              <button type="button" className="voltar" disabled={cancelando} onClick={() => setModalCancelamentoAberto(false)}>Voltar</button>
              <button type="button" className="confirmar" disabled={cancelando} onClick={confirmarCancelamento}>
                {cancelando ? 'Cancelando...' : 'Confirmar cancelamento'}
              </button>
            </div>
          </section>
        </div>
      )}
      <NavegacaoInferior />
    </main>
  );
}

function Card({ titulo, children }) {
  return <section className="detalhe-reserva-card"><h2>{titulo}</h2>{children}</section>;
}

function Item({ icone, termo, valor }) {
  return <div className="detalhe-reserva-item"><span aria-hidden="true">{icone}</span><div><dt>{termo}</dt><dd>{valor || 'Não informado'}</dd></div></div>;
}

function Avatar({ motorista }) {
  const perfil = `/usuarios/${motorista.id}`;
  if (motorista.fotoPerfil) return <Link className="detalhe-reserva-avatar-link" to={perfil} aria-label={`Ver perfil de ${motorista.nome}`}><img src={motorista.fotoPerfil} alt={`Foto de ${motorista.nome}`} /></Link>;
  return <Link className="detalhe-reserva-avatar-link" to={perfil} aria-label={`Ver perfil de ${motorista.nome}`}><span className="detalhe-reserva-avatar">{motorista.nome?.trim()[0]?.toUpperCase() || 'M'}</span></Link>;
}

function formatarDataHora(valor) {
  if (!valor) return '';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return valor;
  return data.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatarData(valor) {
  if (!valor) return '—';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return valor;
  const hoje = new Date();
  return data.toDateString() === hoje.toDateString() ? 'Hoje' : data.toLocaleDateString('pt-BR');
}

function formatarHora(valor) {
  if (!valor) return '—';
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? valor : data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function tituloStatus(status) {
  if (status === 'FINALIZADA') return 'Carona concluída';
  if (status === 'CANCELADA') return 'Reserva cancelada';
  if (status === 'RECUSADA') return 'Reserva recusada';
  if (status === 'EXPIRADA') return 'Reserva expirada';
  if (status === 'PENDENTE') return 'Reserva pendente';
  return 'Reserva confirmada';
}

function rotuloParticipacao(status) {
  return ['PENDENTE', 'ATIVA', 'ACEITA', 'CONFIRMADA'].includes(status)
    ? 'Você é passageiro(a)'
    : 'Você foi passageiro(a)';
}

function formatarAvaliacao(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : valor;
}

function formatarPassageiros(valor) {
  const quantidade = Number(valor) || 1;
  return `${quantidade} ${quantidade === 1 ? 'passageiro(a)' : 'passageiros(as)'}`;
}

function obterQuantidadeConfirmada(reserva) {
  const confirmados = reserva.passageiros.filter((passageiro) =>
    ['ACEITA', 'CONFIRMADA', 'FINALIZADA'].includes(String(passageiro.status).toUpperCase()),
  );

  return confirmados.length || reserva.quantidadePassageiros;
}

export default DetalheReserva;
