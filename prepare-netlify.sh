#!/bin/bash

# Script para criar pasta de deploy limpa

echo "🚀 Preparando arquivos para deploy no Netlify..."

# Criar pasta temporária
rm -rf netlify-deploy
mkdir -p netlify-deploy

# Copiar arquivos necessários
echo "📦 Copiando arquivos frontend..."
cp public/index.html netlify-deploy/
cp public/game.js netlify-deploy/
cp public/style.css netlify-deploy/
cp netlify.toml netlify-deploy/
cp DEPLOY.md netlify-deploy/README.md

echo "✅ Pronto! Pasta 'netlify-deploy' criada."
echo ""
echo "📁 Arquivos incluídos:"
ls -lh netlify-deploy/
echo ""
echo "🌐 Próximos passos:"
echo "1. Arraste a pasta 'netlify-deploy' para app.netlify.com"
echo "   OU"
echo "2. cd netlify-deploy && npx netlify-cli deploy --prod"
echo ""
echo "🖥️  Não esqueça de fazer deploy do servidor também!"
echo "    Veja DEPLOY.md para instruções completas."
