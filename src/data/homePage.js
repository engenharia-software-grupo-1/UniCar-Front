import { Clock, MapPin, Shield, Users } from '../components/common/Icone.jsx';

export const itensDeRecursos = [
  { icone: Shield, titulo: 'Verificado por e-mail .edu', descricao: 'Apenas estudantes com matrícula ativa podem entrar.' },
  { icone: MapPin, titulo: 'Rotas do campus', descricao: 'Encontre caronas com origem e destino no seu campus.' },
  { icone: Clock, titulo: 'Horários flexíveis', descricao: 'Combine horários compatíveis com sua grade.' },
  { icone: Users, titulo: 'Comunidade', descricao: 'Avaliações entre colegas garantem confiança.' },
];

export const exemplosDeCaronas = [
  { motorista: 'Marina S.', curso: 'Engenharia - UFRJ', origem: 'Tijuca', destino: 'Fundão', horario: '07:20', vagas: 3, preco: 'R$ 8' },
  { motorista: 'Lucas P.', curso: 'Direito - PUC-Rio', origem: 'Botafogo', destino: 'Gávea', horario: '08:00', vagas: 2, preco: 'R$ 6' },
  { motorista: 'Ana C.', curso: 'Medicina - UERJ', origem: 'Méier', destino: 'Vila Isabel', horario: '06:45', vagas: 1, preco: 'R$ 7' },
];

export const passosComoFunciona = [
  { numero: '01', titulo: 'Cadastre-se com seu e-mail acadêmico', descricao: 'Validamos sua matrícula para garantir uma comunidade segura.' },
  { numero: '02', titulo: 'Ofereça ou peça uma carona', descricao: 'Defina rota, horário e número de vagas, ou encontre uma compatível.' },
  { numero: '03', titulo: 'Combine, viaje e avalie', descricao: 'Converse pelo chat, viaje em segurança e avalie a experiência.' },
];

export const depoimentos = [
  { etiqueta: 'Recomendado', frase: 'Economizo R$ 200 por mês indo pra faculdade.', autor: 'Pedro Alencar', curso: 'Engenharia - UFRJ' },
  { etiqueta: 'Aprovado', frase: 'Fiz amizades incríveis no caminho pro campus.', autor: 'Júlia Martins', curso: 'Direito - PUC-Rio' },
  { etiqueta: 'Feito pra você', frase: 'Caronas seguras, só com gente da minha universidade.', autor: 'Marcos Ribeiro', curso: 'Medicina - UERJ' },
];
