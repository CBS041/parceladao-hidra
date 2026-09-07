# Parceladão da Hidra

Sistema web desenvolvido para gerenciamento de inscrições em um evento, composto por uma landing page pública, API REST, painel administrativo e persistência de dados em SQLite.

O projeto foi desenvolvido com foco em **simplicidade, segurança, organização de código e experiência administrativa**, permitindo centralizar o recebimento e gerenciamento das inscrições.

> **Status:** Projeto descontinuado / mantido como projeto de portfólio.

---

## ✨ Visão geral

O Parceladão da Hidra possui dois principais ambientes:

* **Área pública:** landing page com informações do evento e formulário de inscrição.
* **Área administrativa:** painel protegido para gerenciamento das inscrições recebidas.

A aplicação utiliza uma arquitetura simples, adequada ao escopo do projeto, com o frontend sendo servido separadamente durante o desenvolvimento e uma API responsável pela persistência e regras de negócio.

---

## 🚀 Funcionalidades

### Área pública

* Landing page responsiva
* Formulário de inscrição
* Validação dos dados enviados
* Upload de comprovante
* Comunicação com a API REST
* Feedback visual para sucesso e erros

### Painel administrativo

* Autenticação de administrador
* Gerenciamento de sessão
* Controle de acesso
* Listagem de inscrições
* Visualização de informações dos participantes
* Cadastro manual de inscrições
* Exclusão de inscrições
* Limpeza de registros
* Exportação dos dados em CSV
* Visualização de comprovantes

### API

* API REST com Express
* Persistência em SQLite
* Autenticação baseada em sessão
* Proteção contra tentativas excessivas de login
* Configuração de CORS
* Upload de arquivos com validação
* Limitação de tamanho dos arquivos
* Configuração através de variáveis de ambiente

---

## 🛠️ Tecnologias

### Backend

* [Bun](https://bun.sh/)
* [Node.js](https://nodejs.org/)
* [Express](https://expressjs.com/)
* SQLite
* Multer
* CORS

### Frontend

* HTML5
* CSS3
* JavaScript
* Tailwind CSS

### Build & Tooling

* Webpack
* PostCSS
* Autoprefixer
* Concurrently

### Desenvolvimento

* Git
* GitHub
* Variáveis de ambiente
* Scripts automatizados para desenvolvimento e testes

---

## 🏗️ Arquitetura

O projeto utiliza uma arquitetura baseada na separação entre frontend, backend e persistência.

```text
                    ┌─────────────────────┐
                    │     Usuário         │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │     Frontend        │
                    │  Landing / Admin    │
                    └──────────┬──────────┘
                               │
                         HTTP / REST
                               │
                               ▼
                    ┌─────────────────────┐
                    │       Express       │
                    │        API          │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
             ┌─────────────┐       ┌─────────────┐
             │   SQLite    │       │   Uploads   │
             │  Database   │       │   Storage   │
             └─────────────┘       └─────────────┘
```

---

## 📁 Estrutura do projeto

```text
parceladao-hidra/
│
├── backend/
│   ├── scripts/
│   │   ├── api-smoke-test.js
│   │   ├── backup-parceladao.sh
│   │   └── reset-admin.js
│   │
│   └── server.js
│
├── css/
│   ├── tailwind.css
│   └── tailwind.src.css
│
├── img/
│
├── js/
│   ├── admin.js
│   └── app.js
│
├── admin.html
├── index.html
├── netlify.toml
├── package.json
├── tailwind.config.js
├── webpack.config.dev.js
├── webpack.config.prod.js
├── .env.example
├── .gitignore
└── README.md
```

---

## ⚙️ Requisitos

Antes de executar o projeto, certifique-se de possuir:

* [Bun](https://bun.sh/) instalado
* Git

Verifique as versões:

```bash
bun --version
git --version
```

---

## 📦 Instalação

Clone o repositório:

```bash
git clone https://github.com/CBS041/parceladao-hidra.git
```

Entre no diretório:

```bash
cd parceladao-hidra
```

Instale as dependências:

```bash
bun install
```

---

## 🔐 Configuração

Crie seu arquivo `.env` a partir do exemplo:

```bash
cp .env.example .env
```

No Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Configure as variáveis de ambiente de acordo com seu ambiente.

Exemplo:

```env
NODE_ENV=development
PORT=3001

AUTH_SECRET=your-development-secret
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change-this-password

CORS_ORIGINS=http://localhost:8080,http://127.0.0.1:8080

DATA_DIR=./data
UPLOADS_DIR=./uploads

ADMIN_SESSION_TTL_SECONDS=43200
LOGIN_WINDOW_MS=900000
MAX_LOGIN_ATTEMPTS=8

TRUST_PROXY=false
```

> **Importante:** o arquivo `.env` não deve ser versionado. Nunca publique senhas, tokens, chaves privadas ou outros segredos no Git.

---

## ▶️ Executando o projeto

### Backend

Para executar somente a API:

```bash
bun run api
```

A API ficará disponível, por padrão, em:

```text
http://localhost:3001
```

### Frontend

Para executar o frontend em modo de desenvolvimento:

```bash
bun run start
```

### Frontend + Backend

Para executar os dois simultaneamente:

```bash
bun run dev:full
```

---

## 🧪 Smoke Test

O projeto possui um script para validar os principais endpoints da API.

Configure as variáveis necessárias para o ambiente de teste e execute:

```bash
bun run smoke:api
```

Também é possível definir uma URL específica:

```powershell
$env:API_BASE_URL="http://localhost:3001"
bun run smoke:api
```

---

## 🏭 Build de produção

Para gerar o build otimizado do frontend:

```bash
bun run build
```

Os arquivos gerados serão disponibilizados no diretório:

```text
dist/
```

---

## 🔒 Segurança

O projeto possui algumas medidas de segurança implementadas, incluindo:

* Autenticação administrativa
* Sessões com tempo de expiração
* Proteção contra múltiplas tentativas de login
* Configuração de CORS
* Variáveis de ambiente para configurações sensíveis
* Limitação de tamanho de upload
* Validação de tipos de arquivos
* Separação entre dados persistentes e código da aplicação

Durante a preparação deste repositório para publicação, **dados reais, credenciais e configurações sensíveis devem permanecer fora do controle de versão**.

---

## 📤 Uploads

O sistema permite o envio de comprovantes utilizando `multipart/form-data`.

Os arquivos são armazenados fora do código-fonte da aplicação.

Tipos suportados pelo sistema:

* PDF
* JPEG
* PNG
* WebP
* HEIC
* HEIF

O tamanho máximo permitido deve ser configurado de acordo com o ambiente.

---

## 🗄️ Persistência

O projeto utiliza **SQLite** para armazenamento das inscrições.

A estrutura de armazenamento foi pensada para manter os dados persistentes separados do código da aplicação:

```text
data/
└── parceladao.db

uploads/
└── comprovantes/
```

Esses diretórios não devem ser versionados quando contiverem dados reais.

---

## 📊 Fluxo de uma inscrição

```text
Usuário
   │
   ▼
Formulário de inscrição
   │
   ├── Dados pessoais
   ├── Informações da inscrição
   └── Comprovante
   │
   ▼
API REST
   │
   ├── Validação
   ├── Upload
   └── Persistência
   │
   ▼
SQLite
   │
   ▼
Painel administrativo
   │
   ├── Visualização
   ├── Gerenciamento
   └── Exportação CSV
```

---

## 🧑‍💻 Scripts disponíveis

| Comando               | Descrição                                            |
| --------------------- | ---------------------------------------------------- |
| `bun run start`       | Inicia o frontend em desenvolvimento                 |
| `bun run api`         | Inicia a API                                         |
| `bun run dev:full`    | Inicia frontend e backend simultaneamente            |
| `bun run build`       | Gera o build de produção                             |
| `bun run smoke:api`   | Executa testes básicos da API                        |
| `bun run reset:admin` | Executa o procedimento de redefinição administrativa |

---

## 🎯 Objetivos técnicos

O projeto foi construído para resolver um problema real de gerenciamento de inscrições, priorizando:

* Desenvolvimento full-stack
* Integração frontend/backend
* Desenvolvimento de API REST
* Persistência de dados
* Autenticação
* Upload de arquivos
* Segurança básica de aplicações web
* Automação de desenvolvimento
* Organização e manutenção do projeto

---

## 📚 Aprendizados

Durante o desenvolvimento, o projeto proporcionou experiência prática com:

* Desenvolvimento de APIs REST utilizando Express
* Manipulação de banco de dados SQLite
* Autenticação e gerenciamento de sessões
* Upload e armazenamento de arquivos
* Configuração de CORS
* Proteção de endpoints administrativos
* Desenvolvimento de interfaces responsivas
* Configuração de Webpack
* Automação de scripts
* Configuração de ambientes através de variáveis de ambiente
* Deploy e infraestrutura de aplicações web

---

## 📌 Status do projeto

Este projeto **não está atualmente em produção**.

O repositório é mantido como parte do portfólio de desenvolvimento e pode ser utilizado para fins de estudo, demonstração técnica e referência arquitetural.

---

## 👨‍💻 Autor

**Cassiano Brito dos Santos**

Estudante de Engenharia de Software e desenvolvedor focado em desenvolvimento web, com interesse principalmente em **Backend e Full Stack**.

* GitHub: [CBS041](https://github.com/CBS041)
* LinkedIn: [Cassiano Brito dos Santos](https://www.linkedin.com/in/cassiano-b-santos)

---

## 📄 Licença

Este projeto está licenciado sob a licença **MIT**.

Consulte o arquivo [`LICENSE.txt`](LICENSE.txt) para mais informações.
