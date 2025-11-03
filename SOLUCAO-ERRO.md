# ⚠️ ERRO: Servidor WebSocket Não Configurado

## O Problema

Você fez deploy apenas do **frontend** no Netlify.

O Netlify serve arquivos estáticos (HTML/CSS/JS) mas **NÃO PODE rodar servidores WebSocket**.

---

## ✅ Solução em 3 Passos

### PASSO 1: Deploy do Servidor (5 minutos)

1. Acesse **https://render.com**
2. Clique em **"New +"** → **"Web Service"**
3. Conecte este repositório GitHub: `alandiegopebr/game`
4. Configure:
   ```
   Name: carbattle-server
   Environment: Node
   Build Command: npm install
   Start Command: node server/index.js
   Plan: Free
   ```
5. Clique **"Create Web Service"**
6. **ANOTE A URL**: `https://carbattle-server-XXXX.onrender.com`

⏱️ Aguarde ~5 minutos para completar

---

### PASSO 2: Configure o Frontend

Edite o arquivo: `netlify-deploy/index.html`

Procure esta linha:
```html
// window.WS_SERVER_URL = 'wss://seu-servidor-websocket.com';
```

Descomente e substitua pela URL do Render:
```html
window.WS_SERVER_URL = 'wss://carbattle-server-XXXX.onrender.com';
```

⚠️ **IMPORTANTE:**
- Use `wss://` (não `https://`)
- Use a URL EXATA do Render
- Não esqueça o `;` no final

**Salve o arquivo!**

---

### PASSO 3: Deploy Atualizado

Arraste a pasta `netlify-deploy` para **https://app.netlify.com** novamente

OU faça commit e push se conectou via Git:
```bash
git add .
git commit -m "Configure WebSocket server"
git push
```

---

## 🎮 Pronto!

Após esses 3 passos:
- ✅ Servidor rodando no Render
- ✅ Frontend configurado
- ✅ Deploy atualizado no Netlify
- ✅ **Jogo funcionando!**

---

## 📚 Precisa de Mais Ajuda?

- 📖 **CONFIGURAR.html** - Guia visual completo
- 📖 **GUIA-RAPIDO.md** - Instruções detalhadas
- 📖 **DEPLOY.md** - Documentação técnica

---

## 🔗 Links Úteis

- 🚀 [Render.com](https://render.com) - Deploy do servidor
- 🌐 [Netlify](https://app.netlify.com) - Deploy do frontend
- 📁 [Repositório](https://github.com/alandiegopebr/game) - Código

---

**Depois de configurar, tudo funcionará perfeitamente! 🎉**
