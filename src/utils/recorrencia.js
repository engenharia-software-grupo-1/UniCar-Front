// Regras de recorrência de carona — lógica pura, sem rede.
//
// A recorrência NÃO é um atributo da carona: no contrato, o motorista escolhe
// dias da semana e o front os converte em datas concretas. O back cria uma
// carona independente por data. Este módulo é a fronteira entre as duas coisas.
//
// Fica fora do caronaService de propósito: as páginas mockam o serviço nos
// testes, e mockar essas regras esvaziaria justamente o que precisa ser testado.

// Rótulos dos dias, na ordem em que os formulários os exibem (semana começa na
// segunda). São eles que o motorista marca na tela.
export const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

// Indexado por Date#getDay() (0 = domingo).
export const DIA_POR_INDICE = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// Converte a recorrência escolhida no formulário numa lista de datas concretas.
// A data escolhida sempre vira uma carona; os dias marcados geram as ocorrências
// seguintes, dentro da janela de uma semana a partir dela (D até D+6).
//
// Como sete dias consecutivos cobrem cada dia da semana exatamente uma vez, cada
// dia marcado gera no máximo uma data — e a data base nunca duplica, mesmo que o
// dia dela esteja marcado.
export function expandirDatasDaRecorrencia(dados = {}) {
  const { dataHoraSaida, recorrente, diasRecorrencia } = dados;

  if (!dataHoraSaida) {
    return [];
  }

  const marcados = recorrente && Array.isArray(diasRecorrencia) ? diasRecorrencia : [];

  if (marcados.length === 0) {
    return [dataHoraSaida];
  }

  const [dataBase, horario = ''] = dataHoraSaida.split('T');
  const base = dataLocal(dataBase);

  if (!base) {
    return [dataHoraSaida];
  }

  const datas = [dataHoraSaida];

  for (let adiante = 1; adiante <= 6; adiante += 1) {
    const dia = new Date(base);
    dia.setDate(dia.getDate() + adiante);

    if (marcados.includes(DIA_POR_INDICE[dia.getDay()])) {
      datas.push(`${dataLocalISO(dia)}T${horario}`);
    }
  }

  return datas;
}

// 'AAAA-MM-DDTHH:mm:00' → 'Seg, 13/07 às 07:00'.
export function formatarDataHora(dataHora = '') {
  const [data = '', horario = ''] = dataHora.split('T');
  const base = dataLocal(data);

  if (!base) {
    return dataHora;
  }

  const pad = (n) => String(n).padStart(2, '0');

  return (
    `${DIA_POR_INDICE[base.getDay()]}, ` +
    `${pad(base.getDate())}/${pad(base.getMonth() + 1)} às ${horario.slice(0, 5)}`
  );
}

// Interpreta 'AAAA-MM-DD' no fuso local: new Date('2026-07-13') seria lido como
// UTC e poderia cair no dia anterior.
function dataLocal(valor = '') {
  const [ano, mes, dia] = valor.split('-').map(Number);

  if (!ano || !mes || !dia) {
    return null;
  }

  return new Date(ano, mes - 1, dia);
}

function dataLocalISO(data) {
  const pad = (n) => String(n).padStart(2, '0');

  return `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}`;
}
