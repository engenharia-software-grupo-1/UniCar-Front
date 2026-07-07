import { Clock, MapPin, Shield, Users } from '../components/common/Icone.jsx';

export const itensDeRecursos = [
  { icone: Shield, titulo: 'Verificado por e-mail .edu', descricao: 'Apenas estudantes com matrícula ativa podem entrar.' },
  { icone: MapPin, titulo: 'Rotas do campus', descricao: 'Encontre caronas com origem e destino no seu campus.' },
  { icone: Clock, titulo: 'Horários flexíveis', descricao: 'Combine horários compatíveis com sua grade.' },
  { icone: Users, titulo: 'Comunidade', descricao: 'Avaliações entre colegas garantem confiança.' },
];

export const exemplosDeCaronas = [
  { motorista: 'Marina S.', curso: 'Ciência da Computação - UFCG', origem: 'Catolé', destino: 'Campus Sede', horario: '07:20', vagas: 3, preco: 'R$ 6' },
  { motorista: 'Lucas P.', curso: 'Medicina - UFCG', origem: 'Centro', destino: 'HU Alcides Carneiro', horario: '08:00', vagas: 2, preco: 'R$ 5' },
  { motorista: 'Ana C.', curso: 'Enfermagem - UFCG', origem: 'Malvinas', destino: 'CCBS', horario: '06:45', vagas: 1, preco: 'R$ 6' },
];

export const passosComoFunciona = [
  { numero: '01', titulo: 'Cadastre-se com seu e-mail acadêmico', descricao: 'Validamos sua matrícula para garantir uma comunidade segura.' },
  { numero: '02', titulo: 'Ofereça ou peça uma carona', descricao: 'Defina rota, horário e número de vagas, ou encontre uma compatível.' },
  { numero: '03', titulo: 'Combine, viaje e avalie', descricao: 'Converse pelo chat, viaje em segurança e avalie a experiência.' },
];

export const depoimentos = [
  { etiqueta: 'Recomendado', frase: 'Economizo todo mês indo do Catolé para o Campus Sede.', autor: 'Pedro Alencar', curso: 'Ciência da Computação - UFCG' },
  { etiqueta: 'Aprovado', frase: 'Ficou muito mais fácil chegar no HU para as aulas práticas.', autor: 'Júlia Martins', curso: 'Medicina - UFCG' },
  { etiqueta: 'Feito pra você', frase: 'Encontro caronas seguras entre as Malvinas e o CCBS.', autor: 'Marcos Ribeiro', curso: 'Enfermagem - UFCG' },
];
