import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  Search,
  MapPin,
  SlidersHorizontal,
  Car,
  Bike,
  ShieldCheck
} from 'lucide-react';
import NavegacaoInferior from '../../components/layout/NavegacaoInferior.jsx';
import { buscarCaronas } from '../../services/caronaService.js';
import './style.css';

function BuscarCarona() {
  const [origem, setOrigem] = useState('');
  const [destino, setDestino] = useState('');
  const [curso, setCurso] = useState('');
  const [genero, setGenero] = useState('');
  const [erroOrigem, setErroOrigem] = useState('');
  const [erroDestino, setErroDestino] = useState('');
  const [erroBusca, setErroBusca] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [caronas, setCaronas] = useState([]);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [vagasMinimas, setVagasMinimas] = useState(1);
  const [precoMaximo, setPrecoMaximo] = useState(20);
  const [veiculo, setVeiculo] = useState('Qualquer');
  const [apenasVerificados, setApenasVerificados] = useState(false);

  const VEICULOS = [
    'Qualquer',
    'Carro',
    'Moto',
  ];

  const CURSOS = [
    'Qualquer',
    'Eng. Computação',
    'Eng. Elétrica',
    'Eng. Mecânica',
    'Direito',
    'Medicina',
    'Letras',
  ];

  const GENEROS = [
    'Qualquer',
    'Feminino',
    'Masculino',
  ];

  function validarFormulario() {
    let valido = true;

    setErroOrigem('');
    setErroDestino('');

    if (!origem.trim()) {
      setErroOrigem(
        'Por favor, informe a origem.',
      );
      valido = false;
    }

    if (!destino.trim()) {
      setErroDestino(
        'Por favor, informe o destino.',
      );
      valido = false;
    }

    return valido;
  }

  async function realizarBusca() {
    if (!validarFormulario()) {
      return;
    }

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

    } catch (erro) {
      setErroBusca(
        erro.message ||
          'Não foi possível buscar as caronas.',
      );
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="buscar-page">

      <section className="buscar-shell">

        <h1 className="buscar-title">
          Buscar caronas
        </h1>

        <div className="buscar-formulario">

          <Field
            icon={MapPin}
            placeholder="De onde você sai"
            value={origem}
            onChange={setOrigem}
            erro={erroOrigem}
          />

          <Field
            icon={MapPin}
            placeholder="Para onde vai"
            value={destino}
            onChange={setDestino}
            erro={erroDestino}
          />

          <div className="buscar-acoes">

            <button
              type="button"
              className="buscar-botao"
              onClick={realizarBusca}
              disabled={carregando}
            >
              <Search size={18} />

              {carregando
                ? 'Buscando...'
                : 'Buscar'}
            </button>

            <button
              type="button"
              className="buscar-filtros"
              onClick={() =>
                setMostrarFiltros(
                  !mostrarFiltros,
                )
              }
            >
              <SlidersHorizontal size={18} />
            </button>

          </div>

          {mostrarFiltros && (
            <div className="buscar-painel-filtros">

              <div className="buscar-range">
                <label>
                  Vagas mínimas: {vagasMinimas}
                </label>

                <input
                  type="range"
                  min="1"
                  max="4"
                  value={vagasMinimas}
                  onChange={(e) =>
                    setVagasMinimas(Number(e.target.value))
                  }
                />
              </div>

              <div className="buscar-range">
                <label>
                  Preço máximo: R$ {precoMaximo}
                </label>

                <input
                  type="range"
                  min="0"
                  max="30"
                  value={precoMaximo}
                  onChange={(e) =>
                    setPrecoMaximo(Number(e.target.value))
                  }
                />
              </div>

              <div className="buscar-grid">

                <SelectField
                  label="Curso"
                  value={curso}
                  options={CURSOS}
                  onChange={setCurso}
                />

                <SelectField
                  label="Gênero"
                  value={genero}
                  options={GENEROS}
                  onChange={setGenero}
                />

              </div>

              <div>

                <label className="buscar-label">
                  Veículo
                </label>

                <div className="buscar-veiculos">

                  {VEICULOS.map((tipo) => (

                    <button
                        key={tipo}
                        type="button"
                        className={
                          veiculo === tipo
                            ? 'buscar-veiculo ativo'
                            : 'buscar-veiculo'
                        }
                        onClick={() => setVeiculo(tipo)}
                    >
                        {tipo === 'Carro' && <Car size={15} />}
                        {tipo === 'Moto' && <Bike size={15} />}

                        {tipo === 'Qualquer' ? 'Qualquer' : tipo}
                    </button>

                  ))}

                </div>

              </div>

              <label className="buscar-checkbox">

                <input
                  type="checkbox"
                  checked={apenasVerificados}
                  onChange={(e) =>
                    setApenasVerificados(e.target.checked)
                  }
                />

                Apenas motoristas verificados

              </label>

            </div>
            )}
          </div>

        {erroBusca && (
          <div
            className="buscar-erro"
            role="alert"
          >
            {erroBusca}
          </div>
        )}

        <div className="buscar-resultado-topo">

          <p>
            {caronas.length}
            {' '}
            caronas encontradas
          </p>

        </div>

        <div className="buscar-lista">

          {!carregando &&
            caronas.length === 0 && (
              <div className="buscar-vazio">
              <p>
                  Nenhuma carona encontrada com esses filtros.
              </p>
              </div>
            )}

          {!carregando &&
            caronas.map((carona) => (
              <RideCard
                key={carona.id}
                carona={carona}
              />
            ))}

        </div>

      </section>

      <NavegacaoInferior />
    </main>
  );
}

function Field({
  icon: Icon,
  placeholder,
  value,
  onChange,
  erro,
}) {
  return (
    <div className="buscar-field-wrapper">
      <div
        className={`buscar-field ${
          erro ? 'buscar-field--erro' : ''
        }`}
      >
        <Icon size={18} />

        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) =>
            onChange(e.target.value)
          }
        />
      </div>

      {erro && (
        <span className="buscar-field-erro">
          {erro}
        </span>
      )}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}) {
  return (
    <div className="buscar-select">
      <label>{label}</label>

      <select
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
      >
        {options.map((option) => (
          <option
            key={option}
            value={option}
          >
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function RideCard({ carona }) {
  return (
    <article className="ride-card">

      <div className="ride-card-top">

        <div className="ride-avatar">
          {carona.motoristaNome.charAt(0).charAt(0).toUpperCase() || 
            'U'}
        </div>

        <div className="ride-info">

          <h3>
            {carona.motoristaNome ||
              'Motorista'}
          </h3>

        </div>

      </div>

      <div className="ride-route">

        <strong>
          {carona.origem.descricao}
        </strong>

        <span>→</span>

        <strong>
          {carona.destino.descricao}
        </strong>

      </div>

      <div className="ride-details">

        <span>
          {new Date(carona.dataHoraSaida).toLocaleString('pt-BR')}
        </span>

        <span>
          R$ {carona.valorContribuicao}
        </span>

        <span>
          {carona.vagasDisponiveis} vagas
        </span>

      </div>

      <Link
        to={`/caronas/${carona.id}`}
        className="ride-details-link"
      >
        Ver detalhes
      </Link>

    </article>
  );
}


export default BuscarCarona;
