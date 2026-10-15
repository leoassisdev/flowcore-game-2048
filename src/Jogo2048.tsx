// Jogo2048 · Criado por FlowCore Soluções LTDA · flowcoresolucoes.com.br/codigos · licença MIT
// Deslize as peças, junte números iguais e chegue na meta. Peças deslizam e
// "estalam" ao fundir, com desfazer de uma jogada.
// Controles: setas ou WASD deslizam · U ou o botão "Desfazer" volta uma jogada ·
// N começa de novo · no celular, deslize o dedo sobre o tabuleiro.
// Props:
//   tema?: "claro" | "escuro"   tema inicial (padrão "claro"); o botão sol/lua do HUD alterna
//   onTemaChange?: (tema) => void   avisa quando o jogador troca o tema
//   accent?: string            cor de destaque (padrão "#0057FF")
//   variacao?: "Clássico" | "Mini 3x3" | "Gigante 6x6" | "Caos"   preset inicial
//   tamanho?: number           lado do tabuleiro, de 3 a 6 (padrão 4)
//   chanceQuatro?: number      chance (0..1) de nascer um 4 em vez de 2 (padrão 0.1)
//   meta?: number              peça que dá a vitória (padrão 2048)
//   pecasPorJogada?: number    quantas peças nascem a cada jogada (padrão 1)
// O seletor "Variações" troca o preset ao vivo. Recorde salvo no localStorage.
// Requisitos: React 18+ e Tailwind CSS 3+. Zero dependências.

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

/* ----------------------------- lógica pura ----------------------------- */

export type Dir2048 = "esq" | "dir" | "cima" | "baixo";

/** Desliza uma linha rumo ao índice 0; cada peça funde no máximo uma vez. */
export function moverLinha(linha: number[]): { linha: number[]; pontos: number } {
  const cheias = linha.filter((v) => v !== 0);
  const saida: number[] = [];
  let pontos = 0;
  for (let i = 0; i < cheias.length; i++) {
    if (i + 1 < cheias.length && cheias[i] === cheias[i + 1]) {
      const v = cheias[i] * 2;
      saida.push(v);
      pontos += v;
      i++;
    } else saida.push(cheias[i]);
  }
  while (saida.length < linha.length) saida.push(0);
  return { linha: saida, pontos };
}

/** Coordenadas [linha, coluna] da k-ésima casa da i-ésima "fila" na direção dada (k = 0 é a borda de destino). */
function casaDaFila(n: number, dir: Dir2048, i: number, k: number): [number, number] {
  if (dir === "esq") return [i, k];
  if (dir === "dir") return [i, n - 1 - k];
  if (dir === "cima") return [k, i];
  return [n - 1 - k, i];
}

/** Move o tabuleiro inteiro (puro). grid[linha][coluna]. */
export function mover(grid: number[][], dir: Dir2048): { grid: number[][]; pontos: number; moveu: boolean } {
  const n = grid.length;
  const novo = grid.map((l) => l.slice());
  let pontos = 0;
  let moveu = false;
  const filas = dir === "esq" || dir === "dir" ? n : grid[0]?.length ?? 0;
  const comp = dir === "esq" || dir === "dir" ? grid[0]?.length ?? 0 : n;
  for (let i = 0; i < filas; i++) {
    const original: number[] = [];
    for (let k = 0; k < comp; k++) {
      const [l, c] = casaDaFila(comp, dir, i, k);
      original.push(grid[l][c]);
    }
    const r = moverLinha(original);
    pontos += r.pontos;
    for (let k = 0; k < comp; k++) {
      if (r.linha[k] !== original[k]) moveu = true;
      const [l, c] = casaDaFila(comp, dir, i, k);
      novo[l][c] = r.linha[k];
    }
  }
  return { grid: novo, pontos, moveu };
}

/** true se ainda existe casa vazia ou vizinhas iguais. */
export function podeMover(grid: number[][]): boolean {
  for (let l = 0; l < grid.length; l++)
    for (let c = 0; c < grid[l].length; c++) {
      const v = grid[l][c];
      if (v === 0) return true;
      if (c + 1 < grid[l].length && grid[l][c + 1] === v) return true;
      if (l + 1 < grid.length && grid[l + 1][c] === v) return true;
    }
  return false;
}

/* ------------------------------ variações ------------------------------ */

type NomeVariacao = "Clássico" | "Mini 3x3" | "Gigante 6x6" | "Caos";
type Config = { tamanho: number; chanceQuatro: number; meta: number; pecasPorJogada: number };

const VARIACOES: Record<NomeVariacao, Config> = {
  Clássico: { tamanho: 4, chanceQuatro: 0.1, meta: 2048, pecasPorJogada: 1 },
  "Mini 3x3": { tamanho: 3, chanceQuatro: 0.1, meta: 512, pecasPorJogada: 1 },
  "Gigante 6x6": { tamanho: 6, chanceQuatro: 0.1, meta: 4096, pecasPorJogada: 1 },
  Caos: { tamanho: 4, chanceQuatro: 0.5, meta: 2048, pecasPorJogada: 2 },
};

/* --------------------------------- tema --------------------------------- */

export type Tema = "claro" | "escuro";
// Paleta do tema: vira CSS vars na raiz (classes) e é lida pelo canvas.
const TEMAS: Record<Tema, Record<string, string>> = {
  claro: {
    "--fc-bg": "#F7F8FB", "--fc-surface": "#FFFFFF", "--fc-surface-2": "#F1F4F9",
    "--fc-border": "#E3E8F0", "--fc-border-strong": "#CBD3E1",
    "--fc-text": "#0B1220", "--fc-muted": "#4B5565", "--fc-subtle": "#8A94A6",
    "--fc-pos": "#059669", "--fc-neg": "#E11D48", "--fc-warn": "#D97706",
    "--fc-shadow": "0 1px 2px rgba(16,24,40,.06), 0 12px 32px -16px rgba(16,24,40,.18)",
  },
  escuro: {
    "--fc-bg": "#0B0F17", "--fc-surface": "rgba(255,255,255,0.03)", "--fc-surface-2": "rgba(255,255,255,0.06)",
    "--fc-border": "rgba(255,255,255,0.10)", "--fc-border-strong": "rgba(255,255,255,0.25)",
    "--fc-text": "#FFFFFF", "--fc-muted": "rgba(255,255,255,0.60)", "--fc-subtle": "rgba(255,255,255,0.40)",
    "--fc-pos": "#34D399", "--fc-neg": "#FB7185", "--fc-warn": "#FBBF24",
    "--fc-shadow": "0 24px 48px -24px rgba(0,0,0,.6)",
  },
};

function BotaoTema({ tema, onClick }: { tema: Tema; onClick: () => void }) {
  const escuro = tema === "escuro";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={escuro ? "Ativar modo claro" : "Ativar modo escuro"}
      title={escuro ? "Modo claro" : "Modo escuro"}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--fc-border)] bg-[var(--fc-surface)] text-[var(--fc-muted)] transition-colors hover:border-[var(--fc-border-strong)] hover:text-[var(--fc-text)]"
    >
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        {escuro ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </>
        ) : (
          <path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z" />
        )}
      </svg>
    </button>
  );
}

type Props = {
  tema?: Tema;
  onTemaChange?: (tema: Tema) => void;
  accent?: string;
  variacao?: NomeVariacao;
  tamanho?: number;
  chanceQuatro?: number;
  meta?: number;
  pecasPorJogada?: number;
};

type Status = "jogando" | "venceu" | "fim";

type Peca = { id: number; v: number; l: number; c: number; pop: number; nova: boolean; fundiu: boolean; morta: boolean };

type Snapshot = { pecas: Peca[]; pontos: number };

const CHAVE = "flowcore-2048-recorde";
const LINK = "https://flowcoresolucoes.com.br/codigos";
const DURACAO = 120;

function lerRecorde(): number {
  try {
    return Number(localStorage.getItem(CHAVE)) || 0;
  } catch {
    return 0;
  }
}

function salvarRecorde(v: number) {
  try {
    localStorage.setItem(CHAVE, String(v));
  } catch {
    /* localStorage indisponível (modo privado, iframe sandbox) */
  }
}

function limitarTamanho(n: number) {
  return Math.max(3, Math.min(6, Math.round(n) || 4));
}

function gradeDe(pecas: Peca[], n: number): number[][] {
  const g = Array.from({ length: n }, () => Array<number>(n).fill(0));
  for (const p of pecas) if (!p.morta) g[p.l][p.c] = p.v;
  return g;
}

/* -------------------------------- cores -------------------------------- */

function hexParaRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((x) => x + x).join("");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function misturar(a: string, b: string, t: number): string {
  const ra = hexParaRgb(a) ?? [0, 87, 255];
  const rb = hexParaRgb(b) ?? [0, 87, 255];
  const k = Math.max(0, Math.min(1, t));
  const c = ra.map((x, i) => Math.round(x + (rb[i] - x) * k));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

function estiloPeca(v: number, accent: string, tema: Tema = "escuro"): CSSProperties {
  const ac = hexParaRgb(accent) ? accent : "#0057FF";
  const exp = Math.log2(v);
  if (tema === "claro") {
    // Tema claro: rampa do cinza-azulado bem suave até o accent, depois degradês vivos.
    if (exp <= 7) {
      const t = 0.08 + ((exp - 1) / 6) * 0.92;
      return {
        background: `linear-gradient(160deg, ${misturar("#F4F6FB", ac, t * 0.92)}, ${misturar("#E4E9F2", ac, t)})`,
        color: t < 0.5 ? "#0B1220" : "#fff",
        boxShadow:
          exp >= 5
            ? `0 1px 2px rgba(16,24,40,0.08), 0 ${(exp - 3) * 3}px ${(exp - 3) * 6}px -8px ${misturar("#000000", ac, 0.9)}`
            : "0 1px 2px rgba(16,24,40,0.10), inset 0 1px 0 rgba(255,255,255,0.8)",
      };
    }
    const t = Math.min(1, (exp - 7) / 5);
    const cor = misturar(ac, "#EC4899", t);
    const cor2 = misturar(ac, "#F59E0B", t);
    return {
      background: `linear-gradient(160deg, ${cor2}, ${cor})`,
      color: "#fff",
      boxShadow: `0 10px ${20 + t * 12}px -10px ${cor}, inset 0 1px 0 rgba(255,255,255,0.35)`,
    };
  }
  if (exp <= 7) {
    const t = 0.06 + ((exp - 1) / 6) * 0.94;
    return {
      background: `linear-gradient(160deg, ${misturar("#283247", ac, t)}, ${misturar("#161D2B", ac, t * 0.85)})`,
      color: exp <= 2 ? "rgba(255,255,255,0.78)" : "#fff",
      boxShadow: exp >= 5 ? `0 0 ${(exp - 4) * 6}px -2px ${misturar("#000000", ac, 0.9)}` : "inset 0 1px 0 rgba(255,255,255,0.06)",
    };
  }
  const t = Math.min(1, (exp - 7) / 5);
  const cor = misturar(ac, "#FF4D8D", t);
  const cor2 = misturar(ac, "#FFB347", t);
  return {
    background: `linear-gradient(160deg, ${cor2}, ${cor})`,
    color: "#fff",
    boxShadow: `0 0 ${18 + t * 18}px -2px ${cor}, inset 0 1px 0 rgba(255,255,255,0.35)`,
  };
}

/* ------------------------------ componente ----------------------------- */

/* ------------------------------ como jogar ------------------------------ */

// Teclas mostradas na tela inicial e na pausa ("ou" vira separador).
const TECLAS: [string[], string][] = [
  [["↑", "↓", "←", "→", "ou", "WASD"], "deslizar as peças"],
  [["U"], "desfazer a jogada"],
  [["N"], "novo jogo"],
];
// Versão de toque, mostrada no celular (abaixo do jogo, onde sempre cabe).
const TOQUE = [
  "Deslize o dedo sobre o tabuleiro",
  "Desfazer e Novo jogo ficam acima do tabuleiro",
];
const RESUMO_TECLADO = "Setas ou WASD deslizam · U desfaz · N novo jogo";
const RESUMO_TOQUE = "Deslize o dedo no tabuleiro";

function ComoJogar({ className = "" }: { className?: string }) {
  return (
    <div className={`w-fit max-w-full text-xs text-[var(--fc-muted)] ${className}`}>
      <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--fc-subtle)]">Como jogar</p>
      <div className="hidden grid-cols-[auto_auto] items-center gap-x-3 gap-y-1.5 sm:grid">
        {TECLAS.map(([teclas, acao]) => (
          <div key={acao} className="contents">
            <span className="flex flex-wrap items-center justify-end gap-1">
              {teclas.map((t, i) =>
                t === "ou" ? (
                  <span key={i} className="text-[10px] text-[var(--fc-subtle)]">
                    ou
                  </span>
                ) : (
                  <kbd key={i} className="rounded-md border border-[var(--fc-border)] bg-[var(--fc-surface-2)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--fc-text)]">
                    {t}
                  </kbd>
                ),
              )}
            </span>
            <span className="text-left">{acao}</span>
          </div>
        ))}
      </div>
      <ul className="space-y-1 text-center sm:hidden">
        {TOQUE.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </div>
  );
}

export default function Jogo2048({
  accent = "#0057FF",
  tema = "claro",
  onTemaChange,
  variacao = "Clássico",
  tamanho,
  chanceQuatro,
  meta,
  pecasPorJogada,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [temaAtual, setTemaAtual] = useState<Tema>(tema);
  useEffect(() => setTemaAtual(tema), [tema]);
  const temaRef = useRef<Tema>(tema);
  temaRef.current = temaAtual;
  const alternarTema = () => {
    const novo: Tema = temaAtual === "claro" ? "escuro" : "claro";
    setTemaAtual(novo);
    onTemaChange?.(novo);
    rootRef.current?.focus();
  };
  const areaRef = useRef<HTMLDivElement>(null);

  const inicial: Config = {
    ...VARIACOES[variacao],
    ...(tamanho !== undefined && { tamanho: limitarTamanho(tamanho) }),
    ...(chanceQuatro !== undefined && { chanceQuatro }),
    ...(meta !== undefined && { meta }),
    ...(pecasPorJogada !== undefined && { pecasPorJogada }),
  };

  const idRef = useRef(1);
  const cfgRef = useRef<Config>(inicial);

  const nascer = useCallback((pecas: Peca[], n: number, qtd: number, chance4: number): Peca[] => {
    const lista = pecas.slice();
    for (let k = 0; k < qtd; k++) {
      const g = gradeDe(lista, n);
      const livres: [number, number][] = [];
      for (let l = 0; l < n; l++) for (let c = 0; c < n; c++) if (!g[l][c]) livres.push([l, c]);
      if (!livres.length) break;
      const [l, c] = livres[Math.floor(Math.random() * livres.length)];
      lista.push({ id: idRef.current++, v: Math.random() < chance4 ? 4 : 2, l, c, pop: 0, nova: true, fundiu: false, morta: false });
    }
    return lista;
  }, []);

  const tabuleiroNovo = useCallback(
    (c: Config) => nascer([], c.tamanho, 2, Math.min(c.chanceQuatro, 0.25)),
    [nascer],
  );

  const [nomeVar, setNomeVar] = useState<NomeVariacao>(variacao);
  const [cfg, setCfg] = useState<Config>(inicial);
  const [pecas, setPecas] = useState<Peca[]>(() => tabuleiroNovo(inicial));
  const [pontos, setPontos] = useState(0);
  const [status, setStatus] = useState<Status>("jogando");
  const [recorde, setRecorde] = useState(0);
  const [largura, setLargura] = useState(420);
  const [desfazer, setDesfazer] = useState<Snapshot | null>(null);

  const pecasRef = useRef(pecas);
  const pontosRef = useRef(0);
  const statusRef = useRef<Status>("jogando");
  const venceuRef = useRef(false);
  const limpezaRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const swipeRef = useRef<{ x: number; y: number } | null>(null);

  cfgRef.current = cfg;
  pecasRef.current = pecas;

  useEffect(() => setRecorde(lerRecorde()), []);
  useEffect(
    () => () => {
      if (limpezaRef.current) clearTimeout(limpezaRef.current);
    },
    [],
  );

  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setLargura(w);
    });
    ro.observe(el);
    if (el.clientWidth) setLargura(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const mudarStatus = useCallback((s: Status) => {
    statusRef.current = s;
    setStatus(s);
  }, []);

  const registrarRecorde = useCallback((p: number) => {
    setRecorde((r) => {
      if (p > r) {
        salvarRecorde(p);
        return p;
      }
      return r;
    });
  }, []);

  const reiniciar = useCallback(
    (c: Config = cfgRef.current) => {
      if (limpezaRef.current) clearTimeout(limpezaRef.current);
      const novas = tabuleiroNovo(c);
      pecasRef.current = novas;
      setPecas(novas);
      pontosRef.current = 0;
      setPontos(0);
      setDesfazer(null);
      venceuRef.current = false;
      mudarStatus("jogando");
      rootRef.current?.focus();
    },
    [tabuleiroNovo, mudarStatus],
  );

  const jogar = useCallback(
    (dir: Dir2048) => {
      if (statusRef.current !== "jogando") return;
      const c = cfgRef.current;
      const n = c.tamanho;
      const vivas = pecasRef.current.filter((p) => !p.morta);
      const grid = gradeDe(vivas, n);
      if (!mover(grid, dir).moveu) return;

      const snapshot: Snapshot = { pecas: vivas.map((p) => ({ ...p, nova: false, fundiu: false })), pontos: pontosRef.current };
      const mapa: (Peca | null)[][] = Array.from({ length: n }, () => Array<Peca | null>(n).fill(null));
      for (const p of vivas) mapa[p.l][p.c] = p;

      const resultado: Peca[] = [];
      let ganho = 0;
      for (let i = 0; i < n; i++) {
        let alvo = 0;
        let anterior: Peca | null = null;
        for (let k = 0; k < n; k++) {
          const [l, col] = casaDaFila(n, dir, i, k);
          const p = mapa[l][col];
          if (!p) continue;
          if (anterior && anterior.v === p.v && !anterior.fundiu) {
            const v = anterior.v * 2;
            ganho += v;
            anterior.v = v;
            anterior.pop += 1;
            anterior.fundiu = true;
            resultado.push({ ...p, l: anterior.l, c: anterior.c, nova: false, fundiu: false, morta: true });
          } else {
            const [nl, nc] = casaDaFila(n, dir, i, alvo++);
            const np: Peca = { ...p, l: nl, c: nc, nova: false, fundiu: false, morta: false };
            resultado.push(np);
            anterior = np;
          }
        }
      }
      const comNovas = nascer(resultado, n, Math.max(1, Math.round(c.pecasPorJogada)), c.chanceQuatro);

      pontosRef.current += ganho;
      setPontos(pontosRef.current);
      if (ganho) registrarRecorde(pontosRef.current);
      setDesfazer(snapshot);
      pecasRef.current = comNovas;
      setPecas(comNovas);

      if (limpezaRef.current) clearTimeout(limpezaRef.current);
      limpezaRef.current = setTimeout(() => {
        setPecas((atual) => {
          const sem = atual.filter((p) => !p.morta);
          pecasRef.current = sem;
          return sem;
        });
      }, DURACAO + 40);

      const vivasDepois = comNovas.filter((p) => !p.morta);
      if (!venceuRef.current && vivasDepois.some((p) => p.v >= c.meta)) {
        venceuRef.current = true;
        mudarStatus("venceu");
      } else if (!podeMover(gradeDe(vivasDepois, n))) {
        registrarRecorde(pontosRef.current);
        mudarStatus("fim");
      }
    },
    [nascer, registrarRecorde, mudarStatus],
  );

  const voltar = useCallback(() => {
    if (!desfazer) return;
    if (limpezaRef.current) clearTimeout(limpezaRef.current);
    const restauradas = desfazer.pecas.map((p) => ({ ...p, nova: false, fundiu: false }));
    pecasRef.current = restauradas;
    setPecas(restauradas);
    pontosRef.current = desfazer.pontos;
    setPontos(desfazer.pontos);
    setDesfazer(null);
    if (statusRef.current === "fim") mudarStatus("jogando");
    rootRef.current?.focus();
  }, [desfazer, mudarStatus]);

  const trocarVariacao = (nome: NomeVariacao) => {
    setNomeVar(nome);
    const c = VARIACOES[nome];
    setCfg(c);
    cfgRef.current = c;
    reiniciar(c);
  };

  const onKeyDown = (ev: KeyboardEvent<HTMLDivElement>) => {
    const k = ev.key;
    if (k.startsWith("Arrow") || k === " ") ev.preventDefault();
    const mapa: Record<string, Dir2048> = {
      ArrowUp: "cima", w: "cima", W: "cima",
      ArrowDown: "baixo", s: "baixo", S: "baixo",
      ArrowLeft: "esq", a: "esq", A: "esq",
      ArrowRight: "dir", d: "dir", D: "dir",
    };
    const d = mapa[k];
    if (d) {
      jogar(d);
      return;
    }
    if (k === "u" || k === "U" || k === "Backspace") {
      voltar();
      return;
    }
    if (k === "n" || k === "N") {
      reiniciar();
      return;
    }
    if ((k === " " || k === "Enter") && statusRef.current !== "jogando") {
      if (statusRef.current === "venceu") mudarStatus("jogando");
      else reiniciar();
    }
  };

  const onSwipeStart = (ev: PointerEvent<HTMLDivElement>) => {
    swipeRef.current = { x: ev.clientX, y: ev.clientY };
  };
  const onSwipeEnd = (ev: PointerEvent<HTMLDivElement>) => {
    const o = swipeRef.current;
    swipeRef.current = null;
    if (!o) return;
    const dx = ev.clientX - o.x;
    const dy = ev.clientY - o.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    rootRef.current?.focus();
    jogar(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "dir" : "esq") : dy > 0 ? "baixo" : "cima");
  };

  const n = cfg.tamanho;
  const lado = Math.max(240, Math.min(largura, 460));
  const gap = n >= 6 ? 6 : 10;
  const celula = (lado - gap * (n + 1)) / n;
  const maior = pecas.reduce((m, p) => (p.morta ? m : Math.max(m, p.v)), 0);
  const fonte = (v: number) => {
    const dig = String(v).length;
    const base = celula * (dig <= 2 ? 0.42 : dig === 3 ? 0.34 : dig === 4 ? 0.27 : 0.22);
    return Math.max(11, base);
  };

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      style={{ ...TEMAS[temaAtual], "--accent": accent } as CSSProperties}
      className="relative mx-auto w-full max-w-5xl select-none overflow-hidden rounded-3xl border border-[var(--fc-border)] bg-[var(--fc-bg)] p-3 shadow-[var(--fc-shadow)] text-[var(--fc-text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] sm:p-5"
    >
      <style>{`
        @keyframes fc2048-nasce { 0% { transform: scale(0.2); opacity: 0 } 100% { transform: scale(1); opacity: 1 } }
        @keyframes fc2048-funde { 0% { transform: scale(1) } 45% { transform: scale(1.16) } 100% { transform: scale(1) } }
      `}</style>

      {/* HUD */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent)] shadow-[0_0_12px_var(--accent)]" />
          <span className="text-sm font-semibold tracking-tight">2048</span>
          <BotaoTema tema={temaAtual} onClick={alternarTema} />
        </div>
        <div className="flex gap-4 text-xs text-[var(--fc-muted)]">
          <span>
            Pontos <b className="ml-1 font-semibold tabular-nums text-[var(--fc-text)]">{pontos}</b>
          </span>
          <span>
            Recorde <b className="ml-1 font-semibold tabular-nums text-[var(--fc-text)]">{recorde}</b>
          </span>
          <span>
            Maior <b className="ml-1 font-semibold tabular-nums text-[var(--fc-text)]">{maior}</b>
          </span>
        </div>
      </div>

      {/* Variações */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[11px] uppercase tracking-wider text-[var(--fc-subtle)]">Variações</span>
        {(Object.keys(VARIACOES) as NomeVariacao[]).map((nome) => (
          <button
            key={nome}
            type="button"
            onClick={() => trocarVariacao(nome)}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              nomeVar === nome
                ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                : "border-[var(--fc-border)] bg-[var(--fc-surface)] text-[var(--fc-muted)] hover:border-[var(--fc-border-strong)] hover:text-[var(--fc-text)]"
            }`}
          >
            {nome}
          </button>
        ))}
        <div className="ml-auto flex gap-1.5">
          <button
            type="button"
            onClick={voltar}
            disabled={!desfazer}
            className="flex items-center gap-1.5 rounded-full border border-[var(--fc-border)] bg-[var(--fc-surface)] px-3 py-1 text-xs text-[var(--fc-muted)] transition-colors hover:border-[var(--fc-border-strong)] hover:text-[var(--fc-text)] disabled:opacity-30"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
              <path d="M9 14L4 9l5-5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 9h10a6 6 0 010 12h-3" strokeLinecap="round" />
            </svg>
            Desfazer
          </button>
          <button
            type="button"
            onClick={() => reiniciar()}
            className="rounded-full border border-[var(--fc-border)] bg-[var(--fc-surface)] px-3 py-1 text-xs text-[var(--fc-muted)] transition-colors hover:border-[var(--fc-border-strong)] hover:text-[var(--fc-text)]"
          >
            Novo jogo
          </button>
        </div>
      </div>

      {/* Tabuleiro */}
      <div ref={areaRef} className="flex w-full justify-center">
        <div
          className="relative touch-none rounded-2xl"
          style={{
            width: lado,
            height: lado,
            background: temaAtual === "claro" ? "#E3E8F1" : "#121826",
            boxShadow: temaAtual === "claro" ? "inset 0 0 0 1px rgba(15,23,42,0.06)" : "inset 0 0 0 1px rgba(255,255,255,0.06)",
          }}
          onPointerDown={onSwipeStart}
          onPointerUp={onSwipeEnd}
          onPointerCancel={() => (swipeRef.current = null)}
        >
          {Array.from({ length: n * n }, (_, i) => (
            <div
              key={`f${i}`}
              className="absolute rounded-xl bg-[var(--fc-surface)]"
              style={{
                width: celula,
                height: celula,
                left: gap + (i % n) * (celula + gap),
                top: gap + Math.floor(i / n) * (celula + gap),
              }}
            />
          ))}
          {pecas.map((p) => (
            <div
              key={p.id}
              className="absolute left-0 top-0"
              style={{
                width: celula,
                height: celula,
                transform: `translate(${gap + p.c * (celula + gap)}px, ${gap + p.l * (celula + gap)}px)`,
                transition: `transform ${DURACAO}ms ease-out`,
                zIndex: p.morta ? 1 : 2,
              }}
            >
              <div
                key={`${p.id}-${p.pop}`}
                className="flex h-full w-full items-center justify-center rounded-xl font-bold tabular-nums tracking-tight"
                style={{
                  ...estiloPeca(p.v, accent, temaAtual),
                  fontSize: fonte(p.v),
                  animation: p.nova
                    ? `fc2048-nasce 160ms ease-out ${DURACAO - 30}ms both`
                    : p.fundiu && !p.morta
                      ? `fc2048-funde 180ms ease-out ${DURACAO - 30}ms both`
                      : undefined,
                }}
              >
                {p.v}
              </div>
            </div>
          ))}

          {status !== "jogando" && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-[color-mix(in_srgb,var(--fc-bg)_80%,transparent)] text-center backdrop-blur-[2px]">
              {status === "venceu" ? (
                <>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--fc-subtle)]">Você chegou lá</p>
                  <p className="text-4xl font-semibold tabular-nums">{cfg.meta}</p>
                  <button
                    type="button"
                    onClick={() => {
                      mudarStatus("jogando");
                      rootRef.current?.focus();
                    }}
                    className="rounded-full bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_8px_32px_-8px_var(--accent)] transition hover:brightness-110"
                  >
                    Continuar jogando
                  </button>
                  <button type="button" onClick={() => reiniciar()} className="text-xs text-[var(--fc-muted)] hover:text-[var(--fc-text)]">
                    Jogar de novo
                  </button>
                </>
              ) : (
                <>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--fc-subtle)]">Fim de jogo</p>
                  <p className="text-4xl font-semibold tabular-nums">{pontos}</p>
                  <p className="text-xs text-[var(--fc-muted)]">
                    Recorde <span className="tabular-nums text-[var(--fc-text)]">{recorde}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => reiniciar()}
                    className="rounded-full bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_8px_32px_-8px_var(--accent)] transition hover:brightness-110"
                  >
                    Jogar de novo
                  </button>
                  {desfazer && (
                    <button type="button" onClick={voltar} className="text-xs text-[var(--fc-muted)] hover:text-[var(--fc-text)]">
                      Desfazer última jogada
                    </button>
                  )}
                </>
              )}
              <p className="text-[11px] text-[var(--fc-subtle)]">Clique ou aperte Espaço</p>
              <a href={LINK} target="_blank" rel="noopener" className="text-[10px] text-[var(--fc-subtle)] hover:text-[var(--fc-muted)]">
                Criado por FlowCore Soluções LTDA
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Como jogar: aparece até a primeira jogada */}
      {!desfazer && pontos === 0 && <ComoJogar className="mx-auto mt-4 rounded-2xl border border-[var(--fc-border)] bg-[var(--fc-surface)] px-4 py-3" />}

      {/* Rodapé com assinatura */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-[var(--fc-border)] pt-3 text-center sm:justify-between sm:text-left">
        <span className="hidden text-[11px] text-[var(--fc-muted)] sm:inline">{RESUMO_TECLADO}</span>
        <span className="text-[11px] text-[var(--fc-muted)] sm:hidden">{RESUMO_TOQUE}</span>
        <a href={LINK} target="_blank" rel="noopener" className="text-[11px] text-[var(--fc-subtle)] transition-colors hover:text-[var(--fc-muted)]">
          Criado por FlowCore Soluções LTDA
        </a>
      </div>
    </div>
  );
}
