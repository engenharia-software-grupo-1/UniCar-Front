import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Bike,
  Calendar,
  Car,
  Check,
  DollarSign,
  Loader2,
  MapPin,
  Users,
  X,
} from 'lucide-react';
import NavegacaoInferior from '../../components/layout/NavegacaoInferior.jsx';
import { editarCarona, obterCarona } from '../../services/caronaService.js';
import './style.css';

const STATUS_BLOQUEADOS = ['EM_ANDAMENTO', 'FINALIZADA', 'CANCELADA'];
const CONTRIBUICAO_MAX = 20;

const FORM_INICIAL = {
  origem: '',
  destino: '',
  data: '',
  horario: '',
  pontoEncontro: '',
  tipoVeiculo: 'carro',
  veiculoId: '',
  quantidadeVagas: 1,
  valorContribuicao: 0,
  observacoes: '',
};

function EditarCarona() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [carona, setCarona] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [formOriginal, setFormOriginal] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState('');
  const [errosCampos, setErrosCampos] = useState({});

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        setCarregando(true);
        setErro('');

        const detalhe = await obterCarona(id);

        if (!ativo) {
          return;
        }

        const formCarregado = toForm(detalhe);

        setCarona(detalhe);
        setForm(formCarregado);
        setFormOriginal(formCarregado);
      } catch (error) {
        if (ativo) {
          setErro(error.message || 'Não foi possível carregar os dados da carona.');
        }
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    }

    carregar();

    return () => {
      ativo = false;
    };
  }, [id]);

  const passageirosConfirmados = carona?.passageirosConfirmados ?? 0;
  const maximoVagas = form.tipoVeiculo === 'moto' ? 1 : 4;
  const minimoVagas = Math.max(1, passageirosConfirmados);
  const bloqueada = STATUS_BLOQUEADOS.includes(carona?.status);

  const preenchimentoContribuicao = useMemo(
    () => `${(Number(form.valorContribuicao || 0) / CONTRIBUICAO_MAX) * 100}%`,
    [form.valorContribuicao],
  );
  const temAlteracoes = useMemo(() => {
    if (!formOriginal) {
      return false;
    }

    return (
      JSON.stringify(montarDadosEditaveis(form)) !==
      JSON.stringify(montarDadosEditaveis(formOriginal))
    );
  }, [form, formOriginal]);

  function atualizar(campo, valor) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
    limparErro(campo);
  }

  function limparErro(campo) {
    setErrosCampos((atuais) => {
      if (!atuais[campo]) {
        return atuais;
      }

      const proximos = { ...atuais };
      delete proximos[campo];
      return proximos;
    });
  }

  function selecionarTipo(tipo) {
    setForm((atual) => ({
      ...atual,
      tipoVeiculo: tipo,
      quantidadeVagas: tipo === 'moto' ? 1 : Math.max(atual.quantidadeVagas, minimoVagas),
    }));
  }

  function voltar() {
    navigate(`/minhas-caronas/${id}`);
  }

  function validar() {
    const erros = {};

    if (!form.origem.trim()) {
      erros.origem = 'Informe o ponto de partida.';
    }

    if (!form.destino.trim()) {
      erros.destino = 'Informe o destino.';
    }

    if (!form.data) {
      erros.data = 'Informe a data.';
    }

    if (!form.horario) {
      erros.horario = 'Informe o horário.';
    }

    if (!form.pontoEncontro.trim()) {
      erros.pontoEncontro = 'Informe o ponto de encontro.';
    }

    if (Number(form.quantidadeVagas) < minimoVagas) {
      erros.quantidadeVagas = `Mantenha pelo menos ${minimoVagas} vaga(s).`;
    }

    return erros;
  }

  async function salvar() {
    if (bloqueada || salvando || !temAlteracoes) {
      return;
    }

    const erros = validar();

    if (Object.keys(erros).length > 0) {
      setErrosCampos(erros);
      return;
    }

    try {
      setSalvando(true);
      setErro('');

      await editarCarona(id, montarDadosEditaveis(form, carona));

      setSucesso(true);
      window.setTimeout(() => {
        navigate(`/minhas-caronas/${id}`, {
          state: { mensagem: 'Carona atualizada com sucesso.' },
        });
      }, 900);
    } catch (error) {
      setErro(error.message || 'Não foi possível salvar as alterações.');
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <main className="editar-carona-page">
        <section className="editar-carona-state">
          <Loader2 size={22} className="editar-carona-spin" />
          <p>Carregando dados da carona...</p>
        </section>
        <NavegacaoInferior />
      </main>
    );
  }

  if (sucesso) {
    return (
      <main className="editar-carona-page">
        <section className="editar-carona-success" role="status">
          <span>
            <Check size={40} />
          </span>
          <h2>Alterações salvas!</h2>
          <p>Redirecionando...</p>
        </section>
        <NavegacaoInferior />
      </main>
    );
  }

  return (
    <main className="editar-carona-page">
      <header className="editar-carona-topbar">
        <button type="button" className="editar-carona-back" onClick={voltar}>
          <ArrowLeft size={20} />
          Voltar
        </button>
        <h1>Editar carona</h1>
        <p>Atualize os detalhes desta carona.</p>
      </header>

      <section className="editar-carona-shell">
        {erro && (
          <div className="editar-carona-erro" role="alert">
            {erro}
          </div>
        )}

        {bloqueada && (
          <div className="editar-carona-aviso" role="note">
            <AlertTriangle size={18} />
            <span>
              Esta carona está <strong>{formatarStatus(carona.status)}</strong> e não pode mais ser editada.
            </span>
          </div>
        )}

        <fieldset className="editar-carona-form" disabled={bloqueada || salvando}>
          <section className="editar-carona-card">
            <h2>Trajeto e horário</h2>

            <Campo
              icon={MapPin}
              label="Ponto de partida"
              value={form.origem}
              erro={errosCampos.origem}
              onChange={(valor) => atualizar('origem', valor)}
            />
            <Campo
              icon={MapPin}
              label="Destino"
              value={form.destino}
              erro={errosCampos.destino}
              onChange={(valor) => atualizar('destino', valor)}
            />

            <div className="editar-carona-linha">
              <Campo
                type="date"
                icon={Calendar}
                label="Data"
                value={form.data}
                erro={errosCampos.data}
                onChange={(valor) => atualizar('data', valor)}
              />
              <Campo
                type="time"
                label="Horário"
                value={form.horario}
                erro={errosCampos.horario}
                onChange={(valor) => atualizar('horario', valor)}
              />
            </div>

            <Campo
              icon={MapPin}
              label="Ponto de encontro"
              value={form.pontoEncontro}
              erro={errosCampos.pontoEncontro}
              onChange={(valor) => atualizar('pontoEncontro', valor)}
            />

          </section>

          <section className="editar-carona-card">
            <h2>Veículo e vagas</h2>

            <fieldset className="editar-carona-tipo">
              <legend>Tipo de veículo</legend>
              <div>
                <button
                  type="button"
                  className={form.tipoVeiculo === 'carro' ? 'ativo' : ''}
                  aria-pressed={form.tipoVeiculo === 'carro'}
                  onClick={() => selecionarTipo('carro')}
                >
                  <Car size={18} />
                  Carro
                </button>
                <button
                  type="button"
                  className={form.tipoVeiculo === 'moto' ? 'ativo' : ''}
                  aria-pressed={form.tipoVeiculo === 'moto'}
                  onClick={() => selecionarTipo('moto')}
                >
                  <Bike size={18} />
                  Moto
                </button>
              </div>
            </fieldset>

            <div className="editar-carona-campo">
              <span className="editar-carona-label">
                <Users size={14} />
                Número de vagas: {form.quantidadeVagas}
              </span>
              <input
                type="range"
                min={minimoVagas}
                max={maximoVagas}
                value={Math.min(maximoVagas, Math.max(minimoVagas, form.quantidadeVagas))}
                onChange={(event) => atualizar('quantidadeVagas', Number(event.target.value))}
                disabled={form.tipoVeiculo === 'moto'}
              />
              <p>
                {passageirosConfirmados} vaga(s) já ocupada(s). Não é possível reduzir abaixo desse valor.
              </p>
              {errosCampos.quantidadeVagas && (
                <span className="editar-carona-erro-campo">{errosCampos.quantidadeVagas}</span>
              )}
            </div>

            <div className="editar-carona-campo">
              <span className="editar-carona-label">
                <DollarSign size={14} />
                Contribuição por passageiro: {formatarValor(form.valorContribuicao)}
              </span>
              <input
                type="range"
                min={0}
                max={CONTRIBUICAO_MAX}
                value={form.valorContribuicao}
                style={{ '--preenchido': preenchimentoContribuicao }}
                onChange={(event) => atualizar('valorContribuicao', Number(event.target.value))}
              />
            </div>
          </section>

          <section className="editar-carona-card">
            <h2>Observações</h2>
            <textarea
              value={form.observacoes}
              onChange={(event) => atualizar('observacoes', event.target.value)}
              placeholder="Ex: aceito até 3 paradas, sem fumantes..."
            />
          </section>
        </fieldset>
      </section>

      <div className="editar-carona-acoes">
        <button type="button" className="editar-carona-cancelar" onClick={voltar} disabled={salvando}>
          <X size={18} />
          Cancelar
        </button>
        <button
          type="button"
          className="editar-carona-salvar"
          onClick={salvar}
          disabled={bloqueada || salvando || !temAlteracoes}
          title={!temAlteracoes ? 'Faça alguma alteração para salvar' : undefined}
        >
          {salvando ? <Loader2 size={18} className="editar-carona-spin" /> : <Check size={18} />}
          {salvando ? 'Salvando...' : temAlteracoes ? 'Salvar alterações' : 'Sem alterações'}
        </button>
      </div>

      <NavegacaoInferior />
    </main>
  );
}

function Campo({ icon: Icon, label, value, onChange, erro, type = 'text' }) {
  return (
    <label className="editar-carona-campo">
      <span className="editar-carona-label">{label}</span>
      <div className="editar-carona-input">
        {Icon && <Icon size={18} />}
        <input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
      </div>
      {erro && <span className="editar-carona-erro-campo">{erro}</span>}
    </label>
  );
}

function toForm(carona) {
  const { data, horario } = separarDataHora(carona.dataHoraSaida);
  const tipoVeiculo = carona.veiculo?.tipo === 'moto' ? 'moto' : 'carro';

  return {
    origem: carona.origem || '',
    destino: carona.destino || '',
    data,
    horario,
    pontoEncontro: carona.pontoEncontro || '',
    tipoVeiculo,
    veiculoId: carona.veiculo?.id || '',
    quantidadeVagas: carona.quantidadeVagas || 1,
    valorContribuicao: Number(carona.valorContribuicao ?? 0),
    observacoes: '',
  };
}

function montarDadosEditaveis(formulario, carona = null) {
  return {
    veiculoId: Number(formulario.veiculoId || carona?.veiculo?.id || 0),
    origem: formulario.origem.trim(),
    destino: formulario.destino.trim(),
    pontoEncontro: formulario.pontoEncontro.trim(),
    dataHoraSaida: `${formulario.data}T${formulario.horario}:00`,
    quantidadeVagas: Number(formulario.quantidadeVagas),
    valorContribuicao: Number(formulario.valorContribuicao),
  };
}

function separarDataHora(valor) {
  if (!valor) {
    return { data: '', horario: '' };
  }

  const [data = '', horarioCompleto = ''] = valor.split('T');

  return {
    data,
    horario: horarioCompleto.slice(0, 5),
  };
}

function formatarValor(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function formatarStatus(status) {
  const rotulos = {
    EM_ANDAMENTO: 'em andamento',
    FINALIZADA: 'finalizada',
    CANCELADA: 'cancelada',
  };

  return rotulos[status] || status?.toLowerCase() || 'indisponível';
}

export default EditarCarona;
