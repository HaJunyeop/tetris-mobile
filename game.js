const COLS = 10;
const ROWS = 20;
const BLOCK = 30;
const COLORS = [null, '#29c7ff', '#ffd23f', '#ae6cff', '#53dd8b', '#ff5468', '#4f77ff', '#ff963a'];
const SHAPES = [
  [[1, 1, 1, 1]],
  [[2, 2], [2, 2]],
  [[0, 3, 0], [3, 3, 3]],
  [[0, 4, 4], [4, 4, 0]],
  [[5, 5, 0], [0, 5, 5]],
  [[6, 0, 0], [6, 6, 6]],
  [[0, 0, 7], [7, 7, 7]],
];

const boardCanvas = document.querySelector('#board');
const ctx = boardCanvas.getContext('2d');
const nextCtx = document.querySelector('#next').getContext('2d');
const linesEl = document.querySelector('#lines');
const overlay = document.querySelector('#overlay');
const overlayTitle = document.querySelector('#overlayTitle');
const pauseButton = document.querySelector('#pauseButton');

let board, piece, nextPiece, lines, paused, over, lastTime, dropCounter, animationId;
let animating = false;
let clearingRows = [];
let clearProgress = 0;
let pieceVisible = true;
let gameToken = 0;

function emptyBoard() { return Array.from({ length: ROWS }, () => Array(COLS).fill(0)); }
function randomPiece() { return SHAPES[Math.floor(Math.random() * SHAPES.length)].map(row => [...row]); }
function makePiece(shape) { return { shape, x: Math.floor((COLS - shape[0].length) / 2), y: 0 }; }

function reset() {
  gameToken++;
  board = emptyBoard(); lines = 0; paused = false; over = false;
  animating = false; clearingRows = []; clearProgress = 0; pieceVisible = true;
  nextPiece = randomPiece(); spawn();
  linesEl.textContent = '0'; overlay.classList.add('hidden'); pauseButton.textContent = '일시정지';
  lastTime = performance.now(); dropCounter = 0;
  cancelAnimationFrame(animationId); animationId = requestAnimationFrame(update);
}

function spawn() {
  piece = makePiece(nextPiece); pieceVisible = true; nextPiece = randomPiece(); drawNext();
  if (collides(piece)) endGame();
}

function collides(test) {
  return test.shape.some((row, y) => row.some((value, x) => {
    if (!value) return false;
    const bx = test.x + x, by = test.y + y;
    return bx < 0 || bx >= COLS || by >= ROWS || (by >= 0 && board[by][bx]);
  }));
}

function merge() {
  piece.shape.forEach((row, y) => row.forEach((value, x) => {
    if (value && piece.y + y >= 0) board[piece.y + y][piece.x + x] = value;
  }));
}

function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function animateLineClear(rows, token) {
  clearingRows = rows;
  const startedAt = performance.now();
  const duration = 280;
  while (clearProgress < 1 && token === gameToken) {
    clearProgress = Math.min(1, (performance.now() - startedAt) / duration);
    draw();
    await new Promise(resolve => requestAnimationFrame(resolve));
  }
  if (token !== gameToken) return false;
  [...rows].sort((a, b) => b - a).forEach(y => board.splice(y, 1));
  rows.forEach(() => board.unshift(Array(COLS).fill(0)));
  lines += rows.length; linesEl.textContent = String(lines);
  clearingRows = []; clearProgress = 0;
  return true;
}

async function lockPiece() {
  if (animating || over) return;
  const token = gameToken;
  animating = true;
  merge(); pieceVisible = false;
  const fullRows = board.map((row, y) => row.every(Boolean) ? y : -1).filter(y => y >= 0);
  if (fullRows.length && !(await animateLineClear(fullRows, token))) return;
  if (token !== gameToken) return;
  spawn(); animating = false; dropCounter = 0; lastTime = performance.now(); draw();
}

function move(dx) {
  if (paused || over || animating) return;
  piece.x += dx; if (collides(piece)) piece.x -= dx; draw();
}

function down() {
  if (paused || over || animating) return;
  piece.y++;
  if (collides(piece)) { piece.y--; void lockPiece(); }
  dropCounter = 0; draw();
}

async function hardDrop() {
  if (paused || over || animating) return;
  const token = gameToken;
  let targetY = piece.y;
  while (!collides({ ...piece, y: targetY + 1 })) targetY++;
  animating = true;
  while (piece.y < targetY && token === gameToken) {
    piece.y++;
    draw();
    await delay(18);
  }
  if (token !== gameToken) return;
  animating = false;
  await lockPiece();
}

function rotate() {
  if (paused || over || animating) return;
  const old = piece.shape;
  const rotated = old[0].map((_, i) => old.map(row => row[i]).reverse());
  const oldX = piece.x; piece.shape = rotated;
  for (const nudge of [0, -1, 1, -2, 2]) { piece.x = oldX + nudge; if (!collides(piece)) { draw(); return; } }
  piece.shape = old; piece.x = oldX;
}

function endGame() {
  over = true; overlayTitle.textContent = '게임 끝';
  document.querySelector('#resumeButton').textContent = '다시 하기'; overlay.classList.remove('hidden');
}

function togglePause() {
  if (over || animating) return;
  paused = !paused; overlayTitle.textContent = '일시정지';
  document.querySelector('#resumeButton').textContent = '계속하기';
  overlay.classList.toggle('hidden', !paused); pauseButton.textContent = paused ? '계속하기' : '일시정지';
  if (!paused) { lastTime = performance.now(); animationId = requestAnimationFrame(update); }
}

function drawBlock(context, x, y, color, size = BLOCK) {
  context.fillStyle = color; context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  context.fillStyle = '#ffffff28'; context.fillRect(x * size + 3, y * size + 3, size - 6, 4);
}

function drawClearingBlock(x, y, color) {
  const shrink = clearProgress < .35 ? 1 : Math.max(0, 1 - (clearProgress - .35) / .65);
  const width = (BLOCK - 2) * shrink;
  const left = x * BLOCK + BLOCK / 2 - width / 2;
  ctx.globalAlpha = 1 - clearProgress * .25;
  ctx.fillStyle = color; ctx.fillRect(left, y * BLOCK + 1, width, BLOCK - 2);
  ctx.fillStyle = `rgba(255,255,255,${Math.sin(clearProgress * Math.PI) * .9})`;
  ctx.fillRect(left, y * BLOCK + 1, width, BLOCK - 2);
  ctx.globalAlpha = 1;
}

function draw() {
  ctx.clearRect(0, 0, boardCanvas.width, boardCanvas.height);
  ctx.strokeStyle = '#ffffff0a';
  for (let x = 1; x < COLS; x++) { ctx.beginPath(); ctx.moveTo(x * BLOCK, 0); ctx.lineTo(x * BLOCK, ROWS * BLOCK); ctx.stroke(); }
  board.forEach((row, y) => row.forEach((v, x) => {
    if (!v) return;
    if (clearingRows.includes(y)) drawClearingBlock(x, y, COLORS[v]);
    else drawBlock(ctx, x, y, COLORS[v]);
  }));
  if (pieceVisible) piece.shape.forEach((row, y) => row.forEach((v, x) => v && drawBlock(ctx, piece.x + x, piece.y + y, COLORS[v])));
}

function drawNext() {
  nextCtx.clearRect(0, 0, 96, 96); const size = 20;
  const ox = (96 / size - nextPiece[0].length) / 2; const oy = (96 / size - nextPiece.length) / 2;
  nextPiece.forEach((row, y) => row.forEach((v, x) => v && drawBlock(nextCtx, ox + x, oy + y, COLORS[v], size)));
}

function update(time) {
  if (paused || over) return;
  if (animating) { lastTime = time; draw(); animationId = requestAnimationFrame(update); return; }
  dropCounter += time - lastTime; lastTime = time;
  const interval = Math.max(180, 850 - Math.floor(lines / 10) * 80);
  if (dropCounter > interval) down(); else draw();
  animationId = requestAnimationFrame(update);
}

document.querySelectorAll('[data-action]').forEach(button => {
  const action = { left: () => move(-1), right: () => move(1), rotate, down: hardDrop, drop: hardDrop }[button.dataset.action];
  button.addEventListener('pointerdown', event => { event.preventDefault(); action(); });
});
pauseButton.addEventListener('click', togglePause);
document.querySelector('#newButton').addEventListener('click', reset);
document.querySelector('#resumeButton').addEventListener('click', () => over ? reset() : togglePause());
document.addEventListener('keydown', event => {
  const action = { ArrowLeft: () => move(-1), ArrowRight: () => move(1), ArrowDown: down, ArrowUp: rotate, ' ': hardDrop, p: togglePause }[event.key];
  if (action) { event.preventDefault(); action(); }
});

let touchStart = null;
boardCanvas.addEventListener('pointerdown', e => { touchStart = { x: e.clientX, y: e.clientY, time: performance.now() }; boardCanvas.setPointerCapture(e.pointerId); });
boardCanvas.addEventListener('pointerup', e => {
  if (!touchStart) return;
  const dx = e.clientX - touchStart.x, dy = e.clientY - touchStart.y;
  if (dy > 70 && Math.abs(dy) > Math.abs(dx)) hardDrop();
  else if (Math.abs(dx) > 28) move(dx > 0 ? 1 : -1);
  else rotate();
  touchStart = null;
});

document.addEventListener('visibilitychange', () => { if (document.hidden && !paused && !over) togglePause(); });
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js'));
reset();
