# 🚀 GUIA RÁPIDO DE DEPLOY

## ✅ O QUE VOCÊ PRECISA

### Frontend (Grátis - Netlify)
📁 Pasta `netlify-deploy/` (já criada!)
- index.html
- game.js
- style.css
- netlify.toml

### Backend (Grátis - Render.com)
📁 Arquivos:
- server/index.js
- package.json

---

## 🎯 PASSO A PASSO COMPLETO

### 1️⃣ DEPLOY DO BACKEND (Render.com)

1. Acesse [render.com](https://render.com)
2. Faça login/cadastro (pode usar GitHub)
3. Clique em **"New +"** → **"Web Service"**
4. Conecte este repositório GitHub
5. Configure:
   - **Name**: `carbattle-server` (ou qualquer nome)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server/index.js`
   - **Plan**: **Free** ✅
6. Clique **"Create Web Service"**
7. **ANOTE A URL**: `https://carbattle-server-XXXX.onrender.com`
   (Aparece no topo da página após deploy)

⏱️ Aguarde ~5 minutos para o deploy completar

---

### 2️⃣ CONFIGURAR CONEXÃO WEBSOCKET

1. Abra o arquivo: `netlify-deploy/index.html`
2. Procure por:
```html
// window.WS_SERVER_URL = 'wss://seu-servidor-websocket.com';
```
3. Descomente e substitua pela URL do Render:
```html
window.WS_SERVER_URL = 'wss://carbattle-server-XXXX.onrender.com';
```
(Use a URL que você anotou, trocando `https` por `wss`)

4. **SALVE o arquivo!**

---

### 3️⃣ DEPLOY DO FRONTEND (Netlify)

**Opção A - Arrastar e Soltar (Mais Fácil)**

1. Acesse [app.netlify.com](https://app.netlify.com)
2. Faça login/cadastro
3. Arraste a pasta `netlify-deploy` para a área de drop
4. Aguarde o deploy (~30 segundos)
5. **Pronto!** Anote a URL: `https://seu-site-XXXX.netlify.app`

**Opção B - Via Git**

1. Faça commit e push para GitHub
2. No Netlify: **"Import from Git"**
3. Conecte o repositório
4. Configure:
   - **Build command**: (deixe vazio)
   - **Publish directory**: `netlify-deploy`
5. Deploy!

---

## ✅ CHECKLIST FINAL

- [ ] Backend deployado no Render (URL anotada)
- [ ] `netlify-deploy/index.html` configurado com URL do WebSocket
- [ ] Frontend deployado no Netlify
- [ ] Testado e funcionando!

---

## 🎮 TESTAR

1. Abra a URL do Netlify no navegador
2. Aguarde "Conectando..." (pode demorar ~1min na primeira vez - Render cold start)
3. Deve aparecer "Você: pXXX"
4. **Jogue!** 🏎️💨

---

## 🐛 PROBLEMAS COMUNS

### "Conectando..." infinito
- ✅ Verifique se configurou o `WS_SERVER_URL` correto
- ✅ Use `wss://` (não `https://`)
- ✅ Aguarde 1-2 minutos (servidor pode estar "dormindo")

### "Mixed Content Error"
- ✅ Frontend HTTPS precisa backend WSS (já está ok se usar Render)

### Servidor demora para responder
- ✅ Normal! Render Free "dorme" após 15min inativo
- ✅ Primeira conexão demora ~30-60 segundos

---

## 💰 CUSTOS

**TUDO GRÁTIS! 🎉**

- ✅ Netlify: 100GB/mês
- ✅ Render: 750h/mês (suficiente)
- ⚠️ Render Free dorme após inatividade (acorda em ~1min)

Para produção com servidor sempre ativo, upgrade Render para $7/mês.

---

## 📱 COMPARTILHAR

Depois de deployado, compartilhe a URL do Netlify:
`https://seu-site.netlify.app`

Funciona em:
- ✅ Desktop
- ✅ Mobile
- ✅ Tablet

---

**Qualquer dúvida, consulte DEPLOY.md para detalhes técnicos!**
