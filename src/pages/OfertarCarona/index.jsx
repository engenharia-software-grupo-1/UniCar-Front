import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Bike,
  Car,
  ChevronDown,
  DollarSign,
  History,
  MapPin,
  Plus,
  Repeat,
  Users,
} from 'lucide-react';
import { listarVeiculos } from '../../services/vehicleService.js';
import {
  geocodificarEndereco,
  buscarSugestoesEndereco,
  calcularDistanciaKm,
  calcularTetoContribuicao,
  contribuicaoMaxima,
} from '../../services/geocodingService.js';
import {
  buscarUltimaCaronaDoTrajeto,
  criarCarona,
  listarTrajetosRecorrentes,
  obterTrajetoRecorrente,
  OBSERVACAO_MAX,
} from '../../services/caronaService.js';
import {
  DIAS_SEMANA,
  expandirDatasDaRecorrencia,
  formatarDataHora,
} from '../../utils/recorrencia.js';
import './style.css';

const TOTAL_PASSOS = 3;
const VAGAS_CARRO = [1, 2, 3, 4];

// Veículo pode ter um atributo `tipo` ('carro' ou 'moto'). Quando ausente,
// tratamos como carro (regra da issue #31).
function tipoDoVeiculo(veiculo) {
  return veiculo?.tipo === 'moto' ? 'moto' : 'carro';
}

function descricaoVeiculo(veiculo) {
  return [veiculo.modelo, veiculo.cor, veiculo.placa].filter(Boolean).join(' • ');
}

function dataLocalISO(data) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}`;
}

function coordenadasDaRota(trajeto, campo) {
  const coordenadas = trajeto?.[`${campo}Coord`];
  const latitude = Number(coordenadas?.latitude);
  const longitude = Number(coordenadas?.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    descricao: trajeto[campo],
    latitude,
    longitude,
  };
}

function useSugestoesEndereco(consulta, ativa) {
  const [sugestoes, setSugestoes] = useState([]);
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    const texto = consulta.trim();
    if (!ativa || texto.length < 3) {
      return undefined;
    }

    let ativaBusca = true;
    const timer = window.setTimeout(async () => {
      setBuscando(true);
      try {
        const resultados = await buscarSugestoesEndereco(texto);
        if (ativaBusca) setSugestoes(resultados);
      } catch {
        // A sugestão é uma conveniência: a validação ao avançar continua
        // explicando qualquer falha de localização de forma acionável.
        if (ativaBusca) setSugestoes([]);
      } finally {
        if (ativaBusca) setBuscando(false);
      }
    }, 350);

    return () => {
      ativaBusca = false;
      window.clearTimeout(timer);
    };
  }, [consulta, ativa]);

  return { sugestoes, buscando };
}

function OfertarCarona() {
  const navigate = useNavigate();

  const location = useLocation();

  useEffect(() => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  // Definido quando o usuário chega por "Recriar viagem", vindo do detalhe de
  // um trajeto recorrente: pré-preenche o formulário com os dados do trajeto.
  const trajetoId = location.state?.trajetoId;
  const rascunhoOferta = location.state?.ofertaRascunho || {};

  const [passo, setPasso] = useState(rascunhoOferta.passo || 1);

  // Passo 1 — trajeto e horário.
  const [origem, setOrigem] = useState(rascunhoOferta.origem || '');
  const [destino, setDestino] = useState(rascunhoOferta.destino || '');
  const [pontoEncontro, setPontoEncontro] = useState(rascunhoOferta.pontoEncontro || '');
  const [observacao, setObservacao] = useState(rascunhoOferta.observacao || '');
  const [data, setData] = useState(rascunhoOferta.data || '');
  const [horario, setHorario] = useState(rascunhoOferta.horario || '');
  const [recorrente, setRecorrente] = useState(Boolean(rascunhoOferta.recorrente));
  const [diasRecorrencia, setDiasRecorrencia] = useState(rascunhoOferta.diasRecorrencia || []);
  const [trajetosRecorrentes, setTrajetosRecorrentes] = useState([]);

  // Sinaliza que veículo, vagas, contribuição e ponto de encontro vieram da
  // última viagem do motorista nesse trajeto — são sugestão, não fato.
  const [sugestaoDoHistorico, setSugestaoDoHistorico] = useState(false);

  // Passo 2 — veículo e vagas.
  const [tipoVeiculo, setTipoVeiculo] = useState(rascunhoOferta.tipoVeiculo || 'carro');
  const [veiculoId, setVeiculoId] = useState(rascunhoOferta.veiculoId || '');
  const [vagas, setVagas] = useState(rascunhoOferta.vagas || 1);
  const [contribuicao, setContribuicao] = useState(rascunhoOferta.contribuicao ?? 5);

  // Coordenadas resolvidas ao avançar do passo 1: alimentam o teto da contribuição
  // (passo 2) e são reusadas no publicar, sem geocodificar de novo.
  const [origemCoord, setOrigemCoord] = useState(rascunhoOferta.origemCoord || null);
  const [destinoCoord, setDestinoCoord] = useState(rascunhoOferta.destinoCoord || null);
  const [campoEnderecoAtivo, setCampoEnderecoAtivo] = useState(null);

  const [veiculos, setVeiculos] = useState([]);
  const [carregandoVeiculos, setCarregandoVeiculos] = useState(true);
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const [errosCampos, setErrosCampos] = useState({});
  const [erro, setErro] = useState('');
  const [publicando, setPublicando] = useState(false);
  const [geocodificando, setGeocodificando] = useState(false);

  const sugestoesOrigem = useSugestoesEndereco(origem, campoEnderecoAtivo === 'origem');
  const sugestoesDestino = useSugestoesEndereco(destino, campoEnderecoAtivo === 'destino');

  const distanciaKm = useMemo(
    () => (origemCoord && destinoCoord ? calcularDistanciaKm(origemCoord, destinoCoord) : null),
    [origemCoord, destinoCoord],
  );
  const tetoContribuicao = useMemo(
    () => (origemCoord && destinoCoord ? calcularTetoContribuicao(origemCoord, destinoCoord) : 0),
    [origemCoord, destinoCoord],
  );
  const contribuicaoMax = useMemo(() => contribuicaoMaxima(tetoContribuicao), [tetoContribuicao]);

  const dropdownRef = useRef(null);

  useEffect(() => {
    let ativo = true;

    async function carregarVeiculos() {
      try {
        const lista = await listarVeiculos();

        if (ativo) {
          setVeiculos(lista);
        }
      } catch (error) {
        if (ativo) {
          setErro(error.message || 'Não foi possível carregar seus veículos.');
        }
      } finally {
        if (ativo) {
          setCarregandoVeiculos(false);
        }
      }
    }

    carregarVeiculos();

    return () => {
      ativo = false;
    };
  }, []);

  // "Recriar viagem": o trajeto recorrente só define origem e destino (RN-TRJ-08).
  // Os demais campos vêm como sugestão editável, derivada da última carona do
  // motorista nesse mesmo trajeto — o motorista revisa tudo antes de publicar.
  // Data e horário ficam sempre em branco: a viagem nova precisa de uma data,
  // e isso força uma parada consciente no formulário.
  useEffect(() => {
    if (!trajetoId || location.state?.ofertaRascunho) {
      return undefined;
    }

    let ativo = true;

    async function preencherComTrajeto() {
      const trajeto = await obterTrajetoRecorrente(trajetoId);

      if (!ativo) {
        return;
      }

      setOrigem(trajeto.origem);
      setDestino(trajeto.destino);
      setOrigemCoord(coordenadasDaRota(trajeto, 'origem'));
      setDestinoCoord(coordenadasDaRota(trajeto, 'destino'));

      const ultima = await buscarUltimaCaronaDoTrajeto(trajeto.origem, trajeto.destino);

      if (!ativo || !ultima) {
        return;
      }

      const tipo = tipoDoVeiculo(ultima.veiculo);

      if (ultima.veiculo?.id) {
        setTipoVeiculo(tipo);
        setVeiculoId(ultima.veiculo.id);
      }

      if (ultima.pontoEncontro) {
        setPontoEncontro(ultima.pontoEncontro);
      }

      if (ultima.observacao) {
        setObservacao(ultima.observacao);
      }

      // Moto só admite 1 vaga (regra da issue #31).
      if (ultima.quantidadeVagas) {
        setVagas(
          tipo === 'moto'
            ? 1
            : Math.min(Number(ultima.quantidadeVagas), VAGAS_CARRO.length),
        );
      }

      if (ultima.valorContribuicao != null) {
        // O clamp ao teto do trajeto acontece em `avancar`, quando as coordenadas
        // (e portanto o máximo) são conhecidas.
        setContribuicao(Number(ultima.valorContribuicao));
      }

      setSugestaoDoHistorico(true);
    }

    // Pré-preencher é conveniência: se falhar, o motorista preenche na mão.
    preencherComTrajeto().catch(() => {});

    return () => {
      ativo = false;
    };
  }, [trajetoId]);

  useEffect(() => {
    let ativo = true;

    listarTrajetosRecorrentes()
      .then((lista) => {
        if (ativo) {
          setTrajetosRecorrentes(lista);
        }
      })
      // A lista de rotas frequentes é um atalho opcional: se falhar, o usuário
      // ainda preenche o trajeto na mão.
      .catch(() => {});

    return () => {
      ativo = false;
    };
  }, []);

  // Datas que serão efetivamente criadas — uma carona por data.
  const datasDaRecorrencia = useMemo(
    () =>
      data && horario
        ? expandirDatasDaRecorrencia({
            dataHoraSaida: `${data}T${horario}:00`,
            recorrente,
            diasRecorrencia,
          })
        : [],
    [data, horario, recorrente, diasRecorrencia],
  );

  const veiculosDoTipo = useMemo(
    () => veiculos.filter((veiculo) => tipoDoVeiculo(veiculo) === tipoVeiculo),
    [veiculos, tipoVeiculo],
  );

  const veiculoSelecionado = veiculos.find(
    (veiculo) => String(veiculo.id) === String(veiculoId),
  );

  const textoVeiculo = carregandoVeiculos
    ? 'Carregando veículos...'
    : veiculosDoTipo.length === 0
      ? 'Nenhum veículo cadastrado'
      : veiculoSelecionado
        ? descricaoVeiculo(veiculoSelecionado)
        : 'Selecione um veículo';

  // Fecha o dropdown ao clicar fora ou pressionar Esc.
  useEffect(() => {
    if (!dropdownAberto) {
      return undefined;
    }

    function aoClicarFora(evento) {
      if (dropdownRef.current && !dropdownRef.current.contains(evento.target)) {
        setDropdownAberto(false);
      }
    }

    function aoTeclar(evento) {
      if (evento.key === 'Escape') {
        setDropdownAberto(false);
      }
    }

    document.addEventListener('pointerdown', aoClicarFora);
    document.addEventListener('keydown', aoTeclar);

    return () => {
      document.removeEventListener('pointerdown', aoClicarFora);
      document.removeEventListener('keydown', aoTeclar);
    };
  }, [dropdownAberto]);

  const hojeISO = dataLocalISO(new Date());

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

  function alternarDia(dia) {
    setDiasRecorrencia((atual) =>
      atual.includes(dia)
        ? atual.filter((d) => d !== dia)
        : [...atual, dia],
    );
  }

  // A data/horário da carona precisa ser no futuro (RN-CAR-02).
  function dataHorarioNoPassado() {
    if (!data) {
      return false;
    }

    const agora = new Date();

    if (horario) {
      const alvo = new Date(`${data}T${horario}`);

      if (Number.isNaN(alvo.getTime())) {
        return false;
      }

      return alvo.getTime() <= agora.getTime();
    }

    const [ano, mes, dia] = data.split('-').map(Number);
    const alvo = new Date(ano, mes - 1, dia);
    const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());

    return alvo.getTime() < hoje.getTime();
  }

  function validarPasso1() {
    const erros = {};

    if (!origem.trim()) {
      erros.origem = 'Informe o ponto de partida.';
    }

    if (!destino.trim()) {
      erros.destino = 'Informe o destino.';
    }

    if (!data) {
      erros.data = 'Informe a data.';
    } else if (dataHorarioNoPassado()) {
      erros.data = 'A data deve ser no futuro.';
    }

    if (!horario) {
      erros.horario = 'Informe o horário.';
    }

    if (!pontoEncontro.trim()) {
      erros.pontoEncontro = 'Informe o ponto de encontro.';
    }

    // Sem nenhum dia marcado a recorrência não geraria carona alguma além da
    // data escolhida — marcar "recorrente" e não escolher dia não faz sentido.
    if (recorrente && diasRecorrencia.length === 0) {
      erros.diasRecorrencia = 'Selecione ao menos um dia da recorrência.';
    }

    return erros;
  }

  function validarPasso2() {
    const erros = {};

    if (!veiculoSelecionado) {
      erros.veiculo = 'Selecione um veículo.';
    }

    return erros;
  }

  // Moto só admite 1 vaga (regra da issue). Ao trocar o tipo, ajustamos o
  // veículo selecionado e as vagas.
  function selecionarTipo(tipo) {
    setTipoVeiculo(tipo);
    setVeiculoId('');
    setDropdownAberto(false);
    limparErro('veiculo');

    if (tipo === 'moto') {
      setVagas(1);
    }
  }

  function escolherVeiculo(veiculo) {
    setVeiculoId(String(veiculo.id));
    setDropdownAberto(false);
    limparErro('veiculo');
  }

  function cadastrarVeiculo() {
    navigate('/meus-veiculos', {
      state: {
        abrirCadastro: true,
        retorno: '/ofertar-carona',
        ofertaRascunho: {
          passo,
          origem,
          destino,
          pontoEncontro,
          observacao,
          data,
          horario,
          recorrente,
          diasRecorrencia,
          tipoVeiculo,
          veiculoId,
          vagas,
          contribuicao,
          origemCoord,
          destinoCoord,
        },
      },
    });
  }

  function selecionarEndereco(campo, endereco) {
    if (campo === 'origem') {
      setOrigem(endereco.descricao);
      setOrigemCoord(endereco);
    } else {
      setDestino(endereco.descricao);
      setDestinoCoord(endereco);
    }

    limparErro(campo);
    setCampoEnderecoAtivo(null);
  }

  async function avancar() {
    setErro('');

    const erros = passo === 1 ? validarPasso1() : validarPasso2();

    if (Object.keys(erros).length > 0) {
      setErrosCampos(erros);
      return;
    }

    setErrosCampos({});

    // Ao sair do passo 1, geocodificamos origem/destino para calcular o teto da
    // contribuição no passo 2. Sem coordenadas não há teto confiável, então
    // bloqueamos o avanço e pedimos endereços válidos (nada de fallback).
    if (passo === 1) {
      setGeocodificando(true);

      try {
        const origemGeo = origemCoord ?? (await geocodificarEndereco(origem));
        const destinoGeo = destinoCoord ?? (await geocodificarEndereco(destino));

        setOrigemCoord(origemGeo);
        setDestinoCoord(destinoGeo);

        const maximo = contribuicaoMaxima(calcularTetoContribuicao(origemGeo, destinoGeo));
        setContribuicao((atual) => Math.min(atual, maximo));
      } catch (error) {
        setErrosCampos({
          origem: error.message || 'Não foi possível localizar o endereço.',
          destino: error.message || 'Não foi possível localizar o endereço.',
        });
        return;
      } finally {
        setGeocodificando(false);
      }
    }

    setPasso((atual) => Math.min(TOTAL_PASSOS, atual + 1));
  }

  function voltar() {
    setErro('');
    setErrosCampos({});
    setPasso((atual) => Math.max(1, atual - 1));
  }

  async function publicar() {
    const erros = { ...validarPasso1(), ...validarPasso2() };

    if (Object.keys(erros).length > 0) {
      setErrosCampos(erros);
      setPasso(erros.veiculo && Object.keys(erros).length === 1 ? 2 : 1);
      return;
    }

    try {
      setPublicando(true);
      setErro('');

      // As coordenadas já foram resolvidas ao avançar do passo 1; só geocodificamos
      // de novo se por algum motivo faltarem (fluxo anômalo).
      const origemGeocodificada = origemCoord ?? (await geocodificarEndereco(origem));
      const destinoGeocodificado = destinoCoord ?? (await geocodificarEndereco(destino));

      // A recorrência vira uma carona por data: o serviço expande os dias
      // marcados e devolve a lista das caronas criadas.
      const criadas = await criarCarona({
        veiculoId: veiculoSelecionado.id,
        origem: origemGeocodificada,
        destino: destinoGeocodificado,
        pontoEncontro: pontoEncontro.trim(),
        observacao: observacao.trim(),
        dataHoraSaida: `${data}T${horario}:00`,
        quantidadeVagas: vagas,
        valorContribuicao: contribuicao,
        recorrente,
        diasRecorrencia: recorrente ? diasRecorrencia : [],
      });

      const quantidade = criadas?.length ?? 1;

      navigate('/minhas-caronas', {
        state: {
          mensagem:
            quantidade > 1
              ? `${quantidade} caronas publicadas com sucesso.`
              : 'Carona publicada com sucesso.',
        },
      });
    } catch (error) {
      setErro(error.message || 'Não foi possível publicar a carona.');
    } finally {
      setPublicando(false);
    }
  }

  const acoes = (
    <div className="ofertar-form-acoes">
      {passo > 1 && (
        <button type="button" className="ofertar-btn-secundario" onClick={voltar}>
          Voltar
        </button>
      )}

      {passo < TOTAL_PASSOS ? (
        <button
          type="button"
          className="ofertar-btn-primario"
          onClick={avancar}
          disabled={geocodificando}
        >
          {geocodificando ? 'Localizando...' : 'Continuar'}
        </button>
      ) : (
        <button
          type="button"
          className="ofertar-btn-publicar"
          onClick={publicar}
          disabled={publicando}
        >
          {publicando ? 'Publicando...' : 'Publicar carona'}
        </button>
      )}
    </div>
  );

  return (
    <main className="ofertar-page">
      <header className="ofertar-topbar">
        <h1>Ofertar carona</h1>
        <p>Passo {passo} de {TOTAL_PASSOS}</p>

        <div
          className="ofertar-breadcrumb"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={TOTAL_PASSOS}
          aria-valuenow={passo}
          aria-label={`Passo ${passo} de ${TOTAL_PASSOS}`}
        >
          {Array.from({ length: TOTAL_PASSOS }, (_, indice) => (
            <span key={indice} className={indice + 1 <= passo ? 'ativo' : ''} />
          ))}
        </div>
      </header>

      <section className="ofertar-shell">
        {erro && (
          <div className="ofertar-erro" role="alert">
            {erro}
          </div>
        )}

        {passo === 1 && (
          <div className="ofertar-card">
            <h2>Trajeto e horário</h2>

            {sugestaoDoHistorico && (
              <p className="ofertar-sugestao" role="status">
                <History size={14} aria-hidden="true" />
                Preenchemos veículo, vagas, contribuição e ponto de encontro com
                base na sua última viagem nesse trajeto. Confira antes de publicar.
              </p>
            )}

            <div className="ofertar-trajetos-recorrentes">
              <span className="ofertar-campo-titulo">
                <History size={14} />
                Reutilizar rota frequente
              </span>

              <div className="ofertar-trajetos-lista">
                {trajetosRecorrentes.map((trajeto) => (
                  <button
                    key={trajeto.id}
                    type="button"
                    className="ofertar-trajeto-card"
                    onClick={() => {
                      setOrigem(trajeto.origem);
                      setDestino(trajeto.destino);
                      setOrigemCoord(coordenadasDaRota(trajeto, 'origem'));
                      setDestinoCoord(coordenadasDaRota(trajeto, 'destino'));
                      limparErro('origem');
                      limparErro('destino');
                    }}
                  >
                    <strong>
                      {trajeto.origem} → {trajeto.destino}
                    </strong>

                    <small>
                      {trajeto.quantidadeViagens}x realizadas
                    </small>
                  </button>
                ))}
              </div>
            </div>

            <label className="ofertar-campo">
              <span>Ponto de partida</span>
              <div className="ofertar-endereco">
                <div className="ofertar-input">
                  <MapPin size={18} />
                  <input
                    type="text"
                    value={origem}
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={campoEnderecoAtivo === 'origem' && sugestoesOrigem.sugestoes.length > 0}
                    aria-controls="sugestoes-origem"
                    onFocus={() => setCampoEnderecoAtivo('origem')}
                    onBlur={() => window.setTimeout(() => setCampoEnderecoAtivo(null), 150)}
                    onChange={(evento) => {
                      setOrigem(evento.target.value);
                      setOrigemCoord(null);
                      limparErro('origem');
                    }}
                    placeholder="De onde você sai"
                  />
                </div>
                {campoEnderecoAtivo === 'origem' && origem.trim().length >= 3 && (sugestoesOrigem.buscando || sugestoesOrigem.sugestoes.length > 0) && (
                  <ul id="sugestoes-origem" className="ofertar-sugestoes-endereco" role="listbox">
                    {sugestoesOrigem.buscando && <li className="ofertar-sugestoes-status">Buscando endereços...</li>}
                    {sugestoesOrigem.sugestoes.map((endereco) => (
                      <li key={`${endereco.latitude}-${endereco.longitude}`} role="option" onMouseDown={(evento) => evento.preventDefault()} onClick={() => selecionarEndereco('origem', endereco)}>
                        <MapPin size={16} aria-hidden="true" />
                        {endereco.descricao}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {errosCampos.origem && (
                <span className="ofertar-erro-campo">{errosCampos.origem}</span>
              )}
            </label>

            <label className="ofertar-campo">
              <span>Destino</span>
              <div className="ofertar-endereco">
                <div className="ofertar-input">
                  <MapPin size={18} />
                  <input
                    type="text"
                    value={destino}
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={campoEnderecoAtivo === 'destino' && sugestoesDestino.sugestoes.length > 0}
                    aria-controls="sugestoes-destino"
                    onFocus={() => setCampoEnderecoAtivo('destino')}
                    onBlur={() => window.setTimeout(() => setCampoEnderecoAtivo(null), 150)}
                    onChange={(evento) => {
                      setDestino(evento.target.value);
                      setDestinoCoord(null);
                      limparErro('destino');
                    }}
                    placeholder="Para onde você vai"
                  />
                </div>
                {campoEnderecoAtivo === 'destino' && destino.trim().length >= 3 && (sugestoesDestino.buscando || sugestoesDestino.sugestoes.length > 0) && (
                  <ul id="sugestoes-destino" className="ofertar-sugestoes-endereco" role="listbox">
                    {sugestoesDestino.buscando && <li className="ofertar-sugestoes-status">Buscando endereços...</li>}
                    {sugestoesDestino.sugestoes.map((endereco) => (
                      <li key={`${endereco.latitude}-${endereco.longitude}`} role="option" onMouseDown={(evento) => evento.preventDefault()} onClick={() => selecionarEndereco('destino', endereco)}>
                        <MapPin size={16} aria-hidden="true" />
                        {endereco.descricao}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {errosCampos.destino && (
                <span className="ofertar-erro-campo">{errosCampos.destino}</span>
              )}
            </label>

            <div className="ofertar-linha">
              <label className="ofertar-campo">
                <span>Data</span>
                <input
                  type="date"
                  className="ofertar-input-simples"
                  value={data}
                  min={hojeISO}
                  onChange={(evento) => {
                    setData(evento.target.value);
                    limparErro('data');
                  }}
                />
                {errosCampos.data && (
                  <span className="ofertar-erro-campo">{errosCampos.data}</span>
                )}
              </label>

              <label className="ofertar-campo">
                <span>Horário</span>
                <input
                  type="time"
                  className="ofertar-input-simples"
                  value={horario}
                  onChange={(evento) => {
                    setHorario(evento.target.value);
                    limparErro('horario');
                    limparErro('data');
                  }}
                />
                {errosCampos.horario && (
                  <span className="ofertar-erro-campo">{errosCampos.horario}</span>
                )}
              </label>
            </div>

            <label className="ofertar-campo">
              <span>Ponto de encontro</span>
              <div className="ofertar-input">
                <MapPin size={18} />
                <input
                  type="text"
                  value={pontoEncontro}
                  onChange={(evento) => {
                    setPontoEncontro(evento.target.value);
                    limparErro('pontoEncontro');
                  }}
                  placeholder="Onde os passageiros te encontram"
                />
              </div>
              {errosCampos.pontoEncontro && (
                <span className="ofertar-erro-campo">{errosCampos.pontoEncontro}</span>
              )}
            </label>

            <label className="ofertar-checkbox">
              <input
                type="checkbox"
                checked={recorrente}
                onChange={(evento) => setRecorrente(evento.target.checked)}
              />
              <Repeat size={16} />
              Carona recorrente
            </label>

            {recorrente && (
              <>
                <div className="ofertar-dias-recorrencia" aria-label="Dias da recorrência">
                  {DIAS_SEMANA.map((dia) => (
                    <button
                      key={dia}
                      type="button"
                      aria-pressed={diasRecorrencia.includes(dia)}
                      className={
                        diasRecorrencia.includes(dia)
                          ? 'ofertar-dia ativo'
                          : 'ofertar-dia'
                      }
                      onClick={() => {
                        alternarDia(dia);
                        limparErro('diasRecorrencia');
                      }}
                    >
                      {dia}
                    </button>
                  ))}
                </div>

                {errosCampos.diasRecorrencia && (
                  <span className="ofertar-erro-campo">
                    {errosCampos.diasRecorrencia}
                  </span>
                )}
              </>
            )}

            {acoes}
          </div>
        )}

        {passo === 2 && (
          <div className="ofertar-card">
            <h2>Veículo e vagas</h2>

            <fieldset className="ofertar-tipo">
              <legend>Tipo de veículo</legend>

              <div className="ofertar-tipo-opcoes">
                <button
                  type="button"
                  className={tipoVeiculo === 'carro' ? 'ativo' : ''}
                  aria-pressed={tipoVeiculo === 'carro'}
                  onClick={() => selecionarTipo('carro')}
                >
                  <Car size={18} />
                  Carro
                </button>

                <button
                  type="button"
                  className={tipoVeiculo === 'moto' ? 'ativo' : ''}
                  aria-pressed={tipoVeiculo === 'moto'}
                  onClick={() => selecionarTipo('moto')}
                >
                  <Bike size={18} />
                  Moto
                </button>
              </div>
            </fieldset>

            <div className="ofertar-campo">
              <span>Veículo</span>
              <div className="ofertar-veiculo-controle">
                <div className="ofertar-dropdown" ref={dropdownRef}>
                  <button
                  type="button"
                  className="ofertar-dropdown-trigger"
                  aria-haspopup="listbox"
                  aria-expanded={dropdownAberto}
                  disabled={carregandoVeiculos || veiculosDoTipo.length === 0}
                  onClick={() => setDropdownAberto((aberto) => !aberto)}
                >
                  <span>{textoVeiculo}</span>
                  <ChevronDown size={18} aria-hidden="true" />
                </button>

                  {dropdownAberto && (
                    <ul className="ofertar-dropdown-lista" role="listbox" aria-label="Veículo">
                    {veiculosDoTipo.map((veiculo) => {
                      const selecionado = String(veiculo.id) === String(veiculoId);

                      return (
                        <li
                          key={veiculo.id}
                          role="option"
                          aria-selected={selecionado}
                          className={selecionado ? 'ativo' : ''}
                          onClick={() => escolherVeiculo(veiculo)}
                        >
                          {descricaoVeiculo(veiculo)}
                        </li>
                      );
                    })}
                    </ul>
                  )}
                </div>

                {veiculos.length === 0 && !carregandoVeiculos && (
                  <button
                    type="button"
                    className="ofertar-adicionar-veiculo"
                    aria-label="Cadastrar veículo"
                    title="Cadastrar veículo"
                    onClick={cadastrarVeiculo}
                  >
                    <Plus size={22} aria-hidden="true" />
                  </button>
                )}
              </div>
              {errosCampos.veiculo && (
                <span className="ofertar-erro-campo">{errosCampos.veiculo}</span>
              )}
            </div>

            {tipoVeiculo === 'moto' && (
              <p className="ofertar-aviso" role="note">
                <AlertTriangle size={16} />
                Garanta capacete extra e siga as normas de segurança para caronas
                em motocicleta.
              </p>
            )}

            <div className="ofertar-campo">
              <span className="ofertar-campo-titulo">
                <Users size={14} />
                Número de vagas
              </span>

              <div
                className="ofertar-vagas"
                role="group"
                aria-label="Número de vagas"
              >
                {VAGAS_CARRO.map((quantidade) => (
                  <button
                    key={quantidade}
                    type="button"
                    className={vagas === quantidade ? 'ativo' : ''}
                    aria-pressed={vagas === quantidade}
                    disabled={tipoVeiculo === 'moto' && quantidade !== 1}
                    onClick={() => setVagas(quantidade)}
                  >
                    {quantidade}
                  </button>
                ))}
              </div>

              {tipoVeiculo === 'moto' && (
                <span className="ofertar-slider-dica">
                  Motos comportam apenas 1 passageiro.
                </span>
              )}
            </div>

            <div className="ofertar-campo">
              <span className="ofertar-campo-titulo">
                <DollarSign size={14} />
                Contribuição por passageiro
              </span>

              {contribuicaoMax > 0 ? (
                <>
                  <div className="ofertar-contrib">
                    <span className="ofertar-contrib-valor">
                      R$ {formatarContribuicao(contribuicao)}
                    </span>

                    <input
                      type="range"
                      className="ofertar-range"
                      min={0}
                      max={contribuicaoMax}
                      step={0.5}
                      value={contribuicao}
                      onChange={(evento) => setContribuicao(Number(evento.target.value))}
                      aria-label="Contribuição por passageiro"
                      style={{ '--preenchido': `${(contribuicao / contribuicaoMax) * 100}%` }}
                    />

                    <div className="ofertar-contrib-limites">
                      <span>R$ 0</span>
                      <span>R$ {formatarReais(contribuicaoMax)}</span>
                    </div>
                  </div>

                  <span className="ofertar-slider-dica">
                    Máximo de R$ {formatarReais(tetoContribuicao)} para{' '}
                    {formatarKm(distanciaKm)} km (R$ 1,00/km).
                  </span>
                </>
              ) : (
                <span className="ofertar-slider-dica">
                  Trajeto muito curto para cobrar contribuição — será publicada como gratuita (R$ 0).
                </span>
              )}
            </div>

            {acoes}
          </div>
        )}

        {passo === 3 && (
          <div className="ofertar-card">
            <h2>Revisão</h2>

            <div className="ofertar-revisao">
              <p className="ofertar-revisao-rota">
                {origem || '—'} <ArrowRight size={15} /> {destino || '—'}
              </p>

              <p className="ofertar-revisao-detalhe">
                {formatarDia(data)} às {horario || '—'} • {vagas}{' '}
                {vagas === 1 ? 'vaga' : 'vagas'} • R$ {formatarContribuicao(contribuicao)}
              </p>

              <p className="ofertar-revisao-tipo">
                {tipoVeiculo === 'moto' ? <Bike size={15} /> : <Car size={15} />}
                {tipoVeiculo === 'moto' ? 'Moto' : 'Carro'}
                {veiculoSelecionado ? ` • ${descricaoVeiculo(veiculoSelecionado)}` : ''}
              </p>

              {/* Cada data vira uma carona separada — é a última chance de o
                  motorista ver quantas ele está publicando. */}
              {datasDaRecorrencia.length > 1 && (
                <div className="ofertar-revisao-datas">
                  <span className="ofertar-revisao-datas-titulo">
                    <Repeat size={14} aria-hidden="true" />
                    {datasDaRecorrencia.length} caronas serão criadas
                  </span>

                  <ul>
                    {datasDaRecorrencia.map((dataHora) => (
                      <li key={dataHora}>{formatarDataHora(dataHora)}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* A observação é o último retoque antes de publicar: vale para todas as
                caronas criadas quando o trajeto é recorrente. */}
            <label className="ofertar-campo ofertar-observacao">
              <span>Observações (opcional)</span>
              <textarea
                className="ofertar-textarea"
                value={observacao}
                onChange={(evento) => setObservacao(evento.target.value)}
                maxLength={OBSERVACAO_MAX}
                placeholder="Ex: aceito até 3 paradas, sem fumantes..."
              />
              <span className="ofertar-contador">
                {observacao.length}/{OBSERVACAO_MAX}
              </span>
            </label>

            {acoes}
          </div>
        )}
      </section>
    </main>
  );
}

// Valor escolhido no slider: inteiro sem casas ("5"), fração com vírgula ("5,50").
function formatarContribuicao(valor) {
  const numero = Number(valor) || 0;
  return Number.isInteger(numero) ? String(numero) : numero.toFixed(2).replace('.', ',');
}

// Teto/limite: sempre 2 casas com vírgula ("5,73").
function formatarReais(valor) {
  return (Number(valor) || 0).toFixed(2).replace('.', ',');
}

function formatarKm(valor) {
  return (Number(valor) || 0).toFixed(2).replace('.', ',');
}

function formatarDia(data) {
  if (!data) {
    return '—';
  }

  const [ano, mes, dia] = data.split('-');

  if (!ano || !mes || !dia) {
    return '—';
  }

  return `${dia}/${mes}/${ano}`;
}

export default OfertarCarona;
