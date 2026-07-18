import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import Campo from '../../components/common/Campo.jsx';
import {
  ArrowRight,
  Car,
  GraduationCap,
  MapPin,
  Search,
} from '../../components/common/Icone.jsx';
import TituloSecao from '../../components/common/TituloSecao.jsx';
import Rodape from '../../components/layout/Rodape.jsx';
import Cabecalho from '../../components/layout/Cabecalho.jsx';
import promoImg from '../../assets/promo-1.webp';
import promoImgTwo from '../../assets/promo-3.webp';
import promoImgThree from '../../assets/promo-4.webp';
import {
  depoimentos,
  exemplosDeCaronas,
  itensDeRecursos,
  passosComoFunciona,
} from '../../data/homePage.js';
import { isAuthenticated } from '../../services/authService.js';

export default function Home() {
  return (
    <main className="unicar-page">
      <Cabecalho />
      <Hero />
      <Features />
      <SearchPreview />
      <HowItWorks />
      <Divulgacao />
      <CTA />
      <Rodape />
    </main>
  );
}

function Hero() {
  const estaLogado = isAuthenticated();

  return (
    <section className="unicar-hero">
      <div className="unicar-container unicar-hero__grid">
        <div className="unicar-hero__copy">
          <div className="unicar-eyebrow">
            <GraduationCap className="icone iconePequeno" />
            Exclusivo para universitários
          </div>
          <h1>
            Caronas entre{' '}
            <span className="unicar-nowrap">
              <span className="unicar-highlight">colegas</span> da sua
            </span>{' '}
            universidade
          </h1>
          <p>
            UniCar conecta estudantes que fazem o mesmo caminho. Mais economia,
            menos trânsito e novas amizades a cada viagem.
          </p>
          <div className="unicar-actions">
            <Link to={estaLogado ? '/meus-veiculos' : '/login'} className="unicar-button unicar-button--orange">
              Oferecer carona
              <ArrowRight className="icone iconePequeno" />
            </Link>
            <Link to={estaLogado ? '/inicio' : '/login'} className="unicar-button unicar-button--ghost">
              Encontrar carona
            </Link>
          </div>
          <div className="unicar-stats">
            <span><strong>178</strong> estudantes pesquisados</span>
            <span><strong>80%</strong> querem usar o app</span>
            <span><strong>100%</strong> perfis validados</span>
          </div>
        </div>
        <div className="unicar-hero__visual" aria-hidden="true">
          <div className="unicar-visual-card">
            <div className="unicar-visual-card__tilt" />
            <div className="unicar-visual-card__surface">
              <div className="unicar-brand-mark">
                <div className="unicar-brand-mark__pulse" />
                <div className="unicar-brand-mark__circle">
                  <Car className="icone" />
                </div>
              </div>

              <div className="unicar-visual-card__title">
                Uni<span>Car</span>
              </div>
              <p>Campus Connect</p>

              <div className="unicar-availability-card">
                <span />
                <strong>1 vaga disponível às 18h</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="features" className="unicar-section unicar-section--soft">
      <div className="unicar-container">
        <TituloSecao title="Pensado para a vida universitária" text="Tudo o que você precisa para ir e voltar da faculdade com segurança e economia." />
        <div className="unicar-feature-grid">
          {itensDeRecursos.map(({ icone: IconeRecurso, titulo, descricao }) => (
            <article key={titulo} className="unicar-card">
              <div className="unicar-card__icon">
                <IconeRecurso className="icone" />
              </div>
              <h3>{titulo}</h3>
              <p>{descricao}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function SearchPreview() {
  const navigate = useNavigate();
  const estaLogado = isAuthenticated();
  const [origem, setOrigem] = useState('');
  const [destino, setDestino] = useState('');
  const [data, setData] = useState('');
  const [horario, setHorario] = useState('');

  function abrirBusca(evento, trajeto = {}) {
    evento.preventDefault();

    const parametros = new URLSearchParams();
    const origemBusca = trajeto.origem ?? origem;
    const destinoBusca = trajeto.destino ?? destino;

    if (origemBusca.trim()) parametros.set('origem', origemBusca.trim());
    if (destinoBusca.trim()) parametros.set('destino', destinoBusca.trim());
    if (data) parametros.set('data', data);
    if (horario) parametros.set('horario', horario);

    const destinoRota = `/buscar-carona${parametros.size ? `?${parametros.toString()}` : ''}`;
    navigate(estaLogado ? destinoRota : '/login');
  }

  return (
    <section id="buscar" className="unicar-section">
      <div className="unicar-container unicar-search-grid">
        <div>
          <TituloSecao title="Encontre a carona ideal" text="Filtre por campus, horário e disponibilidade de vagas." />
          <form className="unicar-form" onSubmit={abrirBusca}>
            <Campo label="De onde" placeholder="Catolé, Centro, Malvinas..." icon={MapPin} name="origem" value={origem} onChange={(evento) => setOrigem(evento.target.value)} />
            <Campo label="Para onde" placeholder="Campus Sede, HU, CCBS..." icon={GraduationCap} name="destino" value={destino} onChange={(evento) => setDestino(evento.target.value)} />
            <div className="unicar-form__row">
              <Campo label="Data" placeholder="Hoje" name="data" value={data} onChange={(evento) => setData(evento.target.value)} />
              <Campo label="Horário" placeholder="07:00" name="horario" value={horario} onChange={(evento) => setHorario(evento.target.value)} />
            </div>
            <button type="submit" className="unicar-button unicar-button--block">
              <Search className="icone iconePequeno" />
              Buscar caronas
            </button>
          </form>
        </div>
        <div className="unicar-rides">
          {exemplosDeCaronas.map((carona) => (
            <article
              key={carona.motorista}
              className="unicar-ride"
              role="link"
              tabIndex={0}
              onClick={(evento) => abrirBusca(evento, carona)}
              onKeyDown={(evento) => {
                if (evento.key === 'Enter' || evento.key === ' ') abrirBusca(evento, carona);
              }}
            >
              <div className="unicar-avatar">{carona.motorista[0]}</div>
              <div className="unicar-ride__main">
                <h3>{carona.motorista}</h3>
                <p>{carona.curso}</p>
                <div className="unicar-route">
                  <strong>{carona.origem}</strong>
                  <ArrowRight className="icone iconePequeno" />
                  <strong>{carona.destino}</strong>
                </div>
              </div>
              <div className="unicar-ride__meta">
                <strong>{carona.horario}</strong>
                <span>{carona.vagas} vagas</span>
                <b>{carona.preco}</b>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="como-funciona" className="unicar-section unicar-section--soft">
      <div className="unicar-container">
        <TituloSecao title="Em três passos você está na estrada" />
        <div className="unicar-steps">
          {passosComoFunciona.map((passo) => (
            <article key={passo.numero} className="unicar-step">
              <span>{passo.numero}</span>
              <h3>{passo.titulo}</h3>
              <p>{passo.descricao}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Divulgacao() {
  const promoImages = [promoImg, promoImgThree, promoImgTwo];

  return (
    <section className="unicar-section unicar-divulgacao">
      <div className="unicar-container">
        <div className="unicar-selo">
          <span />
          #SOUUNICAR
        </div>
        <div className="tituloSecao">
          <h2>
            Universitários já estão <span>na carona</span>
          </h2>
          <p>
            A comunidade UniCar cresce a cada semestre. Junte-se a quem já
            trocou o trânsito por boas conversas.
          </p>
        </div>
        <div className="unicar-promo-grid">
          {depoimentos.map((depoimento, index) => (
            <figure key={depoimento.autor} className="unicar-promo">
              <div className="unicar-promo__top">
                <span>{depoimento.etiqueta}</span>
                <b>{String(index + 1).padStart(2, '0')}</b>
              </div>
              <img src={promoImages[index]} alt="" />
              <figcaption>
                <p>"{depoimento.frase}"</p>
                <strong>{depoimento.autor}</strong>
                <span>{depoimento.curso}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  const estaLogado = isAuthenticated();

  return (
    <section className="unicar-section">
      <div className="unicar-container">
        <div className="unicar-cta">
          <Car className="icone iconeGrande" />
          <h2>Pronto para sua próxima carona?</h2>
          <p>Junte-se a milhares de estudantes que já economizam tempo e dinheiro com o UniCar.</p>
          <Link to={estaLogado ? '/perfil' : '/login'} className="unicar-button unicar-button--orange">
            Entrar
          </Link>
        </div>
      </div>
    </section>
  );
}
