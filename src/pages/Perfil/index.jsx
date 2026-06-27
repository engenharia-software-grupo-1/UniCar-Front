import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  atualizarPerfilUsuarioAutenticado,
  excluirContaUsuarioAutenticado,
  getPerfilUsuarioAutenticado,
} from '../../services/profileService.js';
import './style.css';

function Perfil() {
  const navigate = useNavigate();

  const [perfil, setPerfil] = useState(null);
  const [genero, setGenero] = useState('');
  const [recebeEmails, setRecebeEmails] = useState(false);

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [mensagemSucesso, setMensagemSucesso] = useState('');

  const [modalExcluirAberto, setModalExcluirAberto] = useState(false);
  const [excluindoConta, setExcluindoConta] = useState(false);

  async function carregarPerfil() {
    try {
      setLoading(true);
      setErro('');
      setMensagemSucesso('');

      const dados = await getPerfilUsuarioAutenticado();

      setPerfil(dados);
      setGenero(dados.genero);
      setRecebeEmails(dados.recebeEmails);
    } catch (error) {
      setErro(error.message || 'Não foi possível carregar os dados do perfil.');
    } finally {
      setLoading(false);
    }
  }

  async function salvarAlteracoes(event) {
    event.preventDefault();

    try {
      setSalvando(true);
      setErro('');
      setMensagemSucesso('');

      const perfilAtualizado = await atualizarPerfilUsuarioAutenticado({
        genero,
        recebeEmails,
      });

      setPerfil(perfilAtualizado);
      setMensagemSucesso('Perfil atualizado com sucesso.');
    } catch (error) {
      setErro(error.message || 'Não foi possível salvar as alterações.');
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarExclusaoConta() {
    try {
      setExcluindoConta(true);
      setErro('');
      setMensagemSucesso('');

      await excluirContaUsuarioAutenticado();

      navigate('/login', { replace: true });
    } catch (error) {
      setErro(error.message || 'Não foi possível excluir a conta.');
      setModalExcluirAberto(false);
    } finally {
      setExcluindoConta(false);
    }
  }

  function cancelarExclusaoConta() {
    if (excluindoConta) {
      return;
    }

    setModalExcluirAberto(false);
  }

  useEffect(() => {
    async function carregarPerfilInicial() {
      await carregarPerfil();
    }

    carregarPerfilInicial();
  }, []);

  if (loading) {
    return (
      <main className="perfil-page">
        <section className="perfil-card perfil-card--center">
          <div className="perfil-loading-spinner" />
          <p className="perfil-loading-text">Carregando perfil...</p>
        </section>
      </main>
    );
  }

  if (!perfil && erro) {
    return (
      <main className="perfil-page">
        <section className="perfil-card">
          <div className="perfil-header">
            <div>
              <h1>Perfil do Usuário</h1>
              <p>Não foi possível consultar as informações cadastrais.</p>
            </div>
          </div>

          <div className="perfil-error">
            {erro}
          </div>

          <div className="perfil-actions">
            <button type="button" onClick={carregarPerfil}>
              Tentar novamente
            </button>

            <button
              type="button"
              className="perfil-secondary-button"
              onClick={() => navigate('/home')}
            >
              Voltar para Home
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="perfil-page">
      <section className="perfil-card">
        <div className="perfil-header">
          <div>
            <span className="perfil-tag">Perfil do usuário</span>
            <h1>Editar Perfil</h1>
            <p>
              Atualize apenas as informações permitidas pelo sistema.
            </p>
          </div>

          <button type="button" onClick={() => navigate('/home')}>
            Voltar para Home
          </button>
        </div>

        <div className="perfil-summary">
          <div className="perfil-avatar">
            {getInitials(perfil.nomeCompleto)}
          </div>

          <div>
            <h2>{perfil.nomeCompleto}</h2>
            <p>{perfil.emailInstitucional}</p>
          </div>
        </div>

        <form onSubmit={salvarAlteracoes} className="perfil-form">
          <div className="perfil-section">
            <h3>Informações não editáveis</h3>
            <p>
              Estes dados são recuperados do vínculo institucional e não podem ser alterados nesta tela.
            </p>

            <div className="perfil-grid">
              <ReadOnlyField label="Nome completo" value={perfil.nomeCompleto} />
              <ReadOnlyField label="Matrícula" value={perfil.matricula} />
              <ReadOnlyField label="CPF" value={perfil.cpf} />
              <ReadOnlyField label="E-mail institucional" value={perfil.emailInstitucional} />
              <ReadOnlyField label="Curso" value={perfil.curso} />
            </div>
          </div>

          <div className="perfil-section">
            <h3>Informações editáveis</h3>
            <p>
              Apenas os campos abaixo podem ser modificados pelo usuário.
            </p>

            <div className="perfil-edit-grid">
              <div className="perfil-form-group">
                <label htmlFor="genero">Gênero</label>

                <select
                  id="genero"
                  value={genero}
                  disabled={salvando}
                  onChange={(event) => setGenero(event.target.value)}
                >
                  <option value="Não informado">Não informado</option>
                  <option value="Feminino">Feminino</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Outro">Outro</option>
                  <option value="Prefiro não informar">Prefiro não informar</option>
                </select>
              </div>

              <label className="perfil-checkbox">
                <input
                  type="checkbox"
                  checked={recebeEmails}
                  disabled={salvando}
                  onChange={(event) => setRecebeEmails(event.target.checked)}
                />

                <span>
                  Desejo receber e-mails informativos do UniCar.
                </span>
              </label>
            </div>
          </div>

          {mensagemSucesso && (
            <div className="perfil-success">
              {mensagemSucesso}
            </div>
          )}

          {erro && (
            <div className="perfil-error">
              {erro}
            </div>
          )}

          <div className="perfil-actions perfil-actions--right">
            <button type="submit" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </form>

        <div className="perfil-section perfil-danger-zone">
          <div>
            <h3>Excluir Conta</h3>
            <p>
              Esta ação remove seu cadastro local do UniCar e encerra sua sessão no aplicativo.
              Para utilizar novamente, será necessário realizar um novo login.
            </p>
          </div>

          <button
            type="button"
            className="perfil-danger-button"
            onClick={() => setModalExcluirAberto(true)}
          >
            Excluir Conta
          </button>
        </div>
      </section>

      {modalExcluirAberto && (
        <div className="perfil-modal-overlay">
          <div className="perfil-modal">
            <h2>Confirmar exclusão</h2>

            <p>
              Tem certeza de que deseja excluir sua conta do UniCar?
              Esta ação removerá seu cadastro local e você será desconectado imediatamente.
            </p>

            <div className="perfil-modal-actions">
              <button
                type="button"
                className="perfil-secondary-button"
                onClick={cancelarExclusaoConta}
                disabled={excluindoConta}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="perfil-danger-button"
                onClick={confirmarExclusaoConta}
                disabled={excluindoConta}
              >
                {excluindoConta ? 'Excluindo...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function ReadOnlyField({ label, value }) {
  return (
    <div className="perfil-form-group">
      <label>{label}</label>

      <input
        type="text"
        value={value}
        disabled
        readOnly
      />
    </div>
  );
}

function getInitials(nome) {
  if (!nome || nome === 'Não informado') {
    return 'UC';
  }

  const partes = nome.trim().split(' ');

  if (partes.length === 1) {
    return partes[0].slice(0, 2).toUpperCase();
  }

  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}

export default Perfil;
