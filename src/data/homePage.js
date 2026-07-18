import { Clock, MapPin, Shield, Users } from '../components/common/Icone.jsx';

export const itensDeRecursos = [
  { icone: Shield, titulo: 'Verificado pelo SIGAA', descricao: 'Apenas estudantes com matrícula ativa podem entrar.' },
  { icone: MapPin, titulo: 'Rotas do campus', descricao: 'Encontre caronas com origem e destino no seu campus.' },
  { icone: Clock, titulo: 'Horários flexíveis', descricao: 'Combine horários compatíveis com sua grade.' },
  { icone: Users, titulo: 'Comunidade', descricao: 'Avaliações entre colegas garantem confiança.' },
];

export const passosComoFunciona = [
  { numero: '01', titulo: 'Entre com suas credenciais acadêmicas', descricao: 'Validamos sua matrícula para garantir uma comunidade segura.' },
  { numero: '02', titulo: 'Ofereça ou peça uma carona', descricao: 'Defina rota, horário e número de vagas, ou encontre uma compatível.' },
  { numero: '03', titulo: 'Combine, viaje e avalie', descricao: 'Converse pelo chat, viaje em segurança e avalie a experiência.' },
];

export const depoimentos = [
  { etiqueta: 'Recomendado', frase: 'Economizo todo mês indo do Catolé para o Campus Sede.', autor: 'Pedro Alencar', curso: 'Ciência da Computação - UFCG' },
  { etiqueta: 'Aprovado', frase: 'Ficou muito mais fácil chegar no HU para as aulas práticas.', autor: 'Júlia Martins', curso: 'Medicina - UFCG' },
  { etiqueta: 'Feito pra você', frase: 'Encontro caronas seguras entre as Malvinas e o CCBS.', autor: 'Marcos Ribeiro', curso: 'Enfermagem - UFCG' },
];
