# Arquitetura — Parceladão da Hidra

## Visão geral

O Parceladão da Hidra é uma aplicação web para gerenciamento de inscrições em eventos. A solução combina uma interface pública, um painel administrativo e uma API REST com persistência local em SQLite.

## Stack

- **Runtime:** Bun
- **Backend:** Express
- **Banco:** SQLite via `bun:sqlite`
- **Uploads:** Multer
- **Frontend:** HTML, JavaScript e Tailwind CSS
- **Build:** Webpack + Tailwind CSS

## Componentes

```text
Usuário
   │
   ▼
Frontend público
(index.html + js/app.js)
   │
   │ POST /api/submissions
   ▼
Express API
(backend/server.js)
   │
   ├── Autenticação administrativa
   ├── Validação
   ├── Rate limiting de login
   ├── Persistência ──────► SQLite
   │
   └── Uploads ───────────► filesystem

Administrador
   │
   ▼
Painel admin
(admin.html + js/admin.js)
   │
   └── API REST protegida
```

## Estrutura

- `backend/server.js` — API, autenticação, validação, persistência e entrega de arquivos estáticos.
- `backend/scripts/api-smoke-test.js` — validação básica dos endpoints.
- `backend/scripts/reset-admin.js` — utilitário para redefinição de credenciais.
- `index.html` — interface pública e formulário de inscrição.
- `admin.html` — painel administrativo.
- `js/app.js` — comportamento do formulário público.
- `js/admin.js` — comportamento do painel administrativo.
- `css/tailwind.src.css` — fonte do Tailwind.
- `webpack.common.js` — configuração compartilhada do Webpack.
- `webpack.config.dev.js` — configuração de desenvolvimento.
- `webpack.config.prod.js` — configuração de produção.

## Persistência

A tabela `submissions` armazena os dados das inscrições e os metadados dos comprovantes. Os arquivos enviados são armazenados no diretório configurado por `UPLOADS_DIR`.

A tabela `admin_credentials` mantém o email administrativo e o hash da senha. A senha utiliza `scrypt` com salt para novas credenciais.

## Autenticação

O painel administrativo utiliza sessão assinada por HMAC, armazenada em cookie `HttpOnly`. O cookie utiliza `SameSite=Lax` e recebe o atributo `Secure` em produção.

Também existe suporte a Basic Auth para automações controladas e smoke tests.

## Segurança

As principais medidas implementadas são:

- allowlist de CORS configurável por ambiente;
- autenticação das rotas administrativas;
- cookies `HttpOnly`;
- `SameSite=Lax` e `Secure` em produção;
- hash de senha com `scrypt` e salt;
- comparação de credenciais com `timingSafeEqual`;
- limitação de tentativas de login por IP;
- validação de variáveis críticas em produção;
- limite de tamanho para uploads;
- remoção do arquivo associado quando uma inscrição é excluída.

### Pontos de atenção

- A validação de uploads deve evoluir para validação por conteúdo/magic bytes, e não depender apenas do MIME informado pelo cliente ou da extensão do arquivo.
- SQLite é adequado ao escopo do projeto, mas pode deixar de ser a melhor opção com aumento significativo de concorrência.
- Em produção, `data/` e `uploads/` precisam de armazenamento persistente e rotina de backup.

## Fluxo de inscrição

1. O usuário preenche o formulário público.
2. O frontend valida os campos.
3. O comprovante é enviado junto com os dados para a API.
4. A API valida os dados e persiste a inscrição no SQLite.
5. O comprovante é armazenado no filesystem.
6. O administrador acessa o painel autenticado.
7. As inscrições podem ser consultadas, excluídas ou exportadas.

## Build

O processo de produção compila o Tailwind CSS e executa o Webpack para gerar os artefatos em `dist/`.

```bash
bun run build
```

## Decisões técnicas

A arquitetura foi mantida deliberadamente simples porque o sistema possui escopo pequeno e baixa complexidade operacional. O uso de SQLite reduz dependências de infraestrutura, enquanto Express mantém a API direta e fácil de evoluir.

O projeto também separa a interface pública da área administrativa e concentra as regras de negócio e persistência no backend.
