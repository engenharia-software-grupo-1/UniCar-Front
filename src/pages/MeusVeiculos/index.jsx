import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import {
  listarVeiculos,
  criarVeiculo,
  atualizarVeiculo,
  deletarVeiculo,
} from '../../services/vehicleService.js';
import './style.css';

const PLACA_REGEX = /^[A-Z]{3}-?\d[A-Z0-9]\d{2}$/;

function MeusVeiculos() {
  const navigate = useNavigate();

  const [veiculos, setVeiculos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  const [modo, setModo] = useState('lista');
  const [veiculoEmEdicao, setVeiculoEmEdicao] = useState(null);

  const [modelo, setModelo] = useState('');
  const [placa, setPlaca] = useState('');
  const [cor, setCor] = useState('');
  const [erroForm, setErroForm] = useState('');
  const [salvando, setSalvando] = useState(false);

  const [confirmandoExclusao, setConfirmandoExclusao] = useState(null);
  const [excluindo, setExcluindo] = useState(false);

  async function carregarVeiculos() {
    try {
      setLoading(true);
      setErro('');

      const dados = await listarVeiculos();

      setVeiculos(dados);
    } catch (error) {
      setErro(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let ativo = true;

    async function carregarInicial() {
      try {
        const dados = await listarVeiculos();

        if (!ativo) {
          return;
        }

        setVeiculos(dados);
        setErro('');
      } catch (error) {
        if (ativo) {
          setErro(error.message);
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

  function abrirCadastro() {
    setVeiculoEmEdicao(null);
    setModelo('');
    setPlaca('');
    setCor('');
    setErroForm('');
    setModo('form');
  }

  function abrirEdicao(veiculo) {
    setVeiculoEmEdicao(veiculo);
    setModelo(veiculo.modelo);
    setPlaca(veiculo.placa);
    setCor(veiculo.cor);
    setErroForm('');
    setModo('form');
  }

  function voltarParaLista() {
    setModo('lista');
    setVeiculoEmEdicao(null);
    setErroForm('');
  }

  async function submitFormulario(event) {
    event.preventDefault();

    setErroForm('');

    const modeloLimpo = modelo.trim();
    const placaLimpa = placa.trim().toUpperCase();
    const corLimpa = cor.trim();

    if (!modeloLimpo || !placaLimpa || !corLimpa) {
      setErroForm('Preencha modelo, placa e cor.');
      return;
    }

    if (!PLACA_REGEX.test(placaLimpa)) {
      setErroForm('Informe uma placa válida (ex.: ABC-1234 ou ABC1D23).');
      return;
    }

    const dados = { modelo: modeloLimpo, placa: placaLimpa, cor: corLimpa };

    try {
      setSalvando(true);

      if (veiculoEmEdicao) {
        await atualizarVeiculo(veiculoEmEdicao.id, dados);
      } else {
        await criarVeiculo(dados);
      }

      await carregarVeiculos();
      voltarParaLista();
    } catch (error) {
      setErroForm(error.message);
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarExclusao() {
    if (!confirmandoExclusao) {
      return;
    }

    try {
      setExcluindo(true);

      await deletarVeiculo(confirmandoExclusao.id);

      await carregarVeiculos();
      setConfirmandoExclusao(null);
    } catch (error) {
      setErro(error.message);
      setConfirmandoExclusao(null);
    } finally {
      setExcluindo(false);
    }
  }

  if (loading) {
    return (
      <main className="veiculos-page">
        <section className="veiculos-card">
          <p className="veiculos-loading">Carregando veículos...</p>
        </section>
      </main>
    );
  }

  if (erro) {
    return (
      <main className="veiculos-page">
        <section className="veiculos-card">
          <h1>Meus veículos</h1>

          <div className="veiculos-error">{erro}</div>

          <div className="veiculos-actions">
            <button type="button" onClick={carregarVeiculos}>
              Tentar novamente
            </button>

            <button
              type="button"
              className="secondary"
              onClick={() => navigate('/perfil')}
            >
              Voltar para o perfil
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (modo === 'form') {
    return (
      <main className="veiculos-page">
        <section className="veiculos-card">
          <div className="veiculos-header">
            <div>
              <h1>{veiculoEmEdicao ? 'Editar veículo' : 'Cadastrar veículo'}</h1>
              <p>Informe os dados do veículo.</p>
            </div>
          </div>

          <form className="veiculos-form" onSubmit={submitFormulario}>
            <VeiculoField
              label="Modelo"
              value={modelo}
              onChange={setModelo}
              placeholder="Ex.: Honda Civic"
              disabled={salvando}
            />

            <VeiculoField
              label="Placa"
              value={placa}
              onChange={setPlaca}
              placeholder="Ex.: ABC1D23"
              disabled={salvando}
            />

            <VeiculoField
              label="Cor"
              value={cor}
              onChange={setCor}
              placeholder="Ex.: Preto"
              disabled={salvando}
            />

            {erroForm && <div className="veiculos-error">{erroForm}</div>}

            <div className="veiculos-actions">
              <button
                type="button"
                className="secondary"
                onClick={voltarParaLista}
                disabled={salvando}
              >
                Cancelar
              </button>

              <button type="submit" disabled={salvando}>
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="veiculos-page">
      <section className="veiculos-card">
        <div className="veiculos-header">
          <div>
            <h1>Meus veículos</h1>
            <p>Gerencie os veículos cadastrados na sua conta.</p>
          </div>

          <button
            type="button"
            className="secondary"
            onClick={() => navigate('/perfil')}
          >
            Voltar
          </button>
        </div>

        <div className="veiculos-toolbar">
          <button type="button" onClick={abrirCadastro}>
            Cadastrar veículo
          </button>
        </div>

        {veiculos.length === 0 ? (
          <p className="veiculos-empty">Você ainda não cadastrou veículos.</p>
        ) : (
          <ul className="veiculos-lista">
            {veiculos.map((veiculo) => (
              <li key={veiculo.id} className="veiculos-item">
                <div className="veiculos-item__info">
                  <strong>{veiculo.modelo}</strong>
                  <span>
                    {veiculo.placa} · {veiculo.cor}
                  </span>
                </div>

                <div className="veiculos-item__actions">
                  <button type="button" onClick={() => abrirEdicao(veiculo)}>
                    Editar
                  </button>

                  <button
                    type="button"
                    className="danger"
                    onClick={() => setConfirmandoExclusao(veiculo)}
                  >
                    Excluir
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={Boolean(confirmandoExclusao)}
        danger
        title="Excluir veículo?"
        message={
          confirmandoExclusao
            ? `O veículo ${confirmandoExclusao.modelo} (${confirmandoExclusao.placa}) será removido. Esta ação não pode ser desfeita.`
            : ''
        }
        confirmLabel="Excluir"
        loadingLabel="Excluindo..."
        loading={excluindo}
        onConfirm={confirmarExclusao}
        onCancel={() => setConfirmandoExclusao(null)}
      />
    </main>
  );
}

function VeiculoField({ label, value, onChange, placeholder, disabled = false }) {
  return (
    <label className="veiculos-field">
      <span>{label}</span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export default MeusVeiculos;
