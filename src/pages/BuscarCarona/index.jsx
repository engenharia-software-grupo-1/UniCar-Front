import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BellPlus,
  BellRing,
  Bike,
  Car,
  MapPin,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  X,
  Users
} from 'lucide-react';
import NavegacaoInferior from '../../components/layout/NavegacaoInferior.jsx';
import { buscarCaronas } from '../../services/caronaService.js';
import { registrarInteresse } from '../../services/interesseService.js';
import './style.css';

const VEICULOS = ['Qualquer', 'Carro', 'Moto'];
const CURSOS = [
  'Qualquer',
  'Ciência da Computação',
  'Eng. Elétrica',
  'Eng. Mecânica',
  'Direito',
  'Medicina',
  'Letras',
];
const GENEROS = ['Qualquer', 'Feminino', 'Masculino', 'Outro'];

function BuscarCarona() {
  const [origem, setOrigem] = useState('');
  const [destino, setDestino] = useState('');
  const [curso, setCurso] = useState('Qualquer');
  const [genero, setGenero] = useState('Qualquer');
  const [erroOrigem, setErroOrigem] = useState('');
  const [erroDestino, setErroDestino] = useState('');
  const [erroBusca, setErroBusca] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [caronas, setCaronas] = useState([]);
  const [buscaRealizada, setBuscaRealizada] = useState(false);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [vagasMinimas, setVagasMinimas] = useState(1);
  const [precoMaximo, setPrecoMaximo] = useState(20);
  const [veiculo, setVeiculo] = useState('Qualquer');
  const [apenasVerificados, setApenasVerificados] = useState(false);

  

  const caronasFiltradas = useMemo(() => caronas.filter((carona) => {
    const vagas = Number(carona.vagasDisponiveis ?? carona.quantidadeVagas ?? 0);
    const preco = Number(carona.valorContribuicao ?? 0);
    const tipo = String(carona.veiculo?.tipo ?? carona.tipoVeiculo ?? '').toLowerCase();
    const verificado = Boolean(carona.motorista?.verificado ?? carona.motoristaVerificado);

    if (vagas < vagasMinimas || preco > precoMaximo) return false;
    if (veiculo !== 'Qualquer' && tipo && !tipo.includes(veiculo.toLowerCase())) return false;
    if (apenasVerificados && !verificado) return false;
    return true;
  }), [caronas, vagasMinimas, precoMaximo, veiculo, apenasVerificados]);

  function validarFormulario() {
    const origemValida = Boolean(origem.trim());
    const destinoValido = Boolean(destino.trim());
    setErroOrigem(origemValida ? '' : 'Por favor, informe a origem.');
    setErroDestino(destinoValido ? '' : 'Por favor, informe o destino.');
    return origemValida && destinoValido;
  }

  async function realizarBusca() {
    if (!validarFormulario()) return;

    try {
      setCarregando(true);
      setErroBusca('');

      const resultado = await buscarCaronas({
        origem,
        destino,
        curso,
        genero,
      });

      setCaronas(resultado);
      setBuscaRealizada(true);
    } catch (erro) {
      setErroBusca(
        erro.message || 'Não foi possível buscar as caronas.'
      );
    } finally {
      setCarregando(false);
    }
  }

  async function handleRegistrarInteresse() {
    try {
      await registrarInteresse({
        origem,
        destino,
      });
      alert('Interesse registrado com sucesso!');
    } catch (erro) {
      alert(
        erro.message ||
        'Não foi possível registrar o interesse.'
      );
    }
  }


  return (
    <main className="buscar-page">
      <section className="buscar-shell">
        <header className="buscar-cabecalho">
          <h1 className="buscar-title">Buscar caronas</h1>
          <Link
            to="/interesses"
            className="buscar-alertas-botao"
          >
            <BellRing size={15} />
            Meus alertas
          </Link>
        </header>

        <div className="buscar-formulario">
          <Field icon={MapPin} placeholder="De onde você sai" value={origem} onChange={setOrigem} erro={erroOrigem} />
          <Field icon={MapPin} placeholder="Para onde vai" value={destino} onChange={setDestino} erro={erroDestino} />

          <div className="buscar-acoes">
            <button type="button" className="buscar-botao" onClick={realizarBusca} disabled={carregando}>
              <Search size={17} />
              {carregando ? 'Buscando...' : 'Buscar'}
            </button>
            <button
              type="button"
              className={`buscar-filtros${mostrarFiltros ? ' ativo' : ''}`}
              onClick={() => setMostrarFiltros((visivel) => !visivel)}
              aria-label="Filtros"
              aria-expanded={mostrarFiltros}
            >
              <SlidersHorizontal size={17} />
            </button>
          </div>

          {mostrarFiltros && (
            <div className="buscar-painel-filtros">
              <RangeField label={`Vagas mínimas: ${vagasMinimas}`} min="1" max="4" value={vagasMinimas} onChange={setVagasMinimas} />
              <RangeField label={`Preço máximo: R$ ${precoMaximo}`} min="0" max="30" value={precoMaximo} onChange={setPrecoMaximo} />
              <div className="buscar-grid">
                <SelectField label="Curso" value={curso} options={CURSOS} onChange={setCurso} />
                <SelectField label="Gênero" value={genero} options={GENEROS} onChange={setGenero} />
              </div>
              <div>
                <label className="buscar-label">Veículo</label>
                <div className="buscar-veiculos">
                  {VEICULOS.map((tipo) => (
                    <button key={tipo} type="button" className={`buscar-veiculo${veiculo === tipo ? ' ativo' : ''}`} onClick={() => setVeiculo(tipo)}>
                      {tipo === 'Carro' && <Car size={14} />}
                      {tipo === 'Moto' && <Bike size={14} />}
                      {tipo}
                    </button>
                  ))}
                </div>
              </div>
              <label className="buscar-checkbox">
                <input type="checkbox" checked={apenasVerificados} onChange={(evento) => setApenasVerificados(evento.target.checked)} />
                <ShieldCheck size={15} />
                Apenas motoristas verificados
              </label>
            </div>
          )}
        </div>

        {erroBusca && <div className="buscar-erro" role="alert">{erroBusca}</div>}

        {buscaRealizada && (
          <div className="buscar-resultado-topo">
            <p>
              {caronasFiltradas.length} carona
              {caronasFiltradas.length !== 1 && 's'} encontradas
            </p>
          </div>
        )}

        <div className="buscar-lista">
          {!carregando && buscaRealizada && caronasFiltradas.length === 0 && (
            <div className="buscar-vazio">
              <p className="buscar-vazio-titulo">
                Nenhuma carona encontrada para este trajeto.
              </p>

              <p className="buscar-vazio-descricao">
                Deseja ser notificado quando alguém oferecer?
              </p>

              <Link
                to="/interesses"
                className="buscar-vazio-botao"
                state={{
                  origem,
                  destino,
                }}
              >
                <BellPlus size={15} />
                Criar alerta para este trajeto
              </Link>
            </div>
          )} 
          {!carregando && caronasFiltradas.map((carona) => <RideCard key={carona.id} carona={carona} />)}
        </div>
        
      </section>

      <NavegacaoInferior />
    </main>
  );
}

function Field({ icon: Icon, placeholder, value, onChange, erro }) {
  return (
    <div className="buscar-field-wrapper">
      <div className={`buscar-field${erro ? ' buscar-field--erro' : ''}`}>
        <Icon size={17} />
        <input type="text" placeholder={placeholder} value={value} onChange={(evento) => onChange(evento.target.value)} />
      </div>
      {erro && <span className="buscar-field-erro">{erro}</span>}
    </div>
  );
}

function RangeField({ label, min, max, value, onChange }) {
  return (
    <div className="buscar-range">
      <label>{label}</label>
      <input type="range" min={min} max={max} value={value} onChange={(evento) => onChange(Number(evento.target.value))} />
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div className="buscar-select">
      <label>{label}</label>
      <select value={value} onChange={(evento) => onChange(evento.target.value)}>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  );
}

function RideCard({ carona }) {
  const motorista = carona.motorista ?? {};
  const usuarioId =
    motorista.id ??
    carona.motoristaId ??
    carona.usuarioId;
  const nome =
    carona.motoristaNome ||
    motorista.nome ||
    'Motorista';
  const iniciais = nome
    .split(' ')
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('')
    .toUpperCase();
  const data = new Date(carona.dataHoraSaida);
  const dataValida = !Number.isNaN(data.getTime());
  const horario = dataValida
    ? data.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '--:--';
  const dia = dataValida
    ? data.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
      })
    : '';
  const tipo = String(
    carona.veiculo?.tipo ??
    carona.tipoVeiculo ??
    'Carro'
  );
  const moto = tipo.toLowerCase().includes('moto');

  return (
    <article className="ride-card">
      <Link
        to={`/usuarios/${usuarioId}`}
        className="ride-avatar-link"
      >
        <div className="ride-avatar">
          {iniciais || 'U'}
        </div>
      </Link>

      <div className="ride-conteudo">
        <div className="ride-motorista">
          <Link
            to={`/usuarios/${usuarioId}`}
            className="ride-motorista-link"
          >
            <strong>{nome}</strong>
          </Link>
          {(motorista.verificado ||
            carona.motoristaVerificado) && (
            <ShieldCheck size={14} />
          )}
          {(motorista.avaliacao ||
            carona.avaliacaoMotorista) && (
            <span className="ride-avaliacao">
              <Star size={12} />
              {motorista.avaliacao ||
                carona.avaliacaoMotorista}
            </span>
          )}
        </div>

        {(motorista.curso ||
          carona.motoristaCurso) && (
          <span className="ride-curso">
            {motorista.curso ||
              carona.motoristaCurso}
          </span>
        )}

        <div className="ride-route">
          <strong>
            {carona.origem?.descricao ||
              carona.origem}
          </strong>
          <ArrowRight size={14} />
          <strong>
            {carona.destino?.descricao ||
              carona.destino}
          </strong>
        </div>

        <div className="ride-footer">
          <span
            className={`ride-tipo ${
              moto ? 'moto' : 'carro'
            }`}
          >
            {moto
              ? <Bike size={12} />
              : <Car size={12} />}

            {moto ? 'Moto' : 'Carro'}
          </span>
          <span className="ride-vagas">
            <Users size={12} />
            {carona.vagasDisponiveis ?? 0} vaga(s)
          </span>
        </div>
      </div>

      <div className="ride-resumo">
        <strong>{horario}</strong>
        <span>{dia}</span>
        <b>
          R${' '}
          {Number(
            carona.valorContribuicao ?? 0
          ).toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
          })}
        </b>
      </div>
    </article>
  );
}

export default BuscarCarona;
