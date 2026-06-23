import { Clock, MapPin, Shield, Users } from '../components/common/Icon.jsx';

export const featureItems = [
  { icon: Shield, title: 'Verificado por e-mail .edu', desc: 'Apenas estudantes com matrícula ativa podem entrar.' },
  { icon: MapPin, title: 'Rotas do campus', desc: 'Encontre caronas com origem e destino no seu campus.' },
  { icon: Clock, title: 'Horários flexíveis', desc: 'Combine horários compatíveis com sua grade.' },
  { icon: Users, title: 'Comunidade', desc: 'Avaliações entre colegas garantem confiança.' },
];

export const rideExamples = [
  { driver: 'Marina S.', course: 'Engenharia - UFRJ', from: 'Tijuca', to: 'Fundão', time: '07:20', seats: 3, price: 'R$ 8' },
  { driver: 'Lucas P.', course: 'Direito - PUC-Rio', from: 'Botafogo', to: 'Gávea', time: '08:00', seats: 2, price: 'R$ 6' },
  { driver: 'Ana C.', course: 'Medicina - UERJ', from: 'Méier', to: 'Vila Isabel', time: '06:45', seats: 1, price: 'R$ 7' },
];

export const howItWorksSteps = [
  { n: '01', title: 'Cadastre-se com seu e-mail acadêmico', desc: 'Validamos sua matrícula para garantir uma comunidade segura.' },
  { n: '02', title: 'Ofereça ou peça uma carona', desc: 'Defina rota, horário e número de vagas, ou encontre uma compatível.' },
  { n: '03', title: 'Combine, viaje e avalie', desc: 'Converse pelo chat, viaje em segurança e avalie a experiência.' },
];

export const testimonials = [
  { tag: 'Recomendado', quote: 'Economizo R$ 200 por mês indo pra faculdade.', author: 'Pedro Alencar', course: 'Engenharia - UFRJ' },
  { tag: 'Aprovado', quote: 'Fiz amizades incríveis no caminho pro campus.', author: 'Júlia Martins', course: 'Direito - PUC-Rio' },
  { tag: 'Feito pra você', quote: 'Caronas seguras, só com gente da minha universidade.', author: 'Marcos Ribeiro', course: 'Medicina - UERJ' },
];
