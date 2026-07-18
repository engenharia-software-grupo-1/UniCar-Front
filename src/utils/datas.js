// Formatação de datas das caronas, compartilhada pelas telas de trajeto recorrente.
// Devolve um traço quando o valor está ausente ou não é uma data válida — o
// histórico vem do back e nem toda carona traz `dataHoraSaida` preenchida.

const DASH = '—';

function pad(numero) {
  return String(numero).padStart(2, '0');
}

// Dia e mês, no formato dd/mm.
export function formatarData(valor) {
  const data = new Date(valor);

  if (!valor || Number.isNaN(data.getTime())) {
    return DASH;
  }

  return `${pad(data.getDate())}/${pad(data.getMonth() + 1)}`;
}

// Hora e minuto, no formato hh:mm.
export function formatarHorario(valor) {
  const data = new Date(valor);

  if (!valor || Number.isNaN(data.getTime())) {
    return DASH;
  }

  return `${pad(data.getHours())}:${pad(data.getMinutes())}`;
}
