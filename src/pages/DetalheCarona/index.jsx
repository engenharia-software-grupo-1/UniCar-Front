import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
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
  Shield,
  Star,
  UserMinus,
  UserCheck,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { listarPassageirosCarona, obterCarona, removerReservaCarona } from '../../services/caronaService.js';
import { getPerfilUsuarioAutenticado } from '../../services/profileService.js';
import { obterPerfilPublicoUsuario } from '../../services/publicProfileService.js';
import {
  aceitarReserva,
  criarReserva,
  listarReservasPendentesDaCarona,
  recusarReserva,
} from '../../services/reservaService.js';
import { geocodificarEndereco } from '../../services/geocodingService.js';
import './style.css';

const STATUS = {
  CRIADA: { rotulo: 'Aguardando', classe: 'aguardando' },
  EM_ANDAMENTO: { rotulo: 'Em andamento', classe: 'andamento' },
  FINALIZADA: { rotulo: 'Finalizada', classe: 'finalizada' },
  CANCELADA: { rotulo: 'Cancelada', classe: 'cancelada' },
};

const MOTIVOS_DENUNCIA = [
  'Comportamento inadequado',
  'Informações falsas',
  'Não compareceu',
  'Outro motivo',
];

function DetalheCarona() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [carona, setCarona] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [abaAtiva, setAbaAtiva] = useState('info');
  const [solicitada, setSolicitada] = useState(false);
  const [quantidadePassageiros, setQuantidadePassageiros] = useState('1');
  const [erroQuantidade, setErroQuantidade] = useState('');
  const [modalSolicitacaoAberto, setModalSolicitacaoAberto] = useState(false);
  const [enviandoSolicitacao, setEnviandoSolicitacao] = useState(false);
  const [erroSolicitacao, setErroSolicitacao] = useState('');
  const [bloqueado, setBloqueado] = useState(false);
  const [bloqueando, setBloqueando] = useState(false);
  const [modalBloqueioAberto, setModalBloqueioAberto] = useState(false);
  const [modalDenunciaAberto, setModalDenunciaAberto] = useState(false);
  const [motivoDenuncia, setMotivoDenuncia] = useState(MOTIVOS_DENUNCIA[0]);
  const [denunciaEnviada, setDenunciaEnviada] = useState(false);
  const [feedback, setFeedback] = useState(location.state?.mensagem || '');
  const [reservaParaRemover, setReservaParaRemover] = useState(null);
  const [removendoReserva, setRemovendoReserva] = useState(false);
  const [processandoSolicitacao, setProcessandoSolicitacao] = useState(null);
  const [solicitacoesPendentes, setSolicitacoesPendentes] = useState([]);
  const [passageirosConfirmados, setPassageirosConfirmados] = useState([]);
  const [carregandoSolicitacoes, setCarregandoSolicitacoes] = useState(false);
  const [erroSolicitacoes, setErroSolicitacoes] = useState('');

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
      if (location.state?.carona) {
        setCarona(prepararCaronaFallback(location.state.carona));
        setErro('');
      } else {
        setErro(error.message || 'Não foi possível carregar os detalhes da carona.');
      }
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

        const motoristaId = detalhe.motorista?.id ?? detalhe.motorista?.usuarioId;
        const ehMotoristaAutenticado = motoristaId != null && String(motoristaId) === String(perfilAutenticado?.id);
        const perfilMotorista = !detalhe.motorista?.curso && motoristaId != null && !ehMotoristaAutenticado
          ? await obterPerfilPublicoUsuario(motoristaId).catch(() => null)
          : null;
        const cursoMotorista = detalhe.motorista?.curso || perfilMotorista?.curso;
        const detalheComCurso = cursoMotorista
          ? { ...detalhe, motorista: { ...detalhe.motorista, curso: cursoMotorista } }
          : detalhe;

        if (!ativo) {
          return;
        }

        setCarona(detalheComCurso);
        setPerfil(perfilAutenticado);
        setErro('');
      } catch (error) {
        if (ativo) {
          if (location.state?.carona) {
            setCarona(prepararCaronaFallback(location.state.carona));
            setErro('');
          } else {
            setErro(error.message || 'Não foi possível carregar os detalhes da carona.');
          }
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
  }, [id, location.state]);

  const status = getStatus(carona?.status);
  const passageiros = useMemo(() => montarPassageiros(carona), [carona]);
  const motoristaDaCarona = carona?.motorista || {};
  const isMinhaCarona = location.state?.minhaCarona === true || Boolean(
    perfil && (!motoristaDaCarona.id || String(motoristaDaCarona.id) === String(perfil.id)),
  );
  const motorista = isMinhaCarona
    ? {
        ...motoristaDaCarona,
        nome: perfil?.nomeCompleto || motoristaDaCarona.nome,
        curso: perfil?.curso || motoristaDaCarona.curso,
        avaliacao: perfil?.avaliacao ?? motoristaDaCarona.avaliacao,
        fotoUrl: perfil?.fotoUrl || motoristaDaCarona.fotoUrl,
        verificado: perfil?.motoristaVerificado ?? motoristaDaCarona.verificado,
      }
    : motoristaDaCarona;
  const cursoMotorista = motorista.curso;
  const motoristaPerfilId = motorista.id ?? motorista.usuarioId ?? motorista.motoristaId ?? perfil?.id;
  const veiculo = carona?.veiculo || {};
  const destino = carona?.destino || 'Destino não informado';
  const destinoExibido = formatarDestino(destino, carona?.pontoEncontro);

  useEffect(() => {
    if (!isMinhaCarona) {
      return undefined;
    }

    let ativo = true;

    async function carregarSolicitacoes() {
      try {
        setCarregandoSolicitacoes(true);
        setErroSolicitacoes('');
        const [reservas, passageirosDaCarona] = await Promise.all([
          listarReservasPendentesDaCarona(id),
          listarPassageirosCarona(id),
        ]);
        if (ativo) {
          setSolicitacoesPendentes(reservas);
          setPassageirosConfirmados(passageirosDaCarona);
        }
      } catch (error) {
        if (ativo) setErroSolicitacoes(error.message || 'Não foi possível carregar as solicitações.');
      } finally {
        if (ativo) setCarregandoSolicitacoes(false);
      }
    }

    carregarSolicitacoes();
    return () => { ativo = false; };
  }, [id, isMinhaCarona]);

  const solicitacoesComoPassageiros = useMemo(
    () => solicitacoesPendentes.map(normalizarSolicitacaoComoPassageiro),
    [solicitacoesPendentes],
  );
  const itensPassageiros = isMinhaCarona
    ? [
        ...(passageirosConfirmados.length > 0 ? passageirosConfirmados : passageiros)
          .filter((passageiro) => passageiro.status !== 'Pendente'),
        ...solicitacoesComoPassageiros,
      ]
    : passageiros;

  async function responderSolicitacao(passageiro, acao) {
    try {
      setProcessandoSolicitacao(passageiro.reservaId);
      setFeedback('');
      const executar = acao === 'aceitar' ? aceitarReserva : recusarReserva;
      await executar(passageiro.reservaId);
      setCarona((atual) => atualizarSolicitacaoNaCarona(atual, passageiro, acao));
      setSolicitacoesPendentes((atuais) => atuais.filter(
        (solicitacao) => String(solicitacao.id) !== String(passageiro.reservaId),
      ));
      if (acao === 'aceitar') {
        // A API mantém os passageiros aceitos em uma lista separada das
        // solicitações pendentes; recarregá-la evita precisar atualizar a página.
        const passageirosAtualizados = await listarPassageirosCarona(id);
        setPassageirosConfirmados(passageirosAtualizados);
      }
      setFeedback(`Reserva de ${passageiro.nome} ${acao === 'aceitar' ? 'aceita' : 'recusada'} com sucesso.`);
    } catch (error) {
      setErro(error.message || `Não foi possível ${acao} a reserva.`);
    } finally {
      setProcessandoSolicitacao(null);
    }
  }

  function abrirConfirmacaoSolicitacao() {
    const quantidade = Number(quantidadePassageiros);
    const vagasDisponiveis = Number(carona?.vagasDisponiveis ?? 0);

    if (!quantidadePassageiros) {
      setErroQuantidade('Informe a quantidade de passageiros.');
      return;
    }
    if (!Number.isInteger(quantidade) || quantidade <= 0) {
      setErroQuantidade('A quantidade deve ser maior que zero.');
      return;
    }
    if (quantidade > vagasDisponiveis) {
      setErroQuantidade(`A quantidade não pode ultrapassar ${vagasDisponiveis} vaga(s).`);
      return;
    }

    setErroQuantidade('');
    setErroSolicitacao('');
    setModalSolicitacaoAberto(true);
  }

  async function confirmarSolicitacao() {
    // O endereço de embarque é o que o passageiro informou na busca, carregado
    // no location.state. Quando já vem com coordenadas (EnderecoDTO resolvido na
    // busca), usa direto; se vier só como texto (fallback), geocodifica aqui para
    // as coordenadas que o backend exige (origemEmbarque com latitude/longitude).
    const enderecoEmbarque = location.state?.enderecoEmbarque;

    if (!enderecoEmbarque) {
      setErroSolicitacao(
        'Informe seu endereço de embarque na busca antes de solicitar.',
      );
      return;
    }

    try {
      setEnviandoSolicitacao(true);
      setErroSolicitacao('');
      const origemEmbarque = temCoordenadas(enderecoEmbarque)
        ? enderecoEmbarque
        : await geocodificarEndereco(enderecoEmbarque);
      await criarReserva(carona.id, Number(quantidadePassageiros), origemEmbarque);
      setSolicitada(true);
      setModalSolicitacaoAberto(false);
      setFeedback('Solicitação de participação enviada com sucesso.');
    } catch (error) {
      setErroSolicitacao(error.message || 'Não foi possível enviar a solicitação.');
    } finally {
      setEnviandoSolicitacao(false);
    }
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
      setFeedback(error.message || 'Não foi possível remover a reserva.');
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
                  <Link
                    to={`/usuarios/${motoristaPerfilId}`}
                    className="detalhe-avatar"
                    aria-label={`Ver perfil de ${motorista.nome || 'motorista'}`}
                  >
                    {motorista.fotoUrl ? (
                      <img src={motorista.fotoUrl} alt={`Foto de ${motorista.nome || 'motorista'}`} />
                    ) : getInitial(motorista.nome)}
                  </Link>
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
                  <p>{cursoMotorista ? `${cursoMotorista} • UFCG` : 'UFCG'}</p>
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

            {!isMinhaCarona && (
              <section className="detalhe-card detalhe-request-card">
                <label htmlFor="quantidade-passageiros">Quantidade de passageiros</label>
                <div className={erroQuantidade ? 'detalhe-request-field is-error' : 'detalhe-request-field'}>
                  <Users size={18} />
                  <input
                    id="quantidade-passageiros"
                    type="number"
                    min="1"
                    max={Number(carona.vagasDisponiveis ?? 0)}
                    value={quantidadePassageiros}
                    disabled={solicitada || Number(carona.vagasDisponiveis ?? 0) <= 0}
                    onChange={(event) => {
                      setQuantidadePassageiros(event.target.value);
                      setErroQuantidade('');
                    }}
                  />
                </div>
                {erroQuantidade && <span className="detalhe-request-error">{erroQuantidade}</span>}
                <small>{formatarNumero(carona.vagasDisponiveis)} vaga(s) disponível(is)</small>
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
                {carregandoSolicitacoes && isMinhaCarona ? (
                  <div className="detalhe-card detalhe-empty-passengers">Carregando solicitações...</div>
                ) : erroSolicitacoes && isMinhaCarona ? (
                  <div className="detalhe-card detalhe-empty-passengers" role="alert">{erroSolicitacoes}</div>
                ) : (
                  <>
                    {isMinhaCarona && solicitacoesPendentes.length === 0 && (
                      <div className="detalhe-card detalhe-empty-passengers">
                        Não há solicitações pendentes.
                      </div>
                    )}
                    {!isMinhaCarona && itensPassageiros.length === 0 && (
                      <div className="detalhe-card detalhe-empty-passengers">
                        Não há passageiros nesta carona.
                      </div>
                    )}
                    {itensPassageiros.map((passageiro) => (
                      <article className="detalhe-card detalhe-passenger" key={passageiro.id}>
                    <Link
                      to={`/usuarios/${passageiro.id}`}
                      className="detalhe-avatar detalhe-avatar--small"
                      aria-label={`Ver perfil de ${passageiro.nome}`}
                      state={{ perfilFallback: passageiro }}
                    >
                      {getInitial(passageiro.nome)}
                    </Link>
                    <div className="detalhe-passenger__info">
                      <strong>{passageiro.nome}</strong>
                      <p>{passageiro.curso}</p>
                      <div className="detalhe-passenger__meta">
                        <span>
                          <Star size={13} fill="currentColor" />
                          {formatarAvaliacao(passageiro.avaliacao)}
                        </span>
                        <em className={passageiro.status === 'Confirmado' ? 'is-confirmed' : ''}>
                          {passageiro.status}
                        </em>
                      </div>
                      {passageiro.status === 'Pendente' && (
                        <div className="detalhe-passenger-request-info">
                          <span><Users size={14} /> {formatarQuantidadePassageiros(passageiro.quantidadePassageiros)}</span>
                          <span><Clock size={14} /> Solicitada em {formatarDataSolicitacao(passageiro.dataSolicitacao)}</span>
                        </div>
                      )}
                    </div>
                    {isMinhaCarona && (
                      <div className="detalhe-passenger__actions">
                        <button
                          type="button"
                          className="detalhe-passenger-chat"
                          aria-label={`Conversar com ${passageiro.nome}`}
                          onClick={() => navigate(
                            `/minhas-caronas/${carona.id}/chat/${passageiro.id}`,
                            { state: { passageiro, status: carona.status } },
                          )}
                        >
                          <MessageCircle size={17} aria-hidden="true" />
                        </button>
                        {passageiro.status === 'Confirmado' && (
                          <button
                            type="button"
                            className="detalhe-remove-reservation"
                            onClick={() => setReservaParaRemover(passageiro)}
                          >
                            <UserMinus size={16} />
                            Remover reserva
                          </button>
                        )}
                        {passageiro.status === 'Pendente' && (
                          <div className="detalhe-solicitacao__acoes">
                            <button type="button" className="is-accept" disabled={processandoSolicitacao === passageiro.reservaId} onClick={() => responderSolicitacao(passageiro, 'aceitar')}>
                              <UserCheck size={16} /> Aceitar
                            </button>
                            <button type="button" className="is-reject" disabled={processandoSolicitacao === passageiro.reservaId} onClick={() => responderSolicitacao(passageiro, 'recusar')}>
                              <XCircle size={16} /> Recusar
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                      </article>
                    ))}
                  </>
                )}
              </section>
            )}

          </>
        )}
      </section>

      {!carregando && !erro && !isMinhaCarona && (
        <div className="detalhe-sticky-action">
          <button
            type="button"
            onClick={abrirConfirmacaoSolicitacao}
            disabled={bloqueado || solicitada || Number(carona?.vagasDisponiveis ?? 0) <= 0}
          >
            {solicitada
              ? 'Solicitação enviada'
              : Number(carona?.vagasDisponiveis ?? 0) <= 0
                ? 'Sem vagas disponíveis'
                : 'Solicitar Participação'}
          </button>
        </div>
      )}

      {modalSolicitacaoAberto && (
        <Modal title="Confirmar solicitação" onClose={() => !enviandoSolicitacao && setModalSolicitacaoAberto(false)}>
          <div className="detalhe-request-summary">
            <p>Confira os dados antes de enviar:</p>
            <dl>
              <div><dt>Trajeto</dt><dd>{carona.origem} → {carona.destino}</dd></div>
              <div><dt>Passageiros</dt><dd>{formatarQuantidadePassageiros(quantidadePassageiros)}</dd></div>
              <div><dt>Contribuição por passageiro</dt><dd>{formatarValor(carona.valorContribuicao)}</dd></div>
            </dl>
            {erroSolicitacao && (
              <p className="detalhe-request-submit-error" role="alert">
                {erroSolicitacao}
              </p>
            )}
            <div className="detalhe-request-summary__actions">
              <button type="button" className="is-cancel" disabled={enviandoSolicitacao} onClick={() => setModalSolicitacaoAberto(false)}>Voltar</button>
              <button type="button" className="is-confirm" disabled={enviandoSolicitacao} onClick={confirmarSolicitacao}>
                {enviandoSolicitacao ? 'Enviando...' : 'Confirmar solicitação'}
              </button>
            </div>
          </div>
        </Modal>
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
            <X size={19} strokeWidth={2.5} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

function montarPassageiros(carona) {
  if (!carona || !Array.isArray(carona.passageiros)) {
    return [];
  }

  return carona.passageiros.map((passageiro, index) => ({
    id: passageiro.id || index,
    reservaId: passageiro.reservaId || passageiro.idReserva || passageiro.reservationId || passageiro.id || index,
    nome: passageiro.nome || passageiro.nomeCompleto || 'Passageiro',
    curso: passageiro.curso || 'Comunidade UFCG',
    avaliacao: passageiro.avaliacao || 4.8,
    status: normalizarStatusPassageiro(passageiro.status),
    quantidadePassageiros: passageiro.quantidadePassageiros || passageiro.quantidade || 1,
    dataSolicitacao: passageiro.dataSolicitacao || passageiro.createdAt || '',
  }));
}

function normalizarSolicitacaoComoPassageiro(solicitacao) {
  return {
    id: `solicitacao-${solicitacao.id}`,
    reservaId: solicitacao.id,
    nome: solicitacao.solicitante?.nome || 'Solicitante',
    curso: 'Comunidade UFCG',
    avaliacao: 4.8,
    status: 'Pendente',
    quantidadePassageiros: solicitacao.quantidadePassageiros || 1,
    dataSolicitacao: solicitacao.dataSolicitacao || '',
  };
}

function normalizarStatusPassageiro(status) {
  const valor = String(status || 'CONFIRMADO').toUpperCase();
  return valor === 'PENDENTE' ? 'Pendente' : 'Confirmado';
}

function formatarQuantidadePassageiros(valor) {
  const quantidade = Number(valor) || 1;
  return `${quantidade} ${quantidade === 1 ? 'passageiro(a)' : 'passageiros(as)'}`;
}

function formatarDataSolicitacao(valor) {
  if (!valor) return 'não informada';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return valor;
  return data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function atualizarSolicitacaoNaCarona(carona, passageiroAtualizado, acao) {
  if (!carona) {
    return carona;
  }

  const passageirosAtuais = Array.isArray(carona.passageiros)
    ? carona.passageiros
    : [];
  const corresponde = (passageiro) => String(
    passageiro.reservaId || passageiro.idReserva || passageiro.reservationId || passageiro.id,
  ) === String(passageiroAtualizado.reservaId);

  if (acao === 'recusar') {
    return {
      ...carona,
      passageiros: passageirosAtuais.filter((passageiro) => !corresponde(passageiro)),
    };
  }

  const quantidade = Number(passageiroAtualizado.quantidadePassageiros) || 1;
  const passageiroJaExiste = passageirosAtuais.some(corresponde);
  const passageiros = passageiroJaExiste
    ? passageirosAtuais.map((passageiro) => (
        corresponde(passageiro) ? { ...passageiro, status: 'Confirmado' } : passageiro
      ))
    : [...passageirosAtuais, { ...passageiroAtualizado, status: 'Confirmado' }];

  return {
    ...carona,
    passageiros,
    vagasDisponiveis: Math.max(0, Number(carona.vagasDisponiveis ?? 0) - quantidade),
  };
}

function removerPassageiroDaCarona(carona, passageiroRemovido) {
  if (!carona) {
    return carona;
  }

  const passageirosAtuais = Array.isArray(carona.passageiros)
    ? carona.passageiros
    : [];
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

  const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const hoje = new Date();
  const amanha = new Date(hoje);
  amanha.setDate(hoje.getDate() + 1);

  if (data.toDateString() === hoje.toDateString()) return `Hoje às ${hora}`;
  if (data.toDateString() === amanha.toDateString()) return `Amanhã às ${hora}`;
  return `${data.toLocaleDateString('pt-BR')} às ${hora}`;
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
  const placa = veiculo.placa || (veiculo.modelo ? 'JKL-0M12' : '');
  const partes = [veiculo.modelo, veiculo.cor, placa].filter(Boolean);

  return partes.length ? partes.join(' • ') : 'Não informado';
}

function prepararCaronaFallback(carona) {
  const veiculo = carona?.veiculo || {};
  return {
    ...carona,
    veiculo: {
      ...veiculo,
      modelo: veiculo.modelo || 'Mobi',
      cor: veiculo.cor || 'Azul',
      placa: veiculo.placa || 'JKL-0M12',
    },
  };
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

// O endereço de embarque já é um EnderecoDTO utilizável quando tem latitude e
// longitude numéricas; nesse caso não precisa (nem deve) re-geocodificar.
function temCoordenadas(endereco) {
  return Boolean(endereco)
    && typeof endereco === 'object'
    && Number.isFinite(Number(endereco.latitude))
    && Number.isFinite(Number(endereco.longitude));
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
