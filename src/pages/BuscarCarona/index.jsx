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
import { getSession } from '../../services/authService.js';
import { buscarSugestoesEndereco, geocodificarEndereco } from '../../services/geocodingService.js';
import './style.css';

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
const CARONAS_POR_PAGINA = 5;
// Raio de busca padrão (km). Espelha o default do backend (BuscaCaronaService,
// RAIO_PADRAO_KM = 5) e é o teto de proximidade origem-passageiro ↔ origem-carona.
const RAIO_PADRAO_KM = 5;
const RAIO_MAXIMO_KM = 50;

function useSugestoesEndereco(consulta, ativa) {
  const [sugestoes, setSugestoes] = useState([]);
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    const texto = consulta.trim();
    // Sem busca com campo inativo ou texto curto. Não é preciso limpar as
    // sugestões aqui: o dropdown só renderiza com o campo ativo e texto >= 3.
    if (!ativa || texto.length < 3) {
      return undefined;
    }

    let buscaAtiva = true;
    const timer = window.setTimeout(async () => {
      setBuscando(true);
      try {
        const resultados = await buscarSugestoesEndereco(texto);
        if (buscaAtiva) setSugestoes(resultados);
      } catch {
        if (buscaAtiva) setSugestoes([]);
      } finally {
        if (buscaAtiva) setBuscando(false);
      }
    }, 350);

    return () => {
      buscaAtiva = false;
      window.clearTimeout(timer);
    };
  }, [consulta, ativa]);

  return { sugestoes, buscando };
}

function BuscarCarona() {
  const navigate = useNavigate();
  const location = useLocation();
  const [origem, setOrigem] = useState(() => new URLSearchParams(location.search).get('origem') ?? '');
  const [destino, setDestino] = useState(() => new URLSearchParams(location.search).get('destino') ?? '');
  // Coordenadas resolvidas da origem/destino. A origem é obrigatória para a busca
  // por proximidade e vira o endereço de embarque do passageiro; guardar as
  // coordenadas aqui evita re-geocodificar o texto na hora de reservar.
  const [origemCoordenadas, setOrigemCoordenadas] = useState(null);
  const [destinoCoordenadas, setDestinoCoordenadas] = useState(null);
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
  // Filtros aplicados no backend (BuscaCaronaFiltroDTO): dia da viagem
  // (dataHoraSaida — filtrado por dia inteiro) e raio de proximidade (raioKm).
  const [dataBusca, setDataBusca] = useState('');
  const [raioKm, setRaioKm] = useState(RAIO_PADRAO_KM);
  const [campoEnderecoAtivo, setCampoEnderecoAtivo] = useState(null);
  const [quantidadeExibida, setQuantidadeExibida] = useState(CARONAS_POR_PAGINA);

  const sugestoesOrigem = useSugestoesEndereco(origem, campoEnderecoAtivo === 'origem');
  const sugestoesDestino = useSugestoesEndereco(destino, campoEnderecoAtivo === 'destino');
  const usuarioAtualId = identificarUsuario(getSession()?.usuario);



  useEffect(() => {
    const parametros = new URLSearchParams(location.search);
    const origemInicial = (parametros.get('origem') ?? '').trim();
    const destinoInicial = (parametros.get('destino') ?? '').trim();

    // Sem origem não há como filtrar por proximidade — o passageiro precisa
    // informar de onde sai. Não dispara busca automática nesse caso.
    if (!origemInicial) return undefined;

    let ativo = true;

    async function carregarCaronas() {
      try {
        setCarregando(true);
        setErroBusca('');
        setErroOrigem('');

        const origemGeo = await geocodificarEndereco(origemInicial);
        const coordsOrigem = { latitude: origemGeo.latitude, longitude: origemGeo.longitude };

        let coordsDestino = null;
        if (destinoInicial) {
          const destinoGeo = await geocodificarEndereco(destinoInicial).catch(() => null);
          if (destinoGeo) {
            coordsDestino = { latitude: destinoGeo.latitude, longitude: destinoGeo.longitude };
          }
        }

        if (!ativo) return;
        setOrigemCoordenadas(coordsOrigem);
        setDestinoCoordenadas(coordsDestino);

        const resultado = await buscarCaronas({
          origemCoordenadas: coordsOrigem,
          destinoCoordenadas: coordsDestino,
        });
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
    const motoristaId = identificarMotorista(carona);
    const vagas = Number(carona.vagasDisponiveis ?? carona.quantidadeVagas ?? 0);
    const preco = Number(carona.valorContribuicao ?? 0);
    if (usuarioAtualId && motoristaId && motoristaId === usuarioAtualId) return false;
    if (vagas < vagasMinimas || preco > precoMaximo) return false;
    return true;
  }), [caronas, precoMaximo, usuarioAtualId, vagasMinimas]);
  const caronasExibidas = caronasFiltradas.slice(0, quantidadeExibida);
  const temMaisCaronas = caronasFiltradas.length > quantidadeExibida;
  // Endereço de embarque levado ao detalhe da carona: quando já temos as
  // coordenadas da origem, vai o objeto completo (EnderecoDTO) — assim a reserva
  // não precisa re-geocodificar o texto. Sem coordenadas, cai no texto (fallback).
  const enderecoEmbarque = origemCoordenadas
    ? { descricao: origem, latitude: origemCoordenadas.latitude, longitude: origemCoordenadas.longitude }
    : origem;

  useEffect(() => {
    setQuantidadeExibida(CARONAS_POR_PAGINA);
  }, [caronasFiltradas]);

  async function realizarBusca() {
    setErroBusca('');
    setErroOrigem('');
    setErroDestino('');

    const origemTexto = origem.trim();
    if (!origemTexto) {
      setErroOrigem('Informe seu endereço de partida para ver caronas próximas.');
      return;
    }

    // A origem é obrigatória e precisa virar coordenadas (o backend filtra por
    // proximidade). Reaproveita as coordenadas já resolvidas via sugestão; se o
    // usuário só digitou, geocodifica o texto uma vez.
    let coordsOrigem = origemCoordenadas;
    if (!coordsOrigem) {
      try {
        const geo = await geocodificarEndereco(origemTexto);
        coordsOrigem = { latitude: geo.latitude, longitude: geo.longitude };
        setOrigemCoordenadas(coordsOrigem);
      } catch (erro) {
        setErroOrigem(erro.message || 'Não foi possível localizar seu endereço de partida.');
        return;
      }
    }

    // Destino é opcional e não bloqueia a busca se não resolver.
    let coordsDestino = destinoCoordenadas;
    if (!coordsDestino && destino.trim()) {
      try {
        const geo = await geocodificarEndereco(destino.trim());
        coordsDestino = { latitude: geo.latitude, longitude: geo.longitude };
        setDestinoCoordenadas(coordsDestino);
      } catch {
        coordsDestino = null;
      }
    }

    try {
      setCarregando(true);
      const resultado = await buscarCaronas({
        origemCoordenadas: coordsOrigem,
        destinoCoordenadas: coordsDestino,
        curso,
        genero,
        raioKm,
        // O backend filtra por DIA (ignora a hora), então mandamos o início do dia.
        dataHoraSaida: dataBusca ? `${dataBusca}T00:00:00` : undefined,
      });
      setCaronas(resultado);
      setBuscaRealizada(true);
    } catch (erro) {
      setErroBusca(erro.message || 'Não foi possível buscar as caronas.');
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
          <Field
            id="origem"
            icon={MapPin}
            placeholder="De onde você sai"
            value={origem}
            onChange={(valor) => {
              setOrigem(valor);
              // O texto não corresponde mais às coordenadas resolvidas: descarta
              // para forçar nova geocodificação na próxima busca.
              setOrigemCoordenadas(null);
            }}
            erro={erroOrigem}
            ativo={campoEnderecoAtivo === 'origem'}
            onFocus={() => setCampoEnderecoAtivo('origem')}
            onBlur={() => window.setTimeout(() => setCampoEnderecoAtivo(null), 150)}
            sugestoes={sugestoesOrigem.sugestoes}
            buscandoSugestoes={sugestoesOrigem.buscando}
            onSelect={(endereco) => {
              setOrigem(endereco.descricao);
              setOrigemCoordenadas({ latitude: endereco.latitude, longitude: endereco.longitude });
              setCampoEnderecoAtivo(null);
              setErroOrigem('');
            }}
          />
          <Field
            id="destino"
            icon={MapPin}
            placeholder="Para onde vai"
            value={destino}
            onChange={(valor) => {
              setDestino(valor);
              setDestinoCoordenadas(null);
            }}
            erro={erroDestino}
            ativo={campoEnderecoAtivo === 'destino'}
            onFocus={() => setCampoEnderecoAtivo('destino')}
            onBlur={() => window.setTimeout(() => setCampoEnderecoAtivo(null), 150)}
            sugestoes={sugestoesDestino.sugestoes}
            buscandoSugestoes={sugestoesDestino.buscando}
            onSelect={(endereco) => {
              setDestino(endereco.descricao);
              setDestinoCoordenadas({ latitude: endereco.latitude, longitude: endereco.longitude });
              setCampoEnderecoAtivo(null);
              setErroDestino('');
            }}
          />

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
              <div className="buscar-campo-data">
                <label htmlFor="filtro-data">Data da viagem</label>
                <input
                  id="filtro-data"
                  type="date"
                  value={dataBusca}
                  min={hojeISO()}
                  onChange={(evento) => setDataBusca(evento.target.value)}
                />
              </div>
              <RangeField label={`Raio de busca: ${raioKm} km`} min="1" max={String(RAIO_MAXIMO_KM)} value={raioKm} onChange={setRaioKm} />
              <RangeField label={`Vagas mínimas: ${vagasMinimas}`} min="1" max="4" value={vagasMinimas} onChange={setVagasMinimas} />
              <RangeField label={`Preço máximo: R$ ${precoMaximo}`} min="0" max="30" value={precoMaximo} onChange={setPrecoMaximo} />
              <div className="buscar-grid">
                <SelectField label="Curso" value={curso} options={CURSOS} onChange={setCurso} />
                <SelectField label="Gênero" value={genero} options={GENEROS} onChange={setGenero} />
              </div>
            </div>
          )}
        </div>

        {erroBusca && <div className="buscar-erro" role="alert">{erroBusca}</div>}

        {buscaRealizada && (
          <div className="buscar-resultado-topo">
            <p>
              {caronasFiltradas.length} carona
              {caronasFiltradas.length !== 1 && 's'} encontrada
              {caronasFiltradas.length !== 1 && 's'}
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
                  origemCoordenadas,
                  destinoCoordenadas,
                }}
              >
                <BellPlus size={15} />
                Criar alerta para este trajeto
              </Link>
            </div>
          )}
          {!carregando && caronasExibidas.map((carona) => (
            <RideCard key={carona.id} carona={carona} enderecoEmbarque={enderecoEmbarque} onOpenProfile={(id) => navigate(`/usuarios/${id}`)} />
          ))}
          {!carregando && temMaisCaronas && (
            <button
              type="button"
              className="buscar-mostrar-mais"
              onClick={() => setQuantidadeExibida((quantidade) => quantidade + CARONAS_POR_PAGINA)}
            >
              Mostrar mais caronas
            </button>
          )}
        </div>

      </section>
    </main>
  );
}

function identificarUsuario(usuario = {}) {
  const id = usuario.id ?? usuario.usuarioId ?? usuario.userId;

  return id == null ? '' : String(id);
}

// Data de hoje em YYYY-MM-DD (horário local) para o atributo `min` do seletor de
// data — não faz sentido buscar caronas em dias passados (o backend também filtra
// só caronas futuras).
function hojeISO() {
  const hoje = new Date();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');
  return `${hoje.getFullYear()}-${mes}-${dia}`;
}

function identificarMotorista(carona = {}) {
  const motorista = carona.motorista ?? carona.driver ?? carona.usuario ?? {};

  return identificarUsuario({
    id: motorista.id ?? motorista.usuarioId ?? motorista.userId ?? carona.motoristaId,
  });
}

function Field({
  id,
  icon: Icon,
  placeholder,
  value,
  onChange,
  erro,
  ativo,
  onFocus,
  onBlur,
  sugestoes,
  buscandoSugestoes,
  onSelect,
}) {
  const listaId = `buscar-sugestoes-${id}`;

  return (
    <div className="buscar-field-wrapper">
      <div className={`buscar-field${erro ? ' buscar-field--erro' : ''}`}>
        <Icon size={17} />
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={ativo && (buscandoSugestoes || sugestoes.length > 0)}
          aria-controls={listaId}
          onFocus={onFocus}
          onBlur={onBlur}
          onChange={(evento) => onChange(evento.target.value)}
        />
      </div>
      {ativo && value.trim().length >= 3 && (buscandoSugestoes || sugestoes.length > 0) && (
        <ul id={listaId} className="buscar-sugestoes-endereco" role="listbox">
          {buscandoSugestoes && <li className="buscar-sugestoes-status">Buscando endereços...</li>}
          {sugestoes.map((endereco) => (
            <li
              key={`${endereco.latitude}-${endereco.longitude}`}
              role="option"
              onMouseDown={(evento) => evento.preventDefault()}
              onClick={() => onSelect(endereco)}
            >
              <MapPin size={16} aria-hidden="true" />
              {endereco.descricao}
            </li>
          ))}
        </ul>
      )}
      {erro && <span className="buscar-field-erro">{erro}</span>}
    </div>
  );
}

function RangeField({ label, min, max, value, onChange }) {
  const minimo = Number(min);
  const maximo = Number(max);
  const preenchido = maximo > minimo
    ? ((Number(value) - minimo) / (maximo - minimo)) * 100
    : 0;

  return (
    <div className="buscar-range">
      <label>{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(evento) => onChange(Number(evento.target.value))}
        style={{ '--preenchido': `${preenchido}%` }}
      />
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
        {motorista.fotoUrl ? (
          <img src={motorista.fotoUrl} alt={`Foto de ${nome}`} />
        ) : (
          iniciais || 'U'
        )}
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
