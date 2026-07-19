import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { buscarCaronas } from '../../services/caronaService.js';
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
  const navigate = useNavigate();
  const location = useLocation();
  const [origem, setOrigem] = useState(() => new URLSearchParams(location.search).get('origem') ?? '');
  const [destino, setDestino] = useState(() => new URLSearchParams(location.search).get('destino') ?? '');
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



  useEffect(() => {
    const parametros = new URLSearchParams(location.search);
    const origemInicial = parametros.get('origem') ?? '';
    const destinoInicial = parametros.get('destino') ?? '';

    let ativo = true;

    async function carregarCaronas() {
      try {
        setCarregando(true);
        setErroBusca('');
        const resultado = await buscarCaronas({ origem: origemInicial, destino: destinoInicial });
        if (ativo) {
          setCaronas(resultado);
          setBuscaRealizada(true);
        }
      } catch (erro) {
        if (ativo) setErroBusca(erro.message || 'Não foi possível buscar as caronas.');
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    carregarCaronas();
    return () => { ativo = false; };
  }, [location.search]);

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

  async function realizarBusca() {
    try {
      setCarregando(true);
      setErroBusca('');
      setErroOrigem('');
      setErroDestino('');
      const resultado = await buscarCaronas({ origem, destino, curso, genero ,
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
          {carregando && <div className="buscar-carregando">Buscando caronas...</div>}
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
          {!carregando && caronasFiltradas.map((carona) => (
            <RideCard key={carona.id} carona={carona} enderecoEmbarque={origem} onOpenProfile={(id) => navigate(`/usuarios/${id}`)} />
          ))}
        </div>

      </section>
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

function RideCard({ carona, enderecoEmbarque, onOpenProfile }) {
  const motorista = carona.motorista ?? {};
  const nome = carona.motoristaNome || motorista.nome || 'Motorista';
  const iniciais = nome.split(' ').slice(0, 2).map((parte) => parte[0]).join('').toUpperCase();
  const data = new Date(carona.dataHoraSaida);
  const dataValida = !Number.isNaN(data.getTime());
  const horario = dataValida ? data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--';
  const dia = dataValida ? data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '';
  const tipo = String(carona.veiculo?.tipo ?? carona.tipoVeiculo ?? 'Carro');
  const moto = tipo.toLowerCase().includes('moto');
  const perfilId = motorista.id ?? motorista.usuarioId ?? carona.motoristaId ?? slugify(nome);
  const recorrente = carona.recorrente || carona.recurring;
  const diasRecorrencia = carona.diasRecorrencia || carona.recurring?.days || [];

  return (
    <Link to={`/caronas/${carona.id}`} state={{ carona, origem: 'busca', enderecoEmbarque }} className="ride-card">
      <span
        role="link"
        tabIndex={0}
        className="ride-avatar"
        aria-label={`Ver perfil de ${nome}`}
        onClick={(evento) => {
          evento.preventDefault();
          evento.stopPropagation();
          onOpenProfile(perfilId);
        }}
        onKeyDown={(evento) => {
          if (evento.key === 'Enter' || evento.key === ' ') {
            evento.preventDefault();
            onOpenProfile(perfilId);
          }
        }}
      >
        {iniciais || 'U'}
      </span>
      <div className="ride-conteudo">
        <div className="ride-motorista">
          <strong>{nome}</strong>
          {(motorista.verificado || carona.motoristaVerificado) && <ShieldCheck size={14} />}
          {(motorista.avaliacao || carona.avaliacaoMotorista) && (
            <span className="ride-avaliacao"><Star size={12} /> {motorista.avaliacao || carona.avaliacaoMotorista}</span>
          )}
        </div>
        {(motorista.curso || carona.motoristaCurso) && <span className="ride-curso">{motorista.curso || carona.motoristaCurso}</span>}
        <div className="ride-route">
          <strong>{carona.origem?.descricao || carona.origem}</strong>
          <ArrowRight size={14} />
          <strong>{carona.destino?.descricao || carona.destino}</strong>
        </div>
        <span className={`ride-tipo ${moto ? 'moto' : 'carro'}`}>
          {moto ? <Bike size={12} /> : <Car size={12} />} {moto ? 'Moto' : 'Carro'}
        </span>
        {recorrente && (
          <span className="ride-recorrente">
            Recorrente{diasRecorrencia.length ? ` • ${diasRecorrencia.join('/')}` : ''}
          </span>
        )}
      </div>
      <div className="ride-resumo">
        <strong>{horario}</strong>
        <span>{dia}</span>
        <b>R$ {Number(carona.valorContribuicao ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b>
        <span>{carona.vagasDisponiveis ?? 0} vagas</span>
      </div>
    </Link>
  );
}

function slugify(valor = '') {
  return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, '-');
}

export default BuscarCarona;
