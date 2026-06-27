import { Link } from 'react-router-dom';
import Field from '../../components/common/Field.jsx';
import {
  ArrowRight,
  Car,
  GraduationCap,
  MapPin,
  Search,
  Shield,
  Users,
} from '../../components/common/Icon.jsx';
import SectionHeader from '../../components/common/SectionHeader.jsx';
import Footer from '../../components/layout/Footer.jsx';
import Header from '../../components/layout/Header.jsx';
import promoImg from '../../assets/promo-1.webp';
import logoAsset from '../../assets/unicar-logo-transparent.png';
import {
  featureItems,
  howItWorksSteps,
  rideExamples,
  testimonials,
} from '../../data/homePage.js';
import { isAuthenticated } from '../../services/authService.js';

export default function Home() {
  return (
    <main className="unicar-page">
      <Header />
      <Hero />
      <Features />
      <SearchPreview />
      <HowItWorks />
      <Divulgacao />
      <CTA />
      <Footer />
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
            <GraduationCap className="unicar-icon unicar-icon--small" />
            Exclusivo para universitários
          </div>
          <h1>
            Caronas entre <span>colegas</span> da sua universidade
          </h1>
          <p>
            UniCar conecta estudantes que fazem o mesmo caminho. Mais economia,
            menos trânsito e novas amizades a cada viagem.
          </p>
          <div className="unicar-actions">
            {estaLogado ? (
              <Link to="/perfil" className="unicar-button unicar-button--orange">
                <Users className="unicar-icon unicar-icon--small" />
                Meu perfil
              </Link>
            ) : (
              <>
                <Link to="/login" className="unicar-button unicar-button--orange">
                  Oferecer carona
                  <ArrowRight className="unicar-icon unicar-icon--small" />
                </Link>
                <Link to="/login" className="unicar-button unicar-button--ghost">
                  Encontrar carona
                </Link>
              </>
            )}
          </div>
          <div className="unicar-stats">
            <span><strong>178</strong> estudantes pesquisados</span>
            <span><strong>80%</strong> querem usar o app</span>
            <span><strong>100%</strong> perfis validados</span>
          </div>
        </div>
        <div className="unicar-hero__visual" aria-hidden="true">
          <div className="unicar-orbit unicar-orbit--outer" />
          <div className="unicar-orbit unicar-orbit--inner" />
          <div className="unicar-logo-orb">
            <img src={logoAsset} alt="" />
          </div>
          <InfoBadge className="unicar-badge--left" value="178" title="Pesquisa real" text="Estudantes ouvidos" />
          <InfoBadge className="unicar-badge--right" value="80%" title="Interesse de uso" text="Querem usar o app" />
          <InfoBadge className="unicar-badge--bottom" icon={Shield} title="Validação institucional" text="100% perfis validados" />
        </div>
      </div>
    </section>
  );
}

function InfoBadge({ className = '', value, title, text, icon: BadgeIcon }) {
  return (
    <div className={`unicar-info-badge ${className}`}>
      <div className="unicar-info-badge__mark">
        {BadgeIcon ? <BadgeIcon className="unicar-icon" /> : value}
      </div>
      <div>
        <span>{title}</span>
        <strong>{text}</strong>
      </div>
    </div>
  );
}

function Features() {
  return (
    <section id="features" className="unicar-section unicar-section--soft">
      <div className="unicar-container">
        <SectionHeader title="Pensado para a vida universitária" text="Tudo o que você precisa para ir e voltar da faculdade com segurança e economia." />
        <div className="unicar-feature-grid">
          {featureItems.map(({ icon: FeatureIcon, title, desc }) => (
            <article key={title} className="unicar-card">
              <div className="unicar-card__icon">
                <FeatureIcon className="unicar-icon" />
              </div>
              <h3>{title}</h3>
              <p>{desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function SearchPreview() {
  return (
    <section id="buscar" className="unicar-section">
      <div className="unicar-container unicar-search-grid">
        <div>
          <SectionHeader title="Encontre a carona ideal" text="Filtre por campus, horário e disponibilidade de vagas." />
          <form className="unicar-form">
            <Field label="De onde" placeholder="Seu bairro" icon={MapPin} />
            <Field label="Para onde" placeholder="Campus / faculdade" icon={GraduationCap} />
            <div className="unicar-form__row">
              <Field label="Data" placeholder="Hoje" />
              <Field label="Horário" placeholder="07:00" />
            </div>
            <button type="button" className="unicar-button unicar-button--block">
              <Search className="unicar-icon unicar-icon--small" />
              Buscar caronas
            </button>
          </form>
        </div>
        <div className="unicar-rides">
          {rideExamples.map((ride) => (
            <article key={ride.driver} className="unicar-ride">
              <div className="unicar-avatar">{ride.driver[0]}</div>
              <div className="unicar-ride__main">
                <h3>{ride.driver}</h3>
                <p>{ride.course}</p>
                <div className="unicar-route">
                  <strong>{ride.from}</strong>
                  <ArrowRight className="unicar-icon unicar-icon--small" />
                  <strong>{ride.to}</strong>
                </div>
              </div>
              <div className="unicar-ride__meta">
                <strong>{ride.time}</strong>
                <span>{ride.seats} vagas</span>
                <b>{ride.price}</b>
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
        <SectionHeader title="Em três passos você está na estrada" />
        <div className="unicar-steps">
          {howItWorksSteps.map((step) => (
            <article key={step.n} className="unicar-step">
              <span>{step.n}</span>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Divulgacao() {
  return (
    <section className="unicar-section">
      <div className="unicar-container">
        <SectionHeader title="Universitários já estão na carona" text="A comunidade UniCar cresce a cada semestre. Junte-se a quem já trocou o trânsito por boas conversas." />
        <div className="unicar-promo-grid">
          {testimonials.map((item, index) => (
            <figure key={item.author} className="unicar-promo">
              <div className="unicar-promo__top">
                <span>{item.tag}</span>
                <b>{String(index + 1).padStart(2, '0')}</b>
              </div>
              <img src={promoImg} alt="" />
              <figcaption>
                <p>"{item.quote}"</p>
                <strong>{item.author}</strong>
                <span>{item.course}</span>
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
          <Car className="unicar-icon unicar-icon--large" />
          <h2>Pronto para sua próxima carona?</h2>
          <p>Junte-se a milhares de estudantes que já economizam tempo e dinheiro com o UniCar.</p>
          <Link to={estaLogado ? '/perfil' : '/login'} className="unicar-button unicar-button--orange">
            {estaLogado ? 'Ir para meu perfil' : 'Criar minha conta grátis'}
          </Link>
        </div>
      </div>
    </section>
  );
}
