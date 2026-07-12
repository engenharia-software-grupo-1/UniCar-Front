import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Bell, Star, Users, X } from 'lucide-react';
import Logo from '../../components/common/Logo.jsx';
import NavegacaoInferior from '../../components/layout/NavegacaoInferior.jsx';
import AvaliarUsuarioModal from '../Perfil/AvaliarUsuarioModal.jsx';
import {
  listarAvaliacoesComoMotorista,
  listarHistoricoComoMotorista,
  obterResumoHistorico,
} from '../../services/historicoCaronasService.js';
import './style.css';

const STATUS_CARONA = {
  ATIVA: { rotulo: 'Ativa', classe: 'ativa' },
  CRIADA: { rotulo: 'Ativa', classe: 'ativa' },
  EXPIRADA: { rotulo: 'Expirada', classe: 'expirada' },
  CANCELADA: { rotulo: 'Cancelada', classe: 'cancelada' },
  FINALIZADA: { rotulo: 'Concluída', classe: 'finalizada' },
};

function HistoricoCaronas() {
  const navigate = useNavigate();
  const [aba, setAba] = useState('motorista');
  const [caronas, setCaronas] = useState([]);
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [resumo, setResumo] = useState({ avaliacaoMedia: 0, caronasConcluidas: 0 });
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [caronaParaAvaliar, setCaronaParaAvaliar] = useState(null);
  const [caronaParaEscolherPassageiro, setCaronaParaEscolherPassageiro] = useState(null);
  const [enviandoAvaliacao, setEnviandoAvaliacao] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState('');

  async function carregarHistorico() {
    try {
      setCarregando(true);
      setErro('');

      const [caronasMotorista, avaliacoesMotorista, resumoHistorico] = await Promise.all([
        listarHistoricoComoMotorista(),
        listarAvaliacoesComoMotorista(),
        obterResumoHistorico(),
      ]);

      setCaronas(caronasMotorista);
      setAvaliacoes(avaliacoesMotorista);
      setResumo(resumoHistorico);
    } catch (error) {
      setErro(error.message || 'Não foi possível carregar o histórico.');
    } finally {
      setCarregando(false);
    }
  }

  async function enviarAvaliacao({ nota, comentario }) {
    if (!caronaParaAvaliar) {
      return;
    }

    try {
      setEnviandoAvaliacao(true);
      setErro('');
      setMensagemSucesso('');

      await Promise.resolve({
        caronaId: caronaParaAvaliar.id,
        avaliadoId: caronaParaAvaliar.avaliadoId,
        nota,
        comentario,
      });

      setCaronaParaAvaliar(null);
      setMensagemSucesso('Avaliação enviada com sucesso.');
    } catch (error) {
      setErro(error.message || 'Não foi possível enviar a avaliação.');
      setCaronaParaAvaliar(null);
    } finally {
      setEnviandoAvaliacao(false);
    }
  }

  function iniciarAvaliacao(carona) {
    const passageiros = obterPassageirosAvaliaveis(carona);

    if (passageiros.length > 1) {
      setCaronaParaEscolherPassageiro(carona);
      return;
    }

    selecionarPassageiroParaAvaliar(carona, passageiros[0]);
  }

  function selecionarPassageiroParaAvaliar(carona, passageiro) {
    setCaronaParaEscolherPassageiro(null);
    setCaronaParaAvaliar({
      ...carona,
      passageiro: passageiro.nome,
      avaliadoId: passageiro.id,
    });
  }

  useEffect(() => {
    let ativo = true;

    async function carregarInicial() {
      try {
        setCarregando(true);
        setErro('');

        const [caronasMotorista, avaliacoesMotorista, resumoHistorico] = await Promise.all([
          listarHistoricoComoMotorista(),
          listarAvaliacoesComoMotorista(),
          obterResumoHistorico(),
        ]);

        if (!ativo) {
          return;
        }

        setCaronas(caronasMotorista);
        setAvaliacoes(avaliacoesMotorista);
        setResumo(resumoHistorico);
      } catch (error) {
        if (ativo) {
          setErro(error.message || 'Não foi possível carregar o histórico.');
        }
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    }

    carregarInicial();

    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    if (!mensagemSucesso) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setMensagemSucesso('');
    }, 60000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [mensagemSucesso]);

  return (
    <main className="historico-page">
      <header className="historico-topbar">
        <Link to="/inicio" className="historico-logo" aria-label="UniCar">
          <Logo />
        </Link>

        <button
          type="button"
          className="historico-notification"
          aria-label="Notificações"
          onClick={() => navigate('/notificacoes')}
        >
          <Bell size={24} />
          <span />
        </button>
      </header>

      <section className="historico-shell">
        <h1 className="historico-title">Histórico</h1>

        <section className="historico-resumo" aria-label="Resumo do histórico">
          <div className="historico-resumo__rating">
            <strong>{formatarMedia(resumo.avaliacaoMedia)}</strong>
            <span aria-label={`${formatarMedia(resumo.avaliacaoMedia)} estrelas`}>
              {Array.from({ length: 5 }).map((_, index) => (
                <Star key={index} size={15} fill="currentColor" />
              ))}
            </span>
          </div>

          <div className="historico-resumo__divider" />

          <div className="historico-resumo__total">
            <span>Caronas concluídas</span>
            <strong>{resumo.caronasConcluidas}</strong>
          </div>
        </section>

        <div className="historico-tabs" role="tablist" aria-label="Tipo de histórico">
          <button
            type="button"
            role="tab"
            aria-selected={aba === 'motorista'}
            className={`historico-tab ${aba === 'motorista' ? 'is-active' : ''}`}
            onClick={() => setAba('motorista')}
          >
            Como motorista
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={aba === 'passageiro'}
            className={`historico-tab ${aba === 'passageiro' ? 'is-active' : ''}`}
            onClick={() => setAba('passageiro')}
          >
            Como passageiro
          </button>
        </div>

        {aba === 'motorista' ? (
          <HistoricoMotorista
            carregando={carregando}
            erro={erro}
            caronas={caronas}
            avaliacoes={avaliacoes}
            mensagemSucesso={mensagemSucesso}
            onAvaliar={iniciarAvaliacao}
            onTentarNovamente={carregarHistorico}
          />
        ) : (
          <div className="historico-vazio">
            <p>Você ainda não realizou nenhuma viagem como passageiro.</p>
          </div>
        )}
      </section>

      {caronaParaEscolherPassageiro && (
        <EscolherPassageiroModal
          carona={caronaParaEscolherPassageiro}
          passageiros={obterPassageirosAvaliaveis(caronaParaEscolherPassageiro)}
          onEscolher={(passageiro) =>
            selecionarPassageiroParaAvaliar(caronaParaEscolherPassageiro, passageiro)
          }
          onClose={() => setCaronaParaEscolherPassageiro(null)}
        />
      )}

      {caronaParaAvaliar && (
        <AvaliarUsuarioModal
          userName={caronaParaAvaliar.passageiro}
          loading={enviandoAvaliacao}
          onSubmit={enviarAvaliacao}
          onClose={() => setCaronaParaAvaliar(null)}
        />
      )}

      <NavegacaoInferior />
    </main>
  );
}

function HistoricoMotorista({
  carregando,
  erro,
  caronas,
  avaliacoes,
  mensagemSucesso,
  onAvaliar,
  onTentarNovamente,
}) {
  if (carregando) {
    return <p className="historico-loading">Carregando histórico...</p>;
  }

  if (erro) {
    return (
      <div className="historico-erro" role="alert">
        <p>{erro}</p>
        <button type="button" onClick={onTentarNovamente}>
          Tentar novamente
        </button>
      </div>
    );
  }

  if (caronas.length === 0) {
    return (
      <div className="historico-vazio">
        <p>Você ainda não ofertou nenhuma carona.</p>
      </div>
    );
  }

  return (
    <>
      {mensagemSucesso && (
        <p className="historico-sucesso" role="status">
          {mensagemSucesso}
        </p>
      )}

      <section aria-labelledby="historico-avaliacoes-titulo" className="historico-bloco">
        <h2 id="historico-avaliacoes-titulo" className="historico-section-title">
          Avaliações recebidas
        </h2>

        <ul className="historico-lista">
          {avaliacoes.map((avaliacao) => (
            <li key={avaliacao.id}>
              <AvaliacaoRecebidaCard avaliacao={avaliacao} />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="historico-motorista-titulo" className="historico-bloco">
        <h2 id="historico-motorista-titulo" className="historico-section-title">
          Caronas anteriores
        </h2>

        <ul className="historico-lista">
          {caronas.map((carona) => (
            <li key={carona.id}>
              <CaronaMotoristaCard carona={carona} onAvaliar={onAvaliar} />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function AvaliacaoRecebidaCard({ avaliacao }) {
  return (
    <article className="historico-card historico-card--avaliacao">
      <div className="historico-card__conteudo">
        <h3>{avaliacao.autor}</h3>
        <p>{avaliacao.comentario}</p>
        <time>{avaliacao.data}</time>
      </div>

      <div className="historico-estrelas" aria-label={`${avaliacao.nota} estrelas`}>
        {Array.from({ length: avaliacao.nota }).map((_, index) => (
          <Star key={index} size={17} fill="currentColor" />
        ))}
      </div>
    </article>
  );
}

function CaronaMotoristaCard({ carona, onAvaliar }) {
  const status = STATUS_CARONA[carona.status] || {
    rotulo: carona.status || 'Carona',
    classe: 'ativa',
  };

  return (
    <article className="historico-card historico-card--carona-anterior">
      <div className="historico-card__topo">
        <span className={`historico-status historico-status--${status.classe}`}>
          {status.rotulo}
        </span>
        <time dateTime={carona.dataHoraSaida}>{formatarDataHora(carona.dataHoraSaida)}</time>
      </div>

      <div className="historico-card__conteudo">
        <p className="historico-rota">
          <strong>{carona.origem || 'Origem'}</strong>
          <ArrowRight size={16} aria-hidden="true" />
          <span>{montarDestino(carona)}</span>
        </p>

        <p className="historico-vagas">
          <Users size={16} aria-hidden="true" />
          {formatarOcupacao(carona)}
        </p>

        <p className="historico-passageiro">com {formatarPassageiros(carona)}</p>

        {carona.status === 'FINALIZADA' && (
          <button type="button" className="historico-avaliar" onClick={() => onAvaliar(carona)}>
            <Star size={15} aria-hidden="true" />
            Avaliar
          </button>
        )}
      </div>
    </article>
  );
}

function EscolherPassageiroModal({ carona, passageiros, onEscolher, onClose }) {
  return (
    <div className="historico-seletor-overlay" onClick={onClose}>
      <section
        className="historico-seletor"
        role="dialog"
        aria-modal="true"
        aria-label="Escolher passageiro para avaliar"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="historico-seletor__header">
          <div>
            <h2>Escolher passageiro</h2>
            <p>{montarDestino(carona)}</p>
          </div>

          <button type="button" aria-label="Fechar" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="historico-seletor__lista">
          {passageiros.map((passageiro) => (
            <button
              key={passageiro.id || passageiro.nome}
              type="button"
              onClick={() => onEscolher(passageiro)}
            >
              <span>{inicialDoNome(passageiro.nome)}</span>
              {passageiro.nome}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function montarDestino(carona) {
  const destino = carona.destino || 'Destino';

  return carona.pontoEncontro ? `${destino} • ${carona.pontoEncontro}` : destino;
}

function obterPassageirosAvaliaveis(carona) {
  if (Array.isArray(carona.passageiros) && carona.passageiros.length > 0) {
    return carona.passageiros;
  }

  return [
    {
      id: carona.avaliadoId || carona.passageiro,
      nome: carona.passageiro || 'Passageiro',
    },
  ];
}

function formatarPassageiros(carona) {
  const passageiros = obterPassageirosAvaliaveis(carona);

  if (passageiros.length === 0) {
    return 'Passageiro';
  }

  if (passageiros.length === 1) {
    return passageiros[0].nome;
  }

  if (passageiros.length === 2) {
    return `${passageiros[0].nome} e ${passageiros[1].nome}`;
  }

  return `${passageiros[0].nome}, ${passageiros[1].nome} e mais ${passageiros.length - 2}`;
}

function inicialDoNome(nome) {
  return (nome || 'P').trim().charAt(0).toUpperCase();
}

function formatarOcupacao(carona) {
  const temPassageiro = Boolean(carona.passageiro || carona.passageiros?.length);
  const ocupadas = Number(carona.vagasOcupadas) || (temPassageiro ? 1 : 0);
  const total = Number(carona.vagasTotal) || Math.max(ocupadas, temPassageiro ? 3 : 0);

  return `${ocupadas}/${total} vagas ocupadas`;
}

function formatarDataHora(valor) {
  if (!valor) {
    return '';
  }

  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return valor;
  }

  const hora = data.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const hoje = new Date();
  const dia = mesmoDia(data, hoje)
    ? 'Hoje'
    : data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

  return `${dia} • ${hora}`;
}

function formatarMedia(valor) {
  const numero = Number(valor);

  if (!Number.isFinite(numero) || numero <= 0) {
    return '0';
  }

  return numero.toLocaleString('pt-BR', {
    minimumFractionDigits: Number.isInteger(numero) ? 0 : 1,
    maximumFractionDigits: 1,
  });
}

function mesmoDia(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default HistoricoCaronas;
