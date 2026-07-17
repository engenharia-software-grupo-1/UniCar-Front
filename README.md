# UniCar Front

Aplicação web do UniCar, uma plataforma de caronas universitárias. O projeto reúne os fluxos de autenticação, perfil, veículos, oferta e busca de caronas, reservas, histórico, notificações e avaliações.

## Tecnologias

- React 19 e React Router
- Vite
- JavaScript e CSS
- Vitest e Testing Library
- MSW para desenvolvimento offline
- ESLint

## Requisitos

- Node.js
- npm

## Começando

Instale as dependências e crie seu arquivo de ambiente:

```bash
npm install
cp .env.example .env
```

Inicie o ambiente de desenvolvimento:

```bash
npm run dev
```

O Vite exibirá a URL local — normalmente `http://localhost:5173`.

## Configuração da API e mocks

As variáveis de ambiente estão documentadas em [`.env.example`](.env.example).

```dotenv
VITE_API_URL=http://localhost:8080
VITE_ENABLE_MOCKS=false
VITE_MOCK_FALTANTES=false
```

- `VITE_API_URL`: URL base da API usada no build e na prévia de produção.
- `VITE_ENABLE_MOCKS=true`: executa a interface com dados simulados durante o desenvolvimento.
- `VITE_MOCK_FALTANTES=true`: em desenvolvimento, usa mocks apenas para endpoints ainda não disponíveis na API.

Mocks e fallbacks de desenvolvimento não são iniciados em builds de produção. Para uso normal, mantenha as duas flags de mock como `false` e execute a API configurada em `VITE_API_URL`.

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Inicia o servidor de desenvolvimento. |
| `npm run build` | Gera o build de produção em `dist/`. |
| `npm run preview` | Serve localmente o último build. |
| `npm run lint` | Executa o ESLint. |
| `npm test` | Executa toda a suíte de testes. |
| `npm run test:unit` | Executa testes unitários, sem os testes de contrato. |
| `npm run test:contract` | Executa os testes de contrato dos serviços. |
| `npm run test:coverage` | Gera o relatório de cobertura. |

Antes de abrir um pull request, execute:

```bash
npm run lint
npm test
npm run build
```

## Funcionalidades

- Autenticação e aceite dos termos de uso
- Perfil, foto de perfil e preferências
- Cadastro e gerenciamento de veículos
- Oferta, edição, cancelamento, início e finalização de caronas
- Busca com filtros e alertas de trajetos de interesse
- Reservas e gerenciamento de solicitações de passageiros
- Histórico de caronas para motoristas e passageiros
- Perfis públicos, bloqueio de usuários e avaliações
- Notificações e central de ajuda

## Estrutura do projeto

```text
src/
├── components/  # Componentes reutilizáveis e layout
├── data/        # Conteúdo estático da interface
├── hooks/       # Hooks React
├── mocks/       # Handlers MSW usados no desenvolvimento
├── pages/       # Telas e estilos por domínio
├── routes/      # Entradas de rota
├── services/    # Integração com API, sessão e normalização de dados
├── utils/       # Utilitários puros
└── test/        # Configuração compartilhada dos testes
```

## Rotas principais

Depois da autenticação, as principais telas estão disponíveis em:

- `/inicio`
- `/buscar-carona`
- `/ofertar-carona`
- `/minhas-caronas`
- `/historico-caronas`
- `/perfil`
- `/meus-veiculos`
- `/interesses`
- `/notificacoes`

As rotas autenticadas são protegidas no cliente para navegação. A API deve continuar sendo a fonte de verdade para autenticação, autorização e acesso a recursos de outros usuários.

## Segurança e dados locais

- A sessão do navegador é mantida em `sessionStorage`; integrações de produção devem preferir cookies `HttpOnly`, `Secure` e `SameSite` fornecidos pela API.
- Dados simulados são exclusivos de desenvolvimento e não devem ser usados como fonte de verdade.
- Endereços geocodificados ficam apenas temporariamente na sessão do navegador.
- Não registre tokens, dados pessoais ou respostas sensíveis em logs do cliente.

## Status

O projeto está em evolução junto da API do UniCar. Quando um endpoint passar a existir no backend, remova o handler correspondente em `src/mocks/` e mantenha o contrato coberto por testes.
