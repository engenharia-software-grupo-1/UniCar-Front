# UniCar Front

Interface web do UniCar, uma plataforma de caronas universitárias para conectar estudantes que fazem trajetos semelhantes até a faculdade.

## Sobre o Projeto

O UniCar tem como objetivo facilitar a oferta e busca de caronas entre universitários, priorizando economia, segurança e comunidade acadêmica. Esta aplicação contém a página inicial do produto, com apresentação da proposta, recursos, busca demonstrativa de caronas e chamada para cadastro.

## Tecnologias

- React
- Vite
- JavaScript
- CSS
- ESLint

## Requisitos

- Node.js
- npm

## Como Rodar Localmente

Instale as dependências:

```bash
npm install
```

Suba o servidor de desenvolvimento:

```bash
npm run dev
```

Abra no navegador o endereço exibido no terminal. Por padrão, o Vite costuma usar:

```text
http://localhost:5173
```

## Scripts Disponíveis

```bash
npm run dev
```

Inicia o projeto em modo de desenvolvimento.

```bash
npm run build
```

Gera a versão de produção na pasta `dist`.

```bash
npm run preview
```

Executa uma prévia local do build de produção.

```bash
npm run lint
```

Executa a análise estática com ESLint.

## Estrutura de Pastas

```text
src/
  assets/       Imagens e arquivos visuais do projeto
  components/   Componentes reutilizáveis
    common/     Componentes genéricos de interface
    layout/     Componentes estruturais, como Header e Footer
    ui/         Espaço reservado para componentes de UI
  contexts/     Contextos globais da aplicação
  data/         Dados estáticos usados nas telas
  hooks/        Hooks customizados
  lib/          Configurações e integrações auxiliares
  pages/        Páginas da aplicação
  routes/       Entradas de rota
  services/     Serviços para comunicação com APIs
  utils/        Funções utilitárias
```

## Services

A pasta `services` está preparada para concentrar chamadas ao backend quando a aplicação passar a consumir uma API. Exemplos futuros:

- `authService.js` para login, cadastro e sessão
- `ridesService.js` para busca, criação e gerenciamento de caronas
- `userService.js` para perfil e dados do estudante

Enquanto a página inicial estiver usando apenas conteúdo estático, essa pasta pode permanecer sem implementação.

## Status

Projeto em desenvolvimento. A página inicial já está estruturada e pronta para evoluir para integração com rotas, autenticação e backend.
