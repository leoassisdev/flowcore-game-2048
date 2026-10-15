# 2048

> Deslize e some as peças até chegar ao 2048, no estilo do quebra-cabeça numérico que viralizou, com animações e desfazer. Ótimo pra página 404 e telas de espera.

**Ver ao vivo, com preview e manual:** https://flowcoresolucoes.com.br/codigos/game-2048

Criado por **FlowCore Soluções LTDA**.

## Como jogar

- `←` `↑` `→` `↓` deslizar as peças (ou W A S D)
- `U` desfazer
- `N` novo jogo
- **No celular:** Deslize o dedo sobre o tabuleiro.

## Arquivos

- [`src/Jogo2048.tsx`](src/Jogo2048.tsx)

## Como instalar

1. **Tenha um projeto React com Tailwind** Já tem (Vite, Next.js, Remix)? Pule este passo. Se não, crie um em 1 minuto e adicione ./src/**/*.{ts,tsx} ao content do tailwind.config.

   ```bash
   npm create vite@latest minha-app -- --template react-ts
   cd minha-app
   npm install -D tailwindcss@3 postcss autoprefixer
   npx tailwindcss init -p
   ```

2. **Crie o arquivo src/components/Jogo2048.tsx** Copie o conteúdo de `src/Jogo2048.tsx` deste repositório. Ele é um arquivo só, sem dependência além de React.
3. **Use na sua página**

   ```tsx
   import Jogo2048 from "./components/Jogo2048";
   
   <Jogo2048 accent="#0057FF" tamanho={5} />
   ```

4. **Personalize** Textos, dados e a cor de destaque (prop accent) são props com valor padrão. Troque pelos da sua marca ou ligue na sua API.

## Tema e cor

Abre em tema claro. Use `tema="escuro"` para o escuro e `accent` para a cor de destaque:

```tsx
<Jogo2048 accent="#0057FF" tamanho={5} />
```

## Licença

MIT. Pode usar em projeto pessoal ou comercial, de graça. A única condição é manter a linha **“Criado por FlowCore Soluções LTDA”** (ou o crédito de adaptação) onde ela está.

---

Precisa disso integrado no seu sistema? A [FlowCore](https://flowcoresolucoes.com.br) desenvolve sob medida.
