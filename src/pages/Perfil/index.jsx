import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  Car,
  ChevronRight,
  CircleHelp,
  Edit3,
  History,
  LogOut,
  RefreshCw,
  Shield,
  ShieldCheck,
  ShieldOff,
  Star,
  StarIcon,
  Trash2,
} from 'lucide-react';
import Confirmacao from '../../components/common/Confirmacao.jsx';
import NavegacaoInferior from '../../components/layout/NavegacaoInferior.jsx';
import BlockUserButton from './BlockUserButton.jsx';
import ConfirmBlockModal from './ConfirmBlockModal.jsx';
import AvaliarUsuarioModal from './AvaliarUsuarioModal.jsx';
import {
  atualizarPerfilUsuarioAutenticado,
  excluirContaUsuarioAutenticado,
  getPerfilUsuarioAutenticado,
} from '../../services/profileService.js';
import { getSession, logout } from '../../services/authService.js';
import { listarVeiculos } from '../../services/vehicleService.js';
import { criarAvaliacao, listarAvaliacoesRecebidas } from '../../services/avaliacaoService.js';
import { bloquearUsuario } from '../../services/blockUserService.js';
import { listarNotificacoes } from '../../services/notificationService.js';
import Logo from '../../components/common/Logo.jsx';
import './style.css';

// TODO temporário: alvo fixo usado apenas para exercitar o POST /avaliacoes.
// Remover quando o modal for acionado a partir de uma carona concluída, com
// caronaId/avaliadoId reais (ver README > "Avaliação de usuário (temporário)").
const AVALIAR_TESTE = { nome: 'Marina Souza', caronaId: 10, avaliadoId: 5 };

function Perfil() {
  const navigate = useNavigate();

  const [perfil, setPerfil] = useState(() => toPerfilFromSession());
  const [genero, setGenero] = useState(perfil.genero);
  const [recebeEmails, setRecebeEmails] = useState(perfil.recebeEmails);
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [mensagemSucesso, setMensagemSucesso] = useState('');
  const [telefone, setTelefone] = useState(perfil.telefone);
  const [curso, setCurso] = useState(perfil.curso);
  const [modalSairAberto, setModalSairAberto] = useState(false);
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false);
  const [modalBloquearAberto, setModalBloquearAberto] = useState(false);
  const [modalAvaliarAberto, setModalAvaliarAberto] = useState(false);
  const [enviandoAvaliacao, setEnviandoAvaliacao] = useState(false);
  const [excluindoConta, setExcluindoConta] = useState(false);
  const [bloqueandoUsuario, setBloqueandoUsuario] = useState(false);
  const [totalVeiculos, setTotalVeiculos] = useState(null);
  const [temNotificacaoNaoLida, setTemNotificacaoNaoLida] = useState(false);
  const [resumoAvaliacoes, setResumoAvaliacoes] = useState(() => ({
    media: Number(perfil.avaliacao) || 0,
    total: 0,
  }));
  const usuarioAutenticadoId = getSession()?.usuario?.id;
  const perfilUsuarioAlvo =
    perfil.id && usuarioAutenticadoId && String(perfil.id) !== String(usuarioAutenticadoId);

  useEffect(() => {
    let ativo = true;

    async function carregarPerfil() {
      try {
        const [dados, veiculos, avaliacoes, notificacoes] = await Promise.all([
          getPerfilUsuarioAutenticado(),
          listarVeiculos().catch(() => null),
          listarAvaliacoesRecebidas().catch(() => []),
          listarNotificacoes().catch(() => []),
        ]);

        if (!ativo) {
          return;
        }

        setPerfil(dados);
        setGenero(dados.genero);
        setRecebeEmails(dados.recebeEmails);
        setTelefone(dados.telefone);
        setCurso(dados.curso);
        setTotalVeiculos(Array.isArray(veiculos) ? veiculos.length : null);
        setResumoAvaliacoes(calcularResumoAvaliacoes(avaliacoes, dados.avaliacao));
        setTemNotificacaoNaoLida(
          Array.isArray(notificacoes) && notificacoes.some((notificacao) => !notificacao.lida),
        );
        setErro('');
      } catch (error) {
        if (ativo) {
          if (isErroDeAutenticacao(error)) {
            await logout();
            navigate('/login', { replace: true });
            return;
          }

          setErro(error.message || 'Não foi possível atualizar os dados do perfil.');
        }
      }
    }

    carregarPerfil();

    return () => {
      ativo = false;
    };
  }, [navigate]);

  async function salvarAlteracoes(event) {
    event.preventDefault();

    try {
      setSalvando(true);
      setErro('');
      setMensagemSucesso('');

      const perfilAtualizado = await atualizarPerfilUsuarioAutenticado({
        genero,
        recebeEmails,
        curso,
      });

      setPerfil((perfilAtual) => ({ ...perfilAtual, ...perfilAtualizado, telefone, curso }));
      setMensagemSucesso('Perfil atualizado com sucesso.');
      setEditando(false);
    } catch (error) {
      setErro(error.message || 'Não foi possível salvar as alterações.');
    } finally {
      setSalvando(false);
    }
  }

  async function sairDaConta() {
    await logout();
    navigate('/login', { replace: true });
  }

  async function confirmarExclusaoConta() {
    try {
      setExcluindoConta(true);
      await excluirContaUsuarioAutenticado();
      navigate('/login', { replace: true });
    } catch (error) {
      setErro(error.message || 'Não foi possível excluir a conta.');
      setModalExcluirAberto(false);
    } finally {
      setExcluindoConta(false);
    }
  }

  async function confirmarBloqueioUsuario() {
    try {
      setBloqueandoUsuario(true);
      setErro('');
      setMensagemSucesso('');

      const resultado = await bloquearUsuario(perfil.id);

      setPerfil((perfilAtual) => ({
        ...perfilAtual,
        isBlocked: resultado.isBlocked,
      }));
      setModalBloquearAberto(false);
      setMensagemSucesso(
        resultado.alreadyBlocked
          ? 'Usuário já estava bloqueado.'
          : 'Usuário bloqueado com sucesso',
      );
    } catch (error) {
      setErro(getMensagemErroBloqueio(error));
    } finally {
      setBloqueandoUsuario(false);
    }
  }

  // TODO temporário: acionado pelo botão de teste na tela de perfil.
  async function enviarAvaliacaoTeste({ nota, comentario }) {
    try {
      setEnviandoAvaliacao(true);
      setErro('');
      setMensagemSucesso('');

      await criarAvaliacao({
        caronaId: AVALIAR_TESTE.caronaId,
        avaliadoId: AVALIAR_TESTE.avaliadoId,
        nota,
        comentario,
      });

      setModalAvaliarAberto(false);
      setMensagemSucesso('Avaliação enviada com sucesso.');
    } catch (error) {
      setModalAvaliarAberto(false);
      setErro(error.message || 'Não foi possível enviar a avaliação.');
    } finally {
      setEnviandoAvaliacao(false);
    }
  }

  return (
    <main className="perfil-page">
      <header className="perfil-topbar">
        <Link to="/inicio" className="perfil-logo" aria-label="UniCar">
          <Logo />
        </Link>

        <button
          type="button"
          className="perfil-notification"
          aria-label="Notificações"
          onClick={() => navigate('/notificacoes')}
        >
          <Bell size={24} />
          {temNotificacaoNaoLida && <span />}
        </button>
      </header>

      <section className="perfil-shell">
        <section className="perfil-hero">
          <div className="perfil-avatar">{getInitials(perfil.nomeCompleto)}</div>

          <div className="perfil-hero-main">
            <h1>
              {formatarNome(perfil.nomeCompleto) || 'Usuário'}
              <ShieldCheck size={18} />
            </h1>
            <p>{perfil.curso ? `${perfil.curso} • UFCG` : 'UFCG'}</p>

            <div className="perfil-badges">
              <span className="perfil-badge perfil-badge--blue">
                <ShieldCheck size={14} />
                Matrícula validada
              </span>
              {perfil.motoristaVerificado && (
                <span className="perfil-badge perfil-badge--orange">
                  Motorista verificado
                </span>
              )}
            </div>

            <div className="perfil-rating">
              <span>
                <Star size={16} fill="currentColor" />
                {formatarMediaAvaliacoes(resumoAvaliacoes.media)}
              </span>
              <b />
              <span>{formatarTotalAvaliacoes(resumoAvaliacoes.total)}</span>
            </div>
          </div>

          {perfilUsuarioAlvo ? (
            <BlockUserButton
              isBlocked={perfil.isBlocked}
              loading={bloqueandoUsuario}
              onClick={() => setModalBloquearAberto(true)}
            />
          ) : (
            <button
              type="button"
              className="perfil-edit-button"
              aria-label="Editar perfil"
              onClick={() => setEditando((estadoAtual) => !estadoAtual)}
            >
              <Edit3 size={25} />
            </button>
          )}
        </section>

        {(erro || mensagemSucesso) && (
          <div
            className={erro ? 'perfil-message perfil-message--error' : 'perfil-message perfil-message--success'}
            role={erro ? 'alert' : 'status'}
          >
            {erro || mensagemSucesso}
          </div>
        )}

        <section className="perfil-dados" aria-labelledby="perfil-dados-titulo">
          <h2 id="perfil-dados-titulo">Dados cadastrais</h2>

          <div className="perfil-dados-grid">
            <PerfilDado label="Nome completo" value={perfil.nomeCompleto} />
            <PerfilDado label="Matrícula" value={perfil.matricula} />
            <PerfilDado label="CPF" value={perfil.cpf} />
            <PerfilDado label="E-mail institucional" value={perfil.emailInstitucional} />
            <PerfilDado label="Curso" value={perfil.curso} />
            <PerfilDado label="Gênero" value={perfil.genero} />
            <PerfilDado
              label="Recebimento de e-mails"
              value={perfil.recebeEmails ? 'Sim' : 'Não'}
            />
          </div>
        </section>

        <section className="perfil-menu" aria-label="Opções do perfil">
          <ProfileRow icon={History} label="Histórico de caronas" />
          <ProfileRow 
            icon={RefreshCw} 
            label="Trajetos recorrentes" 
            onClick={() => navigate('/trajetos-recorrentes')}/>
          <ProfileRow
            icon={StarIcon}
            label="Minhas avaliações"
            onClick={() => navigate('/avaliacoes-recebidas')}
          />
          <ProfileRow
            icon={Car}
            label="Meus veículos"
            meta={formatarTotalVeiculos(totalVeiculos)}
            onClick={() => navigate('/meus-veiculos')}
          />
          <ProfileRow
            icon={Bell}
            label="Notificações"
            onClick={() => navigate('/notificacoes')}
          />
          <ProfileRow
            icon={ShieldOff}
            label="Usuários bloqueados"
            onClick={() => navigate('/bloqueados')}
          />
          <ProfileRow
            icon={CircleHelp}
            label="Central de ajuda"
            onClick={() => navigate('/central-ajuda')}
          />
          <ProfileRow icon={Shield} label="Preferências de notificação" />
          {/* TODO temporário: gatilho de teste do POST /avaliacoes. Remover quando o
              modal for acionado a partir de uma carona concluída (ver README). */}
          <ProfileRow
            icon={Star}
            label="Avaliar usuário (temporário)"
            onClick={() => setModalAvaliarAberto(true)}
          />
        </section>

        <section className="perfil-account-menu" aria-label="Conta">
          <button type="button" onClick={() => setModalSairAberto(true)}>
            <LogOut size={21} />
            Sair da conta
          </button>

          <button
            type="button"
            className="perfil-delete-action"
            onClick={() => setModalExcluirAberto(true)}
          >
            <Trash2 size={21} />
            Excluir conta
          </button>
        </section>
      </section>

      <NavegacaoInferior />

      <Confirmacao
        open={modalSairAberto}
        title="Sair da conta?"
        message="Você será desconectado do UniCar e precisará entrar novamente para acessar sua conta."
        confirmLabel="Confirmar"
        onConfirm={sairDaConta}
        onCancel={() => setModalSairAberto(false)}
      />

      <Confirmacao
        open={modalExcluirAberto}
        danger
        title="Excluir conta?"
        message="Esta ação remove seu cadastro local do UniCar e encerra sua sessão no aplicativo."
        confirmLabel="Confirmar"
        loadingLabel="Excluindo..."
        loading={excluindoConta}
        onConfirm={confirmarExclusaoConta}
        onCancel={() => setModalExcluirAberto(false)}
      />

      <ConfirmBlockModal
        open={modalBloquearAberto}
        userName={formatarNome(perfil.nomeCompleto)}
        loading={bloqueandoUsuario}
        onConfirm={confirmarBloqueioUsuario}
        onCancel={() => setModalBloquearAberto(false)}
      />

      {/* TODO temporário: modal de avaliação acionado pelo botão de teste. */}
      {modalAvaliarAberto && (
        <AvaliarUsuarioModal
          userName={AVALIAR_TESTE.nome}
          loading={enviandoAvaliacao}
          onSubmit={enviarAvaliacaoTeste}
          onClose={() => setModalAvaliarAberto(false)}
        />
      )}

      {editando && (
        <div className="perfil-modal-overlay" onClick={() => setEditando(false)}>
          <form className="perfil-modal" onSubmit={salvarAlteracoes} onClick={(event) => event.stopPropagation()}>
            <h2>Editar perfil</h2>

            <label className="perfil-modal-field">
              <span>Nome</span>
              <input value={perfil.nomeCompleto || ''} disabled />
            </label>

            <label className="perfil-modal-field">
              <span>E-mail</span>
              <input value={perfil.emailInstitucional || ''} disabled />
            </label>

            <label className="perfil-modal-field">
              <span>Curso</span>
              <input
                value={curso || ''}
                disabled={salvando}
                placeholder="Ex: Ciência da Computação"
                onChange={(event) => setCurso(event.target.value)}
              />
            </label>

            <label className="perfil-modal-field">
              <span>Gênero</span>
              <div className="perfil-opcoes-genero" role="radiogroup" aria-label="Gênero">
                {['Não informado', 'Feminino', 'Masculino', 'Outro'].map((opcao) => (
                  <button
                    key={opcao}
                    type="button"
                    className={genero === opcao ? 'perfil-opcao-genero ativa' : 'perfil-opcao-genero'}
                    disabled={salvando}
                    role="radio"
                    aria-checked={genero === opcao}
                    onClick={() => setGenero(opcao)}
                  >
                    {opcao}
                  </button>
                ))}
              </div>
            </label>

            <label className="perfil-modal-field">
              <span>Telefone</span>
              <input
                value={telefone || ''}
                disabled={salvando}
                placeholder="(00) 00000-0000"
                onChange={(event) => setTelefone(event.target.value)}
              />
            </label>

            <label className="perfil-modal-checkbox">
              <input
                type="checkbox"
                checked={recebeEmails}
                disabled={salvando}
                onChange={(event) => setRecebeEmails(event.target.checked)}
              />
              <span>Quero receber e-mails do UniCar</span>
            </label>

            <div className="perfil-modal-actions">
              <button type="button" onClick={() => setEditando(false)} disabled={salvando}>
                Cancelar
              </button>
              <button type="submit" disabled={salvando}>
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

function ProfileRow({ icon: Icon, label, meta, onClick }) {
  return (
    <button type="button" className="perfil-row" onClick={onClick}>
      <span className="perfil-row-icon">
        <Icon size={21} />
      </span>
      <strong>{label}</strong>
      {meta && <em>{meta}</em>}
      <ChevronRight className="perfil-row-arrow" size={22} />
    </button>
  );
}

function PerfilDado({ label, value }) {
  const valorFormatado = label === 'Nome completo'
    ? formatarNome(value)
    : formatarValorPerfil(value);

  return (
    <div className="perfil-dado">
      <span>{label}</span>
      <strong>{valorFormatado}</strong>
    </div>
  );
}

function toPerfilFromSession() {
  const usuario = getSession()?.usuario || {};

  return {
    id: usuario.id ?? usuario.usuarioId ?? usuario.userId ?? '',
    nomeCompleto: usuario.nomeCompleto || usuario.nome || '',
    matricula: usuario.matricula || 'Não informado',
    cpf: usuario.cpf || 'Não informado',
    emailInstitucional: usuario.emailInstitucional || 'Não informado',
    telefone: usuario.telefone || '',
    curso: usuario.curso || '',
    genero: usuario.genero || 'Não informado',
    recebeEmails: usuario.recebeEmails ?? true,
    matriculaValidada: usuario.matriculaValidada ?? usuario.validado ?? usuario.verified ?? false,
    motoristaVerificado: usuario.motoristaVerificado ?? usuario.driverVerified ?? false,
    avaliacao: usuario.avaliacao ?? usuario.rating ?? '',
    totalCaronas: usuario.totalCaronas ?? usuario.ridesCount ?? usuario.quantidadeCaronas ?? '',
    isBlocked: usuario.isBlocked ?? usuario.bloqueado ?? usuario.blocked ?? false,
  };
}

function formatarValorPerfil(value) {
  return value || 'Não informado';
}

function getInitials(nome) {
  if (!nome || nome === 'Não informado') {
    return 'U';
  }

  return nome.trim()[0]?.toUpperCase() || 'U';
}

function formatarNome(nome = '') {
  return nome
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((parte) => parte[0].toUpperCase() + parte.slice(1))
    .join(' ');
}

function calcularResumoAvaliacoes(avaliacoes, avaliacaoFallback = 0) {
  if (!Array.isArray(avaliacoes) || avaliacoes.length === 0) {
    return {
      media: Number(avaliacaoFallback) || 0,
      total: 0,
    };
  }

  const notas = avaliacoes
    .map((avaliacao) => Number(avaliacao.nota))
    .filter((nota) => Number.isFinite(nota) && nota > 0);

  if (notas.length === 0) {
    return {
      media: Number(avaliacaoFallback) || 0,
      total: avaliacoes.length,
    };
  }

  const soma = notas.reduce((total, nota) => total + nota, 0);

  return {
    media: soma / notas.length,
    total: avaliacoes.length,
  };
}

function formatarMediaAvaliacoes(media = 0) {
  const numero = Number(media);

  if (!Number.isFinite(numero) || numero <= 0) {
    return '0';
  }

  return numero.toLocaleString('pt-BR', {
    minimumFractionDigits: Number.isInteger(numero) ? 0 : 1,
    maximumFractionDigits: 1,
  });
}

function formatarTotalAvaliacoes(total = 0) {
  const totalNumerico = Number(total) || 0;

  return `${totalNumerico} ${totalNumerico === 1 ? 'avaliação' : 'avaliações'}`;
}

function isErroDeAutenticacao(error) {
  return /não autenticado|nao autenticado|unauthorized|forbidden|acesso negado/i.test(
    error?.message || '',
  );
}

function getMensagemErroBloqueio(error) {
  if (error?.status === 409) {
    return 'Usuário já estava bloqueado.';
  }

  if (error?.status >= 500) {
    return 'Não foi possível bloquear o usuário agora. Tente novamente em instantes.';
  }

  return error?.message || 'Não foi possível bloquear o usuário.';
}

function formatarTotalVeiculos(total) {
  if (total === null) {
    return '';
  }

  return total === 1 ? '1 cadastrado' : `${total} cadastrados`;
}

export default Perfil;
