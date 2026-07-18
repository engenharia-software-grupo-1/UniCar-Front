import { Ban, CheckCircle2, Clock3, Hourglass, TimerOff, XCircle } from 'lucide-react';
import './StatusReservaBadge.css';

const STATUS = {
  PENDENTE: { rotulo: 'Pendente', classe: 'pendente', Icone: Clock3 },
  ACEITA: { rotulo: 'Confirmada', classe: 'aceita', Icone: CheckCircle2 },
  RECUSADA: { rotulo: 'Recusada', classe: 'recusada', Icone: XCircle },
  CANCELADA: { rotulo: 'Cancelada', classe: 'cancelada', Icone: Ban },
  EXPIRADA: { rotulo: 'Expirada', classe: 'expirada', Icone: TimerOff },
  FINALIZADA: { rotulo: 'Finalizada', classe: 'finalizada', Icone: Hourglass },
};

const ALIASES = { ATIVA: 'ACEITA', CONFIRMADA: 'ACEITA' };

function obterStatusReserva(status) {
  const valor = String(status || 'PENDENTE').toUpperCase();
  const chave = ALIASES[valor] || valor;
  return STATUS[chave] || { rotulo: valor || 'Reserva', classe: 'pendente', Icone: Clock3 };
}

export default function StatusReservaBadge({ status, compacto = false }) {
  const { rotulo, classe, Icone } = obterStatusReserva(status);

  return (
    <span className={`status-reserva-badge status-reserva-badge--${classe}${compacto ? ' is-compact' : ''}`}>
      <Icone size={compacto ? 12 : 14} aria-hidden="true" />
      {rotulo}
    </span>
  );
}
