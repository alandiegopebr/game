# 🚀 Deploy CarBattle Arena

## 📦 Arquivos Necessários

### Frontend (Netlify/Vercel/GitHub Pages)
Apenas a pasta `public/`:
- `index.html`
- `game.js`
- `style.css`

### Backend (Heroku/Render/Railway)
- `server/index.js`
- `package.json`

---

## 🌐 Deploy Frontend no Netlify

### Opção 1: Deploy Manual
1. Faça login em [netlify.com](https://netlify.com)
2. Arraste a pasta `public/` para o Netlify
3. Anote a URL do seu site (ex: `https://seu-site.netlify.app`)

### Opção 2: Deploy via Git
1. Faça push para GitHub
2. Conecte repositório no Netlify
3. Configure:
   - **Build command**: (deixe vazio)
   - **Publish directory**: `public`

---

## 🖥️ Deploy Backend (Servidor WebSocket)

### Render.com (RECOMENDADO - Grátis)

1. Crie conta em [render.com](https://render.com)
2. Clique em **New > Web Service**
3. Conecte seu repositório GitHub
4. Configure:
   - **Name**: `carbattle-server`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server/index.js`
   - **Plan**: Free
5. Clique em **Create Web Service**
6. Anote a URL (ex: `https://carbattle-server.onrender.com`)

### Heroku

```bash
# 1. Instale Heroku CLI
# 2. Login
heroku login

# 3. Crie app
heroku create seu-carbattle-server

# 4. Deploy
git push heroku main

# 5. Anote a URL
heroku info
```

### Railway.app

1. Conecte GitHub em [railway.app](https://railway.app)
2. Deploy do repositório
3. Configure variável `PORT`
4. Anote a URL

---

## 🔗 Conectar Frontend ao Backend

Edite `public/index.html` e descomente/configure:

```html
<script>
  window.WS_SERVER_URL = 'wss://seu-servidor.onrender.com';
</script>
```

**Exemplos de URLs:**
- Render: `wss://carbattle-server.onrender.com`
- Heroku: `wss://seu-app.herokuapp.com`
- Railway: `wss://seu-app.up.railway.app`

---

## ✅ Checklist Final

- [ ] Backend deployado e funcionando
- [ ] URL do backend anotada
- [ ] `index.html` configurado com URL do WebSocket
- [ ] Frontend deployado no Netlify
- [ ] Jogo testado e funcionando

---

## 🧪 Testar Localmente

```bash
# Servidor
npm start

# Abra http://localhost:3000
```

---

## 📱 Funcionalidades

✅ Desktop (teclado)  
✅ Mobile (touch)  
✅ Multiplayer em tempo real  
✅ Battle Royale completo  

---

## 🐛 Troubleshooting

**Erro: "Conectando..."**
- Verifique se o servidor está rodando
- Confirme a URL do WebSocket no `index.html`
- Use `wss://` para HTTPS, `ws://` para HTTP

**Erro: "Mixed Content"**
- Frontend HTTPS precisa de backend WSS (HTTPS)
- Use Render/Heroku que fornecem HTTPS grátis

**Servidor dorme (Render Free)**
- Primeira conexão pode demorar ~1min (cold start)
- Considere usar serviço pago para produção

---

## 💡 Dicas

- **Render Free Tier**: Servidor dorme após 15min inativo
- **Netlify**: 100GB banda/mês grátis
- **WebSocket**: Requer conexão persistente (não funciona em Netlify Functions)
- **Produção**: Use Render Paid ou Railway para servidor sempre ativo

---

**Criado para diversão multiplayer! 🏎️💨**
