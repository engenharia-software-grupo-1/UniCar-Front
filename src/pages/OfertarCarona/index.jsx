import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Bike,
  Car,
  ChevronDown,
  DollarSign,
  MapPin,
  Repeat,
  Users,
} from 'lucide-react';
import NavegacaoInferior from '../../components/layout/NavegacaoInferior.jsx';
import { listarVeiculos } from '../../services/vehicleService.js';
import { criarCarona } from '../../services/caronaService.js';
import './style.css';

const TOTAL_PASSOS = 3;
const VAGAS_CARRO = [1, 2, 3, 4];
const CONTRIBUICAO_MAX = 20;

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

function OfertarCarona() {
  const navigate = useNavigate();

  const [passo, setPasso] = useState(1);

  // Passo 1 — trajeto e horário.
  const [origem, setOrigem] = useState('');
  const [destino, setDestino] = useState('');
  const [pontoEncontro, setPontoEncontro] = useState('');
  const [data, setData] = useState('');
  const [horario, setHorario] = useState('');
  const [recorrente, setRecorrente] = useState(false);

  // Passo 2 — veículo e vagas.
  const [tipoVeiculo, setTipoVeiculo] = useState('carro');
  const [veiculoId, setVeiculoId] = useState('');
  const [vagas, setVagas] = useState(1);
  const [contribuicao, setContribuicao] = useState(5);

  const [veiculos, setVeiculos] = useState([]);
  const [carregandoVeiculos, setCarregandoVeiculos] = useState(true);
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const [errosCampos, setErrosCampos] = useState({});
  const [erro, setErro] = useState('');
  const [publicando, setPublicando] = useState(false);

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
      ? `Nenhum ${tipoVeiculo} cadastrado`
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

  function avancar() {
    setErro('');

    const erros = passo === 1 ? validarPasso1() : validarPasso2();

    if (Object.keys(erros).length > 0) {
      setErrosCampos(erros);
      return;
    }

    setErrosCampos({});
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

      await criarCarona({
        veiculoId: veiculoSelecionado.id,
        origem: origem.trim(),
        destino: destino.trim(),
        pontoEncontro: pontoEncontro.trim(),
        dataHoraSaida: `${data}T${horario}:00`,
        quantidadeVagas: vagas,
        valorContribuicao: contribuicao,
      });

      navigate('/minhas-caronas', {
        state: { mensagem: 'Carona publicada com sucesso.' },
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
        <button type="button" className="ofertar-btn-primario" onClick={avancar}>
          Continuar
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

            <label className="ofertar-campo">
              <span>Ponto de partida</span>
              <div className="ofertar-input">
                <MapPin size={18} />
                <input
                  type="text"
                  value={origem}
                  onChange={(evento) => {
                    setOrigem(evento.target.value);
                    limparErro('origem');
                  }}
                  placeholder="De onde você sai"
                />
              </div>
              {errosCampos.origem && (
                <span className="ofertar-erro-campo">{errosCampos.origem}</span>
              )}
            </label>

            <label className="ofertar-campo">
              <span>Destino</span>
              <div className="ofertar-input">
                <MapPin size={18} />
                <input
                  type="text"
                  value={destino}
                  onChange={(evento) => {
                    setDestino(evento.target.value);
                    limparErro('destino');
                  }}
                  placeholder="Para onde você vai"
                />
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

              <div className="ofertar-contrib">
                <span className="ofertar-contrib-valor">R$ {contribuicao}</span>

                <input
                  type="range"
                  className="ofertar-range"
                  min={0}
                  max={CONTRIBUICAO_MAX}
                  step={1}
                  value={contribuicao}
                  onChange={(evento) => setContribuicao(Number(evento.target.value))}
                  aria-label="Contribuição por passageiro"
                  style={{ '--preenchido': `${(contribuicao / CONTRIBUICAO_MAX) * 100}%` }}
                />

                <div className="ofertar-contrib-limites">
                  <span>R$ 0</span>
                  <span>R$ {CONTRIBUICAO_MAX}</span>
                </div>
              </div>

              <span className="ofertar-slider-dica">
                Sugestão calculada com base na distância e combustível.
              </span>
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
                {vagas === 1 ? 'vaga' : 'vagas'} • R$ {contribuicao}
              </p>

              <p className="ofertar-revisao-tipo">
                {tipoVeiculo === 'moto' ? <Bike size={15} /> : <Car size={15} />}
                {tipoVeiculo === 'moto' ? 'Moto' : 'Carro'}
                {veiculoSelecionado ? ` • ${descricaoVeiculo(veiculoSelecionado)}` : ''}
              </p>
            </div>

            {acoes}
          </div>
        )}
      </section>

      <NavegacaoInferior />
    </main>
  );
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
