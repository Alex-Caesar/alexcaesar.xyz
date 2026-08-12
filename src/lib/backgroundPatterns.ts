// Generators for the ambient background texture (see BackgroundTexture.astro) — split out into
// its own module so the same pattern functions can be driven by the live page (sized to the
// actual viewport) and by the pattern-candidates review page (sized to a small preview tile)
// without duplicating any generation logic between the two.
//
// Every generator returns a flat SVG path `d` string plus the `width`/`height` of the area it
// was drawn to fill — the caller is responsible for sizing an SVG <pattern> tile to exactly
// that, so only one copy of the generated shape is ever visible (never a small tile repeated
// many times).

export type PatternResult = { d: string; width: number; height: number };
export type PatternFn = (width: number, height: number) => PatternResult;
export type Style = {
  id: string;
  name: string;
  description: string;
  fn: PatternFn;
  strokeWidth?: number;
  isNew?: boolean;
};

// Real entropy (the OS CSPRNG via Web Crypto), not Math.random's plain PRNG. Used two ways
// below: directly, for one-off choices (which style, which density); and as a seed for a fast
// local PRNG stream (mulberry32) where a generator needs many sequential random decisions, like
// a maze carve — reseeding straight from crypto.getRandomValues on every one of those would work
// too, just slower for no real entropy benefit.
export function randomByte() {
  return crypto.getRandomValues(new Uint8Array(1))[0];
}

export function seededRand() {
  let a = crypto.getRandomValues(new Uint32Array(1))[0];
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A cell size + column/row count that together cover the given area with square cells — `cols`
// is picked from a few options (density variety), `rows` is derived to reach at least the target
// height, rounding up so the grid always covers the full area with nothing left over for the
// pattern to repeat into.
function gridFor(width: number, height: number, colsOptions: number[] = [14, 18, 22]) {
  const cols = colsOptions[randomByte() % colsOptions.length];
  const CELL = width / cols;
  const rows = Math.max(1, Math.ceil(height / CELL));
  return { CELL, cols, rows, width: cols * CELL, height: rows * CELL };
}

// Truchet curves — each cell holds one of two quarter-circle-arc orientations, radius jittered a
// little per cell. Truchet tiles always meet seamlessly edge-to-edge regardless of which
// orientation (or radius) lands next to which — the arc's endpoints stay pinned to the cell's
// edge midpoints no matter what radius draws the curve between them — which is what gives this
// the classic flowing circuit/labyrinth look.
export function truchetCurves(width: number, height: number): PatternResult {
  const rand = seededRand();
  const { CELL, cols, rows, width: w, height: h } = gridFor(width, height);
  const baseR = CELL / 2;
  let d = '';
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * CELL;
      const y = row * CELL;
      const r = baseR * (0.82 + rand() * 0.36);
      d +=
        rand() < 0.5
          ? `M ${x + baseR} ${y} A ${r} ${r} 0 0 1 ${x} ${y + baseR} M ${x + baseR} ${y + CELL} A ${r} ${r} 0 0 1 ${x + CELL} ${y + baseR} `
          : `M ${x + baseR} ${y} A ${r} ${r} 0 0 0 ${x + CELL} ${y + baseR} M ${x} ${y + baseR} A ${r} ${r} 0 0 0 ${x + baseR} ${y + CELL} `;
    }
  }
  return { d, width: w, height: h };
}

// Generic maze carver: randomized depth-first search over an arbitrary graph (any grid topology
// — square, hex, triangular, whatever `neighborsOf` describes). Produces a genuine "perfect
// maze" — every cell reachable from every other by exactly one path — which is what makes
// everything built on this a real maze rather than a texture that merely looks like one.
function carveMaze(cellIds: string[], neighborsOf: (id: string) => string[], rand: () => number) {
  const visited = new Set<string>();
  const open = new Set<string>();
  function key(a: string, b: string) {
    return a < b ? a + '|' + b : b + '|' + a;
  }
  const start = cellIds[0];
  const stack = [start];
  visited.add(start);
  while (stack.length) {
    const current = stack[stack.length - 1];
    const options = neighborsOf(current).filter((n) => !visited.has(n));
    if (options.length === 0) {
      stack.pop();
      continue;
    }
    const next = options[Math.floor(rand() * options.length)];
    open.add(key(current, next));
    visited.add(next);
    stack.push(next);
  }
  return { open, key };
}

function squareNeighbors(cols: number, rows: number) {
  return function (id: string) {
    const [col, row] = id.split(',').map(Number);
    const list = [];
    if (row > 0) list.push(col + ',' + (row - 1));
    if (row < rows - 1) list.push(col + ',' + (row + 1));
    if (col > 0) list.push(col - 1 + ',' + row);
    if (col < cols - 1) list.push(col + 1 + ',' + row);
    return list;
  };
}

function squareCellIds(cols: number, rows: number) {
  const ids = [];
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) ids.push(col + ',' + row);
  return ids;
}

// Same square-grid maze algorithm and topology as the others — but every interior grid vertex is
// nudged to a random (fixed, non-boundary) position before the walls are drawn, so cells come
// out as irregular quadrilaterals instead of perfect squares. Shared corners between neighboring
// cells are the same precomputed point, so edges still meet exactly — nothing about the actual
// maze structure changes, only its rendered shape.
export function organicCellMaze(width: number, height: number): PatternResult {
  const rand = seededRand();
  const { CELL, cols, rows, width: w, height: h } = gridFor(width, height, [20, 26, 32]);
  const jitter = CELL * 0.3;
  const verts: [number, number][][] = [];
  for (let row = 0; row <= rows; row++) {
    const line: [number, number][] = [];
    for (let col = 0; col <= cols; col++) {
      const boundary = row === 0 || row === rows || col === 0 || col === cols;
      const jx = boundary ? 0 : (rand() - 0.5) * jitter;
      const jy = boundary ? 0 : (rand() - 0.5) * jitter;
      line.push([col * CELL + jx, row * CELL + jy]);
    }
    verts.push(line);
  }
  const cellIds = squareCellIds(cols, rows);
  const { open, key } = carveMaze(cellIds, squareNeighbors(cols, rows), rand);
  function edge(p1: [number, number], p2: [number, number]) {
    return `M ${p1[0].toFixed(1)} ${p1[1].toFixed(1)} L ${p2[0].toFixed(1)} ${p2[1].toFixed(1)} `;
  }
  let d = '';
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const id = col + ',' + row;
      const TL = verts[row][col];
      const TR = verts[row][col + 1];
      const BL = verts[row + 1][col];
      const BR = verts[row + 1][col + 1];
      if (row === 0 || !open.has(key(id, col + ',' + (row - 1)))) d += edge(TL, TR);
      if (col === 0 || !open.has(key(id, col - 1 + ',' + row))) d += edge(TL, BL);
      if (row === rows - 1) d += edge(BL, BR);
      if (col === cols - 1) d += edge(TR, BR);
    }
  }
  return { d, width: w, height: h };
}

// A real Voronoi diagram (random seed points, every region belongs to whichever seed is
// closest), rasterized at a fine grid across the area rather than computed as exact polygons.
// Deliberately not maze-carved — with only a couple dozen large regions, removing a spanning
// tree's worth of walls opened up big gaps and stopped reading as cells at all, so this shows
// the full partition, which is what actually looks good.
export function voronoiCells(width: number, height: number): PatternResult {
  const rand = seededRand();
  const SEED_OPTIONS = [20, 28, 35];
  const seedCount = SEED_OPTIONS[randomByte() % SEED_OPTIONS.length];
  const seeds = Array.from({ length: seedCount }, () => [rand() * width, rand() * height]);
  const cols = 130;
  const rows = Math.max(1, Math.round((cols * height) / width));
  const cellW = width / cols;
  const cellH = height / rows;
  const owner: number[][] = [];
  for (let ry = 0; ry < rows; ry++) {
    const row: number[] = [];
    const cy = (ry + 0.5) * cellH;
    for (let rx = 0; rx < cols; rx++) {
      const cx = (rx + 0.5) * cellW;
      let best = 0;
      let bestD = Infinity;
      for (let i = 0; i < seeds.length; i++) {
        const dx = seeds[i][0] - cx;
        const dy = seeds[i][1] - cy;
        const dd = dx * dx + dy * dy;
        if (dd < bestD) {
          bestD = dd;
          best = i;
        }
      }
      row.push(best);
    }
    owner.push(row);
  }

  let d = '';
  for (let ry = 0; ry < rows; ry++) {
    for (let rx = 0; rx < cols; rx++) {
      const here = owner[ry][rx];
      if (rx < cols - 1 && owner[ry][rx + 1] !== here) {
        const x = (rx + 1) * cellW;
        d += `M ${x.toFixed(1)} ${(ry * cellH).toFixed(1)} L ${x.toFixed(1)} ${((ry + 1) * cellH).toFixed(1)} `;
      }
      if (ry < rows - 1 && owner[ry + 1][rx] !== here) {
        const y = (ry + 1) * cellH;
        d += `M ${(rx * cellW).toFixed(1)} ${y.toFixed(1)} L ${((rx + 1) * cellW).toFixed(1)} ${y.toFixed(1)} `;
      }
    }
  }
  return { d, width, height };
}

// The other classic Truchet tile — predates the quarter-circle "Smith tiles" used by
// truchetCurves by centuries: each cell is just a single diagonal line, randomly one of two
// orientations. Sharp zigzag chevrons instead of flowing curves.
export function diagonalTruchet(width: number, height: number): PatternResult {
  const rand = seededRand();
  const { CELL, cols, rows, width: w, height: h } = gridFor(width, height, [16, 20, 24]);
  let d = '';
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * CELL;
      const y = row * CELL;
      d += rand() < 0.5 ? `M ${x} ${y} L ${x + CELL} ${y + CELL} ` : `M ${x + CELL} ${y} L ${x} ${y + CELL} `;
    }
  }
  return { d, width: w, height: h };
}

// Hexagonal maze — one of the three genuine "regular tessellations" (equilateral triangles,
// squares, hexagons meeting vertex-to-vertex) named in the tessellation-art reference this batch
// of patterns was pulled from. Same generic carveMaze() as the square-grid mazes above, just
// over flat-topped hex cells in axial coordinates instead of a square grid — see
// https://www.redblobgames.com/grids/hexagons/ for the coordinate math this follows.
export function hexGridMaze(width: number, height: number): PatternResult {
  const rand = seededRand();
  const colsOptions = [9, 11, 13];
  const approxCols = colsOptions[randomByte() % colsOptions.length];
  const s = width / (1.5 * approxCols + 0.5); // hex circumradius
  const margin = 1.15;

  const directions: [number, number][] = [
    [1, 0],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [0, -1],
    [1, -1],
  ];

  function center(q: number, r: number): [number, number] {
    return [s * 1.5 * q, s * Math.sqrt(3) * (r + q / 2)];
  }

  const qMax = Math.ceil((width * margin) / (1.5 * s)) + 1;
  const cells: { id: string; q: number; r: number; cx: number; cy: number }[] = [];
  const idSet = new Set<string>();
  for (let q = 0; q <= qMax; q++) {
    const rApprox = Math.sqrt(3) * s;
    const rMin = Math.floor(-q / 2) - 1;
    const rMax = Math.ceil((height * margin) / rApprox - q / 2) + 1;
    for (let r = rMin; r <= rMax; r++) {
      const [cx, cy] = center(q, r);
      if (cx < -s || cx > width * margin + s || cy < -s || cy > height * margin + s) continue;
      const id = q + ',' + r;
      idSet.add(id);
      cells.push({ id, q, r, cx, cy });
    }
  }

  function neighborsOf(id: string) {
    const [q, r] = id.split(',').map(Number);
    const out: string[] = [];
    for (const [dq, dr] of directions) {
      const nid = q + dq + ',' + (r + dr);
      if (idSet.has(nid)) out.push(nid);
    }
    return out;
  }

  const { open, key } = carveMaze(
    cells.map((c) => c.id),
    neighborsOf,
    rand
  );

  const drawnEdges = new Set<string>();
  let d = '';
  let maxX = width;
  let maxY = height;
  for (const cell of cells) {
    const corners: [number, number][] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 180) * (60 * i);
      const px = cell.cx + s * Math.cos(angle);
      const py = cell.cy + s * Math.sin(angle);
      corners.push([px, py]);
      if (px > maxX) maxX = px;
      if (py > maxY) maxY = py;
    }
    for (let i = 0; i < 6; i++) {
      const [dq, dr] = directions[i];
      const nid = cell.q + dq + ',' + (cell.r + dr);
      const hasNeighbor = idSet.has(nid);
      let draw = false;
      if (!hasNeighbor) {
        draw = true;
      } else {
        const k = key(cell.id, nid);
        if (!drawnEdges.has(k)) {
          drawnEdges.add(k);
          draw = !open.has(k);
        }
      }
      if (draw) {
        const a = corners[i];
        const b = corners[(i + 1) % 6];
        d += `M ${a[0].toFixed(1)} ${a[1].toFixed(1)} L ${b[0].toFixed(1)} ${b[1].toFixed(1)} `;
      }
    }
  }
  return { d, width: maxX, height: maxY };
}

// Triangular maze — the third of the three regular tessellations. Built on the standard
// triangular lattice: grid points P(i,j) = i*(s,0) + j*(s/2, h) form rhombi, each split by a
// fixed diagonal into two equilateral triangles (labeled A/B below). carveMaze() runs over those
// triangle cells directly, so the maze is real (perfect-maze walls), not just a triangulated
// texture.
export function triangleGridMaze(width: number, height: number): PatternResult {
  const rand = seededRand();
  const colsOptions = [12, 15, 18];
  const cols = colsOptions[randomByte() % colsOptions.length];
  const s = width / cols;
  const h = (s * Math.sqrt(3)) / 2;
  const rows = Math.ceil((height * 1.15) / h);
  const iPad = rows + 1;
  const iMin = -iPad;
  const iMax = cols + iPad;

  function point(i: number, j: number): [number, number] {
    return [i * s + (j * s) / 2, j * h];
  }

  type Cell = { id: string; i: number; j: number; type: 'A' | 'B' };
  const cells: Cell[] = [];
  for (let j = 0; j < rows; j++) {
    for (let i = iMin; i < iMax; i++) {
      cells.push({ id: `${i},${j},A`, i, j, type: 'A' });
      cells.push({ id: `${i},${j},B`, i, j, type: 'B' });
    }
  }
  const idSet = new Set(cells.map((c) => c.id));

  function neighborsOf(id: string) {
    const [iStr, jStr, type] = id.split(',');
    const i = Number(iStr);
    const j = Number(jStr);
    const candidates =
      type === 'A'
        ? [`${i},${j},B`, `${i},${j - 1},B`, `${i - 1},${j},B`]
        : [`${i},${j},A`, `${i},${j + 1},A`, `${i + 1},${j},A`];
    return candidates.filter((c) => idSet.has(c));
  }

  const { open, key } = carveMaze(
    cells.map((c) => c.id),
    neighborsOf,
    rand
  );

  function fmt(p: [number, number]) {
    return `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
  }

  const drawnEdges = new Set<string>();
  let d = '';
  for (const cell of cells) {
    const { i, j, type } = cell;
    const corners: [number, number][] =
      type === 'A' ? [point(i, j), point(i + 1, j), point(i, j + 1)] : [point(i + 1, j), point(i + 1, j + 1), point(i, j + 1)];
    const neighborIds =
      type === 'A' ? [`${i},${j},B`, `${i},${j - 1},B`, `${i - 1},${j},B`] : [`${i},${j},A`, `${i},${j + 1},A`, `${i + 1},${j},A`];
    for (let e = 0; e < 3; e++) {
      const nid = neighborIds[e];
      const hasNeighbor = idSet.has(nid);
      let draw = false;
      if (!hasNeighbor) {
        draw = true;
      } else {
        const k = key(cell.id, nid);
        if (!drawnEdges.has(k)) {
          drawnEdges.add(k);
          draw = !open.has(k);
        }
      }
      if (draw) {
        const a = corners[e];
        const b = corners[(e + 1) % 3];
        d += `M ${fmt(a)} L ${fmt(b)} `;
      }
    }
  }
  return { d, width, height };
}

// Penrose rhombus tiling (P3) via de Bruijn's "multigrid" dual method: five families of parallel
// lines at 72°-apart angles, each family in "general position" (small per-family offsets so no
// three lines ever cross at one point); every pairwise line intersection dualizes to one rhombus
// tile. This is the standard construction from de Bruijn's 1981 paper — not an approximation of
// a Penrose tiling, a genuine one, and it comes out aperiodic for free (no translation symmetry,
// per the tessellation-art reference this pattern set draws from) with no separate substitution/
// deflation step required. The two rhombus shapes (36° "thin" and 72° "thick") fall out
// automatically from how far apart the two intersecting line families are in the 5-family cycle.
export function penroseRhombusTiling(width: number, height: number): PatternResult {
  const rand = seededRand();
  const N = 5;
  const SCALE = 42 + rand() * 18;
  const angles = Array.from({ length: N }, (_, i) => (2 * Math.PI * i) / N);
  const dirs = angles.map((a) => [Math.cos(a), Math.sin(a)] as [number, number]);
  // Small generic offsets, randomized per generation for session-to-session variety — any
  // generic (non-degenerate) offset set gives a valid aperiodic rhombus tiling via this method,
  // it's only the symmetric all-zero case that gives the single "canonical" Penrose tiling.
  const gamma = angles.map(() => 0.15 + rand() * 0.15);

  const cx = width / 2;
  const cy = height / 2;
  const margin = SCALE * 2.2;
  const R = Math.ceil(Math.max(width, height) / SCALE / Math.sin(Math.PI / 5)) + 3;

  let d = '';
  for (let j = 0; j < N; j++) {
    for (let k = j + 1; k < N; k++) {
      const [c1, s1] = dirs[j];
      const [c2, s2] = dirs[k];
      const det = c1 * s2 - s1 * c2;
      for (let n = -R; n <= R; n++) {
        for (let m = -R; m <= R; m++) {
          const A = n + gamma[j];
          const B = m + gamma[k];
          const x = (A * s2 - B * s1) / det;
          const y = (B * c1 - A * c2) / det;
          const px = x * SCALE;
          const py = y * SCALE;
          if (px < -cx - margin || px > cx + margin || py < -cy - margin || py > cy + margin) continue;

          const kv = new Array(N);
          kv[j] = n;
          kv[k] = m;
          for (let i = 0; i < N; i++) {
            if (i === j || i === k) continue;
            const [ci, si] = dirs[i];
            kv[i] = Math.ceil(x * ci + y * si - gamma[i]);
          }

          const combos = [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
          ];
          const pts: [number, number][] = [];
          for (const [dj, dk] of combos) {
            let px2 = 0;
            let py2 = 0;
            for (let i = 0; i < N; i++) {
              const vi = i === j ? kv[j] + dj : i === k ? kv[k] + dk : kv[i];
              px2 += vi * dirs[i][0];
              py2 += vi * dirs[i][1];
            }
            pts.push([px2 * SCALE + cx, py2 * SCALE + cy]);
          }
          d += `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)} L ${pts[1][0].toFixed(1)} ${pts[1][1].toFixed(1)} L ${pts[2][0].toFixed(1)} ${pts[2][1].toFixed(1)} L ${pts[3][0].toFixed(1)} ${pts[3][1].toFixed(1)} Z `;
        }
      }
    }
  }
  return { d, width, height };
}

export const STYLES: Style[] = [
  { id: 'truchet-curves', name: 'Truchet Curves', description: 'Flowing quarter-circle Truchet tiles.', fn: truchetCurves },
  { id: 'organic-cell-maze', name: 'Organic-Cell Maze', description: 'Jittered square-grid maze.', fn: organicCellMaze },
  { id: 'voronoi-cells', name: 'Voronoi Cells', description: 'Randomly-seeded Voronoi partition.', fn: voronoiCells },
  { id: 'diagonal-truchet', name: 'Diagonal Truchet', description: 'Classic diagonal-line Truchet tiles.', fn: diagonalTruchet },
  {
    id: 'hex-grid-maze',
    name: 'Hexagonal Maze',
    description: 'Perfect maze carved over a hex grid — one of the three regular tessellations.',
    fn: hexGridMaze,
    isNew: true,
  },
  {
    id: 'triangle-grid-maze',
    name: 'Triangular Maze',
    description: 'Perfect maze carved over a triangular grid — another of the three regular tessellations.',
    fn: triangleGridMaze,
    isNew: true,
  },
  {
    id: 'penrose-rhombus',
    name: 'Penrose Rhombus Tiling',
    description: "A genuine aperiodic Penrose tiling via de Bruijn's multigrid method — never repeats.",
    fn: penroseRhombusTiling,
    isNew: true,
    strokeWidth: 1.1,
  },
];

export function generate(style: Style, width: number, height: number) {
  const { d, width: w, height: h } = style.fn(width, height);
  return { d, width: w, height: h, strokeWidth: style.strokeWidth ?? 1.75 };
}
