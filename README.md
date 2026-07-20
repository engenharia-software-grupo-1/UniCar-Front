# UniCar Front

Frontend da plataforma **UniCar**, um sistema de compartilhamento de caronas voltado para estudantes universitários. A aplicação oferece os fluxos de autenticação, perfil, veículos, oferta e busca de caronas, reservas, chat, avaliações, histórico e notificações.

Este projeto foi desenvolvido como parte da disciplina de **Engenharia de Software** da **Universidade Federal de Campina Grande (UFCG)**.

---

## Destaques

- Aplicação web desenvolvida com React 19 e Vite
- Navegação protegida com React Router
- Integração com a API REST do UniCar por meio de `fetch`
- Autenticação por JWT, enviado nas requisições autenticadas
- Busca de endereços e cálculo de distância para oferta de caronas
- Chat entre participantes, com alerta visual para mensagens não lidas
- Testes automatizados com Vitest e Testing Library
- Mocks locais opcionais para desenvolvimento

---

# Sumário

- [Tecnologias](#tecnologias)
- [Arquitetura](#arquitetura)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Funcionalidades](#funcionalidades)
- [Requisitos](#requisitos)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Executando o Projeto](#executando-o-projeto)
- [Integração com a API](#integração-com-a-api)
- [Autenticação](#autenticação)
- [Testes](#testes)
- [Licença](#licença)
- [Universidade](#universidade)
- [Contribuidores](#contribuidores)

---

# Tecnologias

- React 19
- React Router
- Vite
- JavaScript
- CSS
- Lucide React
- Leaflet e React Leaflet
- Vitest
- Testing Library
- MSW
- ESLint

---

# Arquitetura

O frontend é organizado por responsabilidades, separando páginas, componentes reutilizáveis, serviços de integração, hooks e utilitários.

```text
                 Usuário
                    │
                    ▼
              Páginas React
                    │
                    ▼
       Componentes e Hooks reutilizáveis
                    │
                    ▼
          Services / Integração HTTP
                    │
                    ▼
              API REST UniCar
```

---

# Estrutura do Projeto

```text
src/
├── components/  # Componentes reutilizáveis e elementos de layout
├── data/        # Conteúdo estático da interface
├── hooks/       # Hooks React reutilizáveis
├── mocks/       # Handlers MSW para desenvolvimento local
├── pages/       # Telas e estilos organizados por domínio
├── routes/      # Configuração de rotas e guardas de acesso
├── services/    # API, sessão, normalização e regras de integração
├── test/        # Configuração compartilhada dos testes
└── utils/       # Funções utilitárias puras
```

### Organização dos diretórios

| Diretório | Responsabilidade |
|-----------|------------------|
| `components` | Componentes visuais reutilizáveis e layout global. |
| `pages` | Telas acessadas pelas rotas da aplicação. |
| `services` | Comunicação com a API, armazenamento de sessão e adaptação de dados. |
| `routes` | Definição das rotas públicas, autenticadas e seus guardas. |
| `hooks` | Lógica React reutilizável entre páginas e componentes. |
| `mocks` | Simulação de respostas para desenvolvimento quando habilitada. |
| `data` | Dados estáticos usados na interface. |
| `utils` | Cálculos e transformações sem dependência de interface. |

---

# Funcionalidades

- Autenticação e aceite dos termos de uso
- Perfil, foto de perfil e preferências do usuário
- Cadastro e gerenciamento de veículos
- Oferta, edição, cancelamento, início e finalização de caronas
- Busca de caronas com filtros e geolocalização de endereços
- Reservas e gerenciamento de solicitações de passageiros
- Chat entre motorista e passageiros com aviso de mensagens não lidas
- Alertas de trajetos de interesse
- Avaliações entre usuários e perfis públicos
- Histórico de caronas como motorista e passageiro
- Notificações, bloqueio de usuários e central de ajuda

---

# Requisitos

- Node.js 20 ou superior
- npm 10 ou superior
- API do UniCar em execução ou uma URL pública configurada
- Git

---

# Variáveis de Ambiente

Crie um arquivo `.env` a partir do exemplo disponível no repositório.

```bash
cp .env.example .env
```

| Variável | Descrição |
|----------|-----------|
| `VITE_API_URL` | URL base da API do UniCar usada fora do proxy de desenvolvimento. |
| `VITE_ENABLE_MOCKS` | Habilita mocks locais em desenvolvimento quando definido como `true`. |

Exemplo:

```text
VITE_API_URL=http://localhost:8080
VITE_ENABLE_MOCKS=false
```

Em desenvolvimento, o Vite redireciona as rotas da API para `http://localhost:8080`. No build de produção, configure `VITE_API_URL` com a URL pública do backend.

---

# Executando o Projeto

Clone o repositório.

```bash
git clone https://github.com/engenharia-software-grupo-1/UniCar-Front.git
```

Acesse o diretório.

```bash
cd UniCar-Front
```

Instale as dependências.

```bash
npm install
```

Configure o ambiente e inicie o servidor de desenvolvimento.

```bash
cp .env.example .env
npm run dev
```

A aplicação estará disponível, normalmente, em:

```text
http://localhost:5173
```

Para gerar e visualizar o build de produção:

```bash
npm run build
npm run preview
```

---

# Integração com a API

O frontend consome a [UniCar API](https://github.com/engenharia-software-grupo-1/UniCar-API) para os recursos autenticados da plataforma.

Em ambiente local, o proxy do Vite encaminha as seguintes rotas para a API:

```text
/auth
/usuarios
/caronas
/reservas
/veiculos
/avaliacoes
/interesses-trajeto
/notificacoes
/chats
/historico
```

Consulte a documentação da API para conhecer os contratos disponíveis:

```text
http://localhost:8080/swagger-ui/index.html
```

---

# Autenticação

Após o login, o token JWT retornado pela API é mantido na sessão do navegador e enviado automaticamente nas requisições autenticadas.

```http
Authorization: Bearer <token>
```

As rotas protegidas no cliente impedem a navegação sem sessão. A API permanece como fonte de verdade para autenticação, autorização e controle de acesso aos recursos.

---

# Testes

Para executar todos os testes automatizados:

```bash
npm test
```

Outros comandos disponíveis:

| Comando | Descrição |
|---------|-----------|
| `npm run test:unit` | Executa os testes unitários, sem os testes de contrato. |
| `npm run test:contract` | Executa os testes de contrato dos serviços. |
| `npm run test:coverage` | Gera o relatório de cobertura. |
| `npm run lint` | Executa o ESLint. |
| `npm run build` | Gera o build de produção em `dist/`. |

Antes de abrir um pull request, execute:

```bash
npm run lint
npm test
npm run build
```

---

# Licença

Este projeto está licenciado sob os termos da **MIT License**. Consulte o arquivo [LICENSE](LICENSE) para mais informações.

---

# Universidade

Projeto desenvolvido para a disciplina de **Engenharia de Software**, ofertada pela **Universidade Federal de Campina Grande (UFCG)**.

# Contribuidores

<table>
  <tr>
    <td align="center">
      <a href="https://github.com/LiviaMacedo30">
        <img src="https://avatars.githubusercontent.com/u/174443855?v=4&size=64" width="120px;" alt="Isadora Lucena"/>
        <br />
        <sub><b>Anna Lívia Macêdo</b></sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/lorenacarvalho">
        <img src="https://avatars.githubusercontent.com/u/17915129?s=64&v=4" width="120px;" alt="Jennifer Medeiros"/>
        <br />
        <sub><b>Lorena Carvalho</b></sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/marinamoraisml">
        <img src="https://avatars.githubusercontent.com/u/174443903?s=64&v=4" width="120px;" alt="Marcelo Luis Dantas"/>
        <br />
        <sub><b>Marina Morais</b></sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/annegmsilva">
        <img src="https://avatars.githubusercontent.com/u/188988503?s=64&v=4" width="120px;" alt="Eduarda Cabral"/>
        <br />
        <sub><b>Anne Grazieli</b></sub>
      </a>
    </td>
  </tr>
</table>
