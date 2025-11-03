# 🚀 Deploy Automático no Render

Este repositório está configurado para deploy automático no Render.com!

## ✅ Como Fazer Deploy

### Opção 1: Deploy Direto (Recomendado)

Clique neste botão:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/alandiegopebr/game)

### Opção 2: Manual

1. Acesse [dashboard.render.com](https://dashboard.render.com)
2. Clique em **"New +"** → **"Web Service"**
3. Conecte este repositório: `alandiegopebr/game`
4. O Render vai detectar automaticamente o `render.yaml`
5. Clique em **"Create Web Service"**
6. Aguarde o deploy (~3-5 minutos)
7. **Anote a URL**: Algo como `https://carbattle-server.onrender.com`

## 📝 Configuração Automática

O arquivo `render.yaml` já está configurado com:
- ✅ Build: `npm install`
- ✅ Start: `node server/index.js`
- ✅ Environment: Node 18
- ✅ Health check endpoint
- ✅ Free tier

## 🔗 Depois do Deploy

1. Copie a URL do Render: `https://carbattle-server-XXXX.onrender.com`
2. Edite `netlify-deploy/index.html`
3. Configure:
```html
<script>
  window.WS_SERVER_URL = 'wss://carbattle-server-XXXX.onrender.com';
</script>
```
4. Faça deploy no Netlify
5. **Pronto!** 🎉

## ⚠️ Importante

- 🆓 Render Free tier **dorme** após 15 minutos de inatividade
- ⏱️ Primeira conexão pode demorar ~30-60 segundos (cold start)
- 🚀 Para servidor sempre ativo, upgrade para $7/mês

## 🔍 Verificar Status

Após o deploy, acesse a URL do Render no navegador.
Você verá uma página mostrando:
- ✅ Status do servidor
- 👥 Jogadores conectados
- 🔗 URL para usar no frontend

## 💡 Dicas

- Use a URL com `wss://` (WebSocket Secure) no frontend
- Não use `https://` - deve ser `wss://`
- Mantenha o servidor "acordado" fazendo ping a cada 10 min (opcional)

## 🐛 Troubleshooting

**Erro de deploy?**
- Verifique os logs no Render Dashboard
- Certifique-se que `package.json` existe
- Verifique se `server/index.js` está no repositório

**WebSocket não conecta?**
- Use `wss://` (não `ws://` ou `https://`)
- Aguarde 1-2 minutos após deploy inicial
- Verifique se configurou corretamente no `index.html`

---

**Servidor pronto para rodar! 🎮**
