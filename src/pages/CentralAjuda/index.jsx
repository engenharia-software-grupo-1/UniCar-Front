import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Car,
  ChevronRight,
  HelpCircle,
  LifeBuoy,
  Mail,
  Search,
  Shield,
  UserCog,
  Wallet,
} from 'lucide-react';
import './style.css';

const CATEGORIAS = [
  {
    id: 'conta',
    label: 'Conta',
    icon: UserCog,
    description: 'Login, perfil, senha e exclusão',
  },
  {
    id: 'caronas',
    label: 'Caronas',
    icon: Car,
    description: 'Buscar, ofertar, reservar e cancelar',
  },
  {
    id: 'seguranca',
    label: 'Segurança',
    icon: Shield,
    description: 'Denúncias, bloqueios e verificação',
  },
  {
    id: 'pagamentos',
    label: 'Pagamentos',
    icon: Wallet,
    description: 'Contribuição, reembolsos e histórico',
  },
  {
    id: 'notificacoes',
    label: 'Notificações',
    icon: Bell,
    description: 'Lembretes, alertas e preferências',
  },
];

const FAQS = [
  {
    id: 'faq-1',
    category: 'conta',
    question: 'Como faço login pelo SIGAA?',
    answer:
      'Na tela de login, escolha Entrar com SIGAA. Você será redirecionado para a página de autenticação da UFCG. Após validar sua matrícula, retornamos automaticamente para o UniCar com seu perfil já preenchido.',
  },
  {
    id: 'faq-2',
    category: 'conta',
    question: 'Esqueci minha senha. E agora?',
    answer:
      'Como o acesso é feito via SIGAA, a senha é a mesma do portal universitário. Recupere-a pelo site da instituição e tente novamente no UniCar.',
  },
  {
    id: 'faq-3',
    category: 'caronas',
    question: 'Como reservo uma vaga?',
    answer:
      'Busque o trajeto desejado, toque no card da carona e confirme sua reserva. O motorista recebe a solicitação e você é notificado quando ela for aceita.',
  },
  {
    id: 'faq-4',
    category: 'caronas',
    question: 'Posso cancelar uma carona?',
    answer:
      'Sim. Em Minhas caronas ou no histórico da viagem, toque em Cancelar. Motoristas também podem cancelar, mas isso impacta a reputação.',
  },
  {
    id: 'faq-5',
    category: 'seguranca',
    question: 'Como denuncio um usuário?',
    answer:
      'No perfil do usuário ou no card da carona, toque em Denunciar. Escolha o motivo, descreva o ocorrido e anexe evidências se tiver. Nossa equipe analisa em até 48h.',
  },
  {
    id: 'faq-6',
    category: 'seguranca',
    question: 'O que significa o selo de motorista verificado?',
    answer:
      'Indica que o motorista enviou documentos, como CNH, CRLV e comprovante de vínculo, e passou pela validação institucional. É um diferencial de segurança, mas não isenta a cautela.',
  },
  {
    id: 'faq-7',
    category: 'pagamentos',
    question: 'Como funciona a contribuição?',
    answer:
      'O valor sugerido aparece no card da carona. O pagamento é combinado diretamente com o motorista via PIX, dinheiro ou outro método acordado antes da viagem.',
  },
  {
    id: 'faq-8',
    category: 'notificacoes',
    question: 'Como ativo alertas de novas caronas?',
    answer:
      'Em Perfil > Preferências de notificação ou na tela de busca, defina seu trajeto e horário de interesse. Você recebe um alerta quando uma carona compatível for publicada.',
  },
];

function CentralAjuda() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState(null);
  const [query, setQuery] = useState('');

  const filteredFaqs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return FAQS.filter((faq) => {
      const matchesCategory = activeCategory ? faq.category === activeCategory : true;
      const matchesQuery =
        normalizedQuery === '' ||
        faq.question.toLowerCase().includes(normalizedQuery) ||
        faq.answer.toLowerCase().includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, query]);

  return (
    <main className="ajuda-page">
      <section className="ajuda-shell">
        <div className="ajuda-hero">
          <div className="ajuda-hero__top">
            <div className="ajuda-hero__icon">
              <LifeBuoy aria-hidden="true" />
            </div>

            <div>
              <h1>Central de Ajuda</h1>
              <p>Encontre respostas rápidas sobre o UniCar</p>
            </div>

            <button type="button" onClick={() => navigate('/home')}>
              Voltar para Home
            </button>
          </div>

          <label className="ajuda-search">
            <Search aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por tema, dúvida ou palavra-chave..."
              aria-label="Buscar na Central de Ajuda"
            />
          </label>
        </div>

        <section className="ajuda-section" aria-labelledby="ajuda-temas-title">
          <h2 id="ajuda-temas-title">Temas</h2>

          <div className="ajuda-category-grid">
            <CategoryButton
              active={activeCategory === null}
              description="Ver perguntas gerais"
              icon={HelpCircle}
              label="Todos"
              onClick={() => setActiveCategory(null)}
            />

            {CATEGORIAS.map((category) => (
              <CategoryButton
                key={category.id}
                active={activeCategory === category.id}
                description={category.description}
                icon={category.icon}
                label={category.label}
                onClick={() => setActiveCategory(category.id)}
              />
            ))}
          </div>
        </section>

        <section className="ajuda-section" aria-labelledby="ajuda-faq-title">
          <div className="ajuda-section__header">
            <h2 id="ajuda-faq-title">Perguntas frequentes</h2>
            <span>
              {filteredFaqs.length} {filteredFaqs.length === 1 ? 'resultado' : 'resultados'}
            </span>
          </div>

          {filteredFaqs.length > 0 ? (
            <div className="ajuda-accordion">
              {filteredFaqs.map((faq) => (
                <details className="ajuda-faq" key={faq.id}>
                  <summary>{faq.question}</summary>
                  <p>{faq.answer}</p>
                </details>
              ))}
            </div>
          ) : (
            <div className="ajuda-empty">
              <HelpCircle aria-hidden="true" />
              <h3>Nenhum resultado encontrado</h3>
              <p>Tente outro termo ou entre em contato conosco abaixo.</p>
            </div>
          )}
        </section>

        <section className="ajuda-section" aria-labelledby="ajuda-contato-title">
          <h2 id="ajuda-contato-title">Ainda com dúvida?</h2>

          <div className="ajuda-contact-list" aria-label="Informações de contato">
            <ContactCard
              description="suporte@unicar.app"
              icon={Mail}
              title="Enviar e-mail"
            />
          </div>
        </section>
      </section>
    </main>
  );
}

function CategoryButton({ active, description, icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      className={`ajuda-category-button${active ? ' ajuda-category-button--active' : ''}`}
      onClick={onClick}
      aria-pressed={active}
    >
      <Icon aria-hidden="true" />
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
    </button>
  );
}

function ContactCard({ description, icon: Icon, title }) {
  return (
    <button type="button" className="ajuda-contact-card">
      <span className="ajuda-contact-card__icon">
        <Icon aria-hidden="true" />
      </span>

      <span className="ajuda-contact-card__content">
        <strong>{title}</strong>
        <small>{description}</small>
      </span>

      <ChevronRight aria-hidden="true" />
    </button>
  );
}

export default CentralAjuda;
