import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Contract test ESTÁTICO: cruza os endpoints que os services do front chamam
// (via apiRequest) com os paths declarados no contrato do backend (openapi.yaml,
// cópia versionada em src/test/contract/). NÃO precisa do backend rodando e NÃO
// usa mocks — pega divergências de path como interesses/notificações antes de
// virarem 500 contra a API real. Limite conhecido: só cobre chamadas via
// `apiRequest('/path', ...)`; endpoints montados por fetch+constante (ex.: o
// GET de avaliações) ficam de fora.

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVICES_DIR = join(__dirname, '..', '..', 'services');
const OPENAPI = readFileSync(join(__dirname, 'openapi.yaml'), 'utf8');

// Params viram um placeholder único: `/caronas/{id}` e `/caronas/${x}` → `/caronas/{}`.
function normalizar(path) {
  return path
    .replace(/\?.*$/, '') // descarta a query string (?a=b) — o contrato indexa por path
    .replace(/\$\{[^}]*\}/g, '{}') // interpolação JS: ${...}
    .replace(/\{[^}]*\}/g, '{}'); // param do openapi: {id}
}

// Paths declarados no contrato: linhas de topo "  /algum/path:".
function pathsDoContrato() {
  const paths = new Set();
  const re = /^ {2}(\/[^\s:]+):/gm;
  let m;
  while ((m = re.exec(OPENAPI)) !== null) {
    paths.add(normalizar(m[1]));
  }
  return paths;
}

// Paths que um service chama via apiRequest('/x', ...) / apiRequest(`/x/${y}`).
function pathsDoServico(codigo) {
  const paths = new Set();
  const re = /apiRequest\(\s*[`'"]([^`'"]+)[`'"]/g;
  let m;
  while ((m = re.exec(codigo)) !== null) {
    paths.add(m[1]);
  }
  return [...paths];
}

function metodosDoContrato() {
  const operacoes = new Map();
  const rePath = /^ {2}(\/[^\s:]+):\r?\n([\s\S]*?)(?=^ {2}\/|(?![\s\S]))/gm;
  let pathMatch;

  while ((pathMatch = rePath.exec(OPENAPI)) !== null) {
    const metodos = new Set();
    const reMetodo = /^ {4}(get|post|put|patch|delete):/gm;
    let metodoMatch;

    while ((metodoMatch = reMetodo.exec(pathMatch[2])) !== null) {
      metodos.add(metodoMatch[1].toUpperCase());
    }

    operacoes.set(normalizar(pathMatch[1]), metodos);
  }

  return operacoes;
}

function operacoesDoServico(codigo) {
  const operacoes = [];
  const re = /apiRequest\(\s*[`'"]([^`'"]+)[`'"]/g;
  let match;

  while ((match = re.exec(codigo)) !== null) {
    const opcoes = codigo.slice(re.lastIndex, re.lastIndex + 160);
    const metodo = opcoes.match(/^\s*,\s*\{\s*method:\s*['"](GET|POST|PUT|PATCH|DELETE)['"]/i);
    operacoes.push({
      path: match[1],
      metodo: metodo?.[1]?.toUpperCase() || 'GET',
    });
  }

  return operacoes;
}

const CONTRATO = pathsDoContrato();
const METODOS_CONTRATO = metodosDoContrato();

// Divergências CONHECIDAS: o front chama um path ausente do contrato, mas o fix
// depende de decisão (qual endpoint usar) ou de backend futuro. Rastreadas aqui
// (path já normalizado) para o teste vigiar divergências NOVAS sem travar na
// dívida conhecida. Ao resolver uma, remova-a daqui — o teste avisa se sobrar
// entrada obsoleta.
const DIVERGENCIAS_CONHECIDAS = {
  // Implementado em UsuarioController, mas ainda ausente do YAML versionado no backend.
  'profileService.js': ['/usuarios/me/foto'],
};

const SERVICES = readdirSync(SERVICES_DIR)
  .filter((f) => f.endsWith('.js') && !f.endsWith('.test.js'))
  .map((f) => ({
    nome: f,
    codigo: readFileSync(join(SERVICES_DIR, f), 'utf8'),
  }))
  .map((service) => ({
    nome: service.nome,
    endpoints: pathsDoServico(service.codigo),
    operacoes: operacoesDoServico(service.codigo),
  }))
  .filter((s) => s.endpoints.length > 0);

describe('contrato: o openapi.yaml foi lido', () => {
  it('extraiu um conjunto de paths não vazio do contrato', () => {
    expect(CONTRATO.size).toBeGreaterThan(10);
  });

  it('achou services que chamam apiRequest', () => {
    expect(SERVICES.length).toBeGreaterThan(0);
  });
});

describe('contrato: todo endpoint chamado pelo front existe no openapi', () => {
  it.each(SERVICES.map((s) => [s.nome, s]))(
    '%s não introduz path novo fora do contrato',
    (_nome, service) => {
      const conhecidas = DIVERGENCIAS_CONHECIDAS[service.nome] || [];
      const foraDoContrato = service.endpoints
        .map(normalizar)
        .filter((p) => !CONTRATO.has(p) && !conhecidas.includes(p));

      expect(
        foraDoContrato,
        `Paths NOVOS chamados por ${service.nome} fora do contrato ` +
          `(se for esperado, corrija o path ou registre em DIVERGENCIAS_CONHECIDAS):\n` +
          foraDoContrato.map((p) => `  ${p}`).join('\n'),
      ).toEqual([]);
    },
  );

  // Guarda contra allowlist obsoleta: se uma divergência conhecida deixou de
  // existir (path corrigido), a entrada deve ser removida.
  it('não tem entradas obsoletas em DIVERGENCIAS_CONHECIDAS', () => {
    const obsoletas = [];
    for (const [nome, paths] of Object.entries(DIVERGENCIAS_CONHECIDAS)) {
      const service = SERVICES.find((s) => s.nome === nome);
      const chamados = new Set((service?.endpoints || []).map(normalizar));
      for (const p of paths) {
        // Obsoleta se: o front não chama mais esse path, OU o contrato passou a
        // tê-lo (então não é mais divergência).
        if (!chamados.has(p) || CONTRATO.has(p)) obsoletas.push(`${nome}: ${p}`);
      }
    }

    expect(obsoletas, `Remova de DIVERGENCIAS_CONHECIDAS:\n${obsoletas.join('\n')}`).toEqual(
      [],
    );
  });
});

describe('contrato: mÃ©todos HTTP usados pelo front', () => {
  it.each(SERVICES.map((s) => [s.nome, s]))(
    '%s usa apenas operaÃ§Ãµes declaradas no contrato',
    (_nome, service) => {
      const conhecidas = DIVERGENCIAS_CONHECIDAS[service.nome] || [];
      const invalidas = service.operacoes.filter(({ path, metodo }) =>
        !conhecidas.includes(normalizar(path)) &&
        !METODOS_CONTRATO.get(normalizar(path))?.has(metodo));

      expect(
        invalidas,
        `OperaÃ§Ãµes fora do contrato em ${service.nome}:\n` +
          invalidas.map(({ path, metodo }) => `  ${metodo} ${path}`).join('\n'),
      ).toEqual([]);
    },
  );
});
