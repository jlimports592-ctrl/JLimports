# JL Imports — Catálogo & Gestão Simplificada

Sistema web elegante, veloz e ultra-leve para a **JL Imports**, especializada na importação de produtos nobres da Argentina (vinhos, bebidas, alfajores, produtos coloniais e doces).

---

## 🌟 Recursos do Sistema

1. **Catálogo Público com Identidade Visual Premium:**
   - Design escuro refinado (`#0B0B0C`, `#141416`), acentos dourados (`#C6A15B`) e prata (`#B7BAC0`), tipografia `Cormorant Garamond` + `Work Sans`.
   - Logomarca oficial da JL Imports integrada no topo e no hero.
   - Filtros por categoria (*Vinhos, Alfajores, Produtos Coloniais, Doces, Bebidas*) e busca em tempo real.
   - Seletor de quantidade direto nos cards.

2. **Carrinho com Checkout via WhatsApp:**
   - Drawer lateral fluido que calcula subtotais e total do pedido.
   - Botão **"Finalizar Pedido no WhatsApp"** que formata uma mensagem clara, profissional e com todos os itens, quantidades e valor total para o número configurado (`5545998328002`).
   - Seção para consulta de pedidos especiais e safras sob encomenda.

3. **Área Administrativa (`/admin.html`):**
   - Protegida por login via **Firebase Authentication** (e-mail e senha).
   - **Gestão de Produtos:** Cadastro, edição, exclusão e toggle Ativo/Inativo com link direto da foto do produto (com pré-visualização instantânea).
   - **Gestão Financeira:** Lançamentos de Entradas (Pix, Dinheiro, Cartão, Vale iFood) e Saídas (Fornecedores, Frete, Embalagens, etc.), com cálculo instantâneo de Faturamento, Total de Despesas e Saldo com filtros por período (*Hoje, Semana, Mês, Todos*).

4. **Arquitetura Ultra-Leve:**
   - Desenvolvido com **Vite + Vanilla JS**.
   - Sem frameworks pesados ou SSR.
   - Build de produção minúsculo (< 300 KB gzipped).

---

## 🚀 Como Executar Localmente

### 1. Instalar as dependências:
```bash
npm install
```

### 2. Rodar o servidor de desenvolvimento:
```bash
npm run dev
```
O Vite/Node iniciará o servidor local (padrão em `http://localhost:5173/` com fallback automático se ocupada).
- Catálogo: `http://localhost:5173/`
- Painel Admin: `http://localhost:5173/admin.html`

> **Dica:** Mesmo antes de configurar o Firebase, o sistema já funciona em modo de demonstração local para você testar a interface imediatamente!

---

## ⚙️ Configuração do Firebase

Para ativar a sincronização em tempo real e a nuvem:

### Passo 1: Criar o Projeto no Firebase
1. Acesse o [Console do Firebase](https://console.firebase.google.com/).
2. Clique em **Adicionar projeto** e dê o nome `jl-imports` (ou outro de sua preferência).
3. Desative o Google Analytics (opcional) e clique em **Criar projeto**.

### Passo 2: Ativar o Authentication
1. No menu lateral, acesse **Build > Authentication**.
2. Clique em **Primeiros passos** e ative o provedor **E-mail/Senha**.
3. Na aba **Users (Usuários)**, clique em **Adicionar usuário** e crie o seu e-mail e senha de administrador (ex: `jlimports@gmail.com` / `jlimports123`).

### Passo 3: Ativar o Firestore Database
1. Acesse **Build > Firestore Database** e clique em **Criar banco de dados**.
2. Escolha o local (ex: `southamerica-east1` em São Paulo) e inicie em modo de produção.
3. Na aba **Regras (Rules)**, copie e cole o conteúdo do arquivo `firestore.rules` deste projeto e clique em **Publicar**.

### Passo 4: Ativar o Firebase Storage
1. Acesse **Build > Storage** e clique em **Primeiros passos**.
2. Na aba **Regras (Rules)**, copie e cole o conteúdo do arquivo `storage.rules` deste projeto e clique em **Publicar**.

### Passo 5: Configurar as Variáveis de Ambiente
1. No console do Firebase, clique na engrenagem ⚙️ ao lado de *Visão geral do projeto* > **Configurações do projeto**.
2. Role até *Seus aplicativos*, clique no ícone **Web (</>)** e registre o app.
3. Copie as credenciais e preencha no arquivo `.env` na raiz do projeto:

```env
VITE_WHATSAPP_NUMBER=5545998328002

VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=jl-imports.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=jl-imports
VITE_FIREBASE_STORAGE_BUCKET=jl-imports.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789...
VITE_FIREBASE_APP_ID=1:123456789:web:...
```

---

## 📦 Gerar Build de Produção

Para gerar o pacote estático otimizado:
```bash
npm run build
```
Os arquivos serão gerados na pasta `dist/`.

---

## 🌐 Publicação no GitHub Pages (Online)

O projeto já está publicado e ativo na nuvem do GitHub Pages:

- **Catálogo Online:** [https://jlimports592-ctrl.github.io/JLimports/](https://jlimports592-ctrl.github.io/JLimports/)
- **Painel Administrativo Online:** [https://jlimports592-ctrl.github.io/JLimports/admin.html](https://jlimports592-ctrl.github.io/JLimports/admin.html)
- **Repositório GitHub:** [https://github.com/jlimports592-ctrl/JLimports](https://github.com/jlimports592-ctrl/JLimports)
