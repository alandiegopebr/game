# 🏎️ CarBattle Arena - Battle Royale Multiplayer

**Um jogo Battle Royale frenético com carros armados!** Dirija, atire, colete powerups e seja o último sobrevivente enquanto a arena encolhe!

## 🎮 Características

### 🚗 Física de Carros Realista
- **Aceleração e drift** naturais com física de velocidade
- **Controle responsivo** com curvas baseadas na velocidade
- **Fricção** realista para movimento autêntico
- **Colisões** com as bordas da arena

### ⚔️ Combate Veicular Intenso
- **Sistema de tiro** com projéteis rápidos
- **25 de dano** por acerto direto
- **Escudos** para proteção temporária
- **Boost** para velocidade extra e manobras evasivas

### 🎯 Mecânica Battle Royale
- **Arena circular** que encolhe a cada 20 segundos
- **Zona mortal** causa 8 de dano ao ficar fora da arena
- **Sistema de eliminação** com contagem de kills
- **Respawn** após 4 segundos de morte

### 💎 Sistema de Powerups
- **⚡ Boost** (amarelo): +1.5s de turbo
- **🛡️ Shield** (azul): +4s de proteção
- **❤️ Health** (vermelho): +40 HP
- Powerups **respawnam** 8 segundos após coleta

### 🎨 Visuais e Efeitos
- **Partículas de boost** com rastro dourado
- **Explosões** de impacto com partículas coloridas
- **Efeito de pulso** nos powerups
- **Rastros de projéteis** para melhor visibilidade
- **Grid animado** de fundo
- **Zona de perigo** visual na borda da arena
- **Sombras e glow** nos elementos

### 📊 Interface Completa
- **HUD detalhado** com barras de HP, Boost e Shield
- **Leaderboard** em tempo real com top 5 jogadores
- **Indicador de zona** mostrando tamanho da arena
- **Nametags** sobre cada jogador
- **Barras de HP** sobre os carros
- **Overlay de morte** com respawn timer

### 🌐 Multiplayer em Tempo Real
- **Servidor autoritativo** com 20 TPS
- **WebSocket** para comunicação instantânea
- **Sincronização suave** de todos os jogadores
- **Estado compartilhado** globalmente

## 🎮 Controles

### 💻 Desktop/PC
| Tecla | Ação |
|-------|------|
| ⬆️ / W | Acelerar |
| ⬇️ / S | Ré/Frear |
| ⬅️ / A | Virar esquerda |
| ➡️ / D | Virar direita |
| ESPAÇO | Atirar |
| SHIFT | Boost |

### 📱 Mobile/Touch
- **Joystick virtual** (esquerda): Controle o carro
- **Botão ATIRAR** (vermelho): Dispara projéteis
- **Botão BOOST** (amarelo): Ativa turbo

> **Funciona perfeitamente em smartphones e tablets!**

## 🛠️ Tecnologias

- **Backend**: Node.js + Express + WebSocket (ws)
- **Frontend**: Canvas 2D + JavaScript puro
- **Rendering**: 60 FPS com sistema de partículas
- **Network**: 20 TPS server tick
- **Physics**: Física de carros customizada

## 🚀 Como Jogar

### Localmente
```bash
npm install
npm start
# Abra http://localhost:3000
```

### Deploy em Produção

**Frontend (Netlify):**
1. Execute: `./prepare-netlify.sh`
2. Arraste pasta `netlify-deploy` para [netlify.com](https://netlify.com)

**Backend (Render/Heroku):**
1. Deploy `server/index.js` em [render.com](https://render.com)
2. Configure URL do WebSocket em `public/index.html`

📖 **Instruções completas**: Veja [DEPLOY.md](DEPLOY.md)

---

## 🔧 Configuração

### Conectar ao Servidor WebSocket

Edite `public/index.html` e configure:

```html
<script>
  window.WS_SERVER_URL = 'wss://seu-servidor.onrender.com';
</script>
```

---

## 🎯 Objetivos

- **Boost estratégico**: Use boost para escapar ou perseguir
- **Coleta de powerups**: Shields salvam vidas!
- **Posicionamento**: Antecipe o encolhimento da zona
- **Aim preditivo**: Mire onde o inimigo vai estar
- **Hit and run**: Ataque e use boost para fugir

## 🎯 Objetivos

- Sobreviver o máximo possível
- Eliminar outros jogadores
- Dominar o leaderboard
- Ser o campeão da arena!

---

**Jogo desenvolvido com ❤️ para diversão multiplayer máxima!**

EtherQuest é um RPG 3D top‑down (Three.js) com servidor autoritativo. Agora com câmera ortográfica "vista de cima", HUD de corações, golpes com efeito de slash e novos inimigos, a pegada fica mais próxima de jogos clássicos no estilo Zelda.

## Recursos Principais

### Sistema de Movimento Estilo Zelda
- **Aceleração e desaceleração suaves** usando sistema de velocidade (vx, vy)
- **Prioridade de eixo horizontal** para movimento mais fiel aos clássicos
- Controle responsivo com WASD/setas
- Velocidade máxima dinâmica baseada em stats

### Combate e Inimigos
- **Combate melee direcional** com cone de ataque (60°)
- **Sistema de dash** para mobilidade (Shift/E)
- **Knockback** nos inimigos ao acertar ataques
- **Variedade de inimigos**:
  - Slimes (melee básico)
  - Rangers (ataques à distância)
  - Bats (movimento swooping)
  - Brutes (mini-chefes)
- **Feedback visual completo**: flash de acerto, números de dano flutuantes, efeito de slash

### Mundo Interativo
- **Objetos destrutíveis**: potes e grama que podem ser quebrados
- **Sistema de loot**: objetos destrutíveis dropam moedas e poções
- **Drops no chão** com auto-pickup
- **Mapa em grid** (28x20) com colisão

### Progressão
- Sistema de XP e níveis
- Inventário com poções
- Atributos crescentes (HP, velocidade, dano de ataque)
- Respawn do jogador após morte

### Interface e Feedback
- **HUD com corações** (cada coração = 20 HP, suporta meio coração)
- **Mini-mapa** em tempo real mostrando:
  - Mapa completo em miniatura
  - Posição de todos os jogadores
  - Localização dos inimigos
- **Barras de vida 3D** sobre jogadores e mobs
- **Câmera ortográfica** com follow suave e shake ao levar dano
- **Sistema de áudio completo**:
  - Som de ataque (square wave)
  - Som de dano (sawtooth)
  - Som de coleta de itens (harmonia dupla)
  - Som de destruição de objetos (tritone)
  - Som de level up (acorde ascendente)
  - Música de fundo em loop (melodia simples C-D-E-F-G-F-E-D)
  - Toggle mute/unmute com tecla M

### Multiplayer
- **Servidor autoritativo** com tick rate de 20 TPS
- **Interpolação de rede** para movimentos suaves
- **WebSocket** para comunicação em tempo real
- Estado compartilhado entre todos os jogadores

Estrutura do projeto
- `server/` — servidor Node.js (Express + WebSocket) com loop de jogo, IA e sincronização de estado
- `public/` — cliente web 3D (Three.js) top‑down com câmera ortográfica e HUD (corações/XP/inventário)

Como rodar (local)

1. Instale dependências:

```bash
npm install
```

2. Inicie o servidor:

```bash
npm start
```

3. Abra `http://localhost:3000` em duas abas/janelas para jogar com múltiplos clientes.

Controles
- **Movimento**: Setas ou WASD
- **Atacar**: Espaço
- **Dash**: Shift ou E
- **Usar poção**: Tecla 1
- **Mudo/Som**: Tecla M

## Tecnologias

- **Backend**: Node.js + Express + WebSocket (ws)
- **Frontend**: Three.js (renderização 3D) + WebAudio API
- **Arquitetura**: Servidor autoritativo com 20 TPS
- **Renderização**: WebGL via Three.js com câmera ortográfica
- **Networking**: Estado sincronizado via snapshots JSON

Próximos passos sugeridos
- Quests, NPCs e diálogos simples
- Sistema de classes/skills e itens equipáveis
- Inventário com múltiplos slots/itens, crafting e comércio
- Mapas maiores, biomas e portais entre áreas
- Persistência (contas/saves) e matchmaking real

Este repositório contém um MVP funcional para evoluir um RPG — sinta‑se à vontade para abrir issues/PRs com melhorias.
