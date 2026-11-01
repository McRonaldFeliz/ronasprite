# Ronasprite

Editor de sprites e pixel art 2D, com sistemas que fazem falta nos editores atuais.

## Rodar

```bash
npm install
npm run dev     # abre em http://localhost:5173
npm test        # testes do núcleo
npm run build   # gera a versão final em dist/
```

## Estrutura

- `src/core/`: o núcleo de edição em TypeScript puro, sem interface. É o mesmo código pra web, PC (Tauri) e Android (Capacitor).
  - `sprite.ts`: sprite, camadas, frames e células (camada x frame).
  - `palette-tools.ts`: troca de cores (várias de uma vez, com tolerância, por camada, frame ou seleção), paleta automática com as cores usadas na imagem e detecção de cores quase iguais.
  - `tools.ts`: lápis em linha e balde de tinta.
  - `history.ts`: desfazer e refazer.
- `src/ui/`: a interface em React, com tema roxo e amarelo.

## O que já funciona

- Lápis, borracha, balde e conta-gotas. Desfazer com Ctrl+Z e refazer com Ctrl+Shift+Z.
- Paleta editável.
- Painel **Cores da imagem**: mostra todas as cores usadas e quantos pixels cada uma tem. Clicar numa cor destaca os pixels dela e permite trocar a cor. Também junta cores quase iguais.
- Camadas com visibilidade.
- Frames (vazio ou cópia do atual) e preview em loop.
- Exportação em PNG.

## Próximos passos

- Tela dividida com a linha do tempo e os frames lado a lado.
- Onion skin, opacidade das camadas, seleção e formas.
- Formato de arquivo próprio, exportação em GIF e spritesheet com JSON.
- Empacotamento pra PC (Tauri) e Android (Capacitor).
