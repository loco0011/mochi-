// Shows the cat right on top of your code, saying the reminder in a comic speech bubble.
//
// VS Code has no API for floating pictures over the editor, so this borrows the trick the
// "Power Mode" extension uses: a text decoration whose CSS is stretched into an absolutely
// positioned image. The picture (cat + bubble) is an SVG passed as a data: URI.
// The picture ignores the mouse, so the buttons live in a small notification and in the status bar.
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

// The reminder texts are full of emoji; the comic bubble reads cleaner without them.
const EMOJI = /[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}️‍]/gu;
const plain = (s) => String(s ?? '').replace(EMOJI, '').replace(/\s+([.,!?])/g, '$1').replace(/\s{2,}/g, ' ').trim();
const xml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function wrap(text, maxChars) {
  const lines = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (line && (line + ' ' + word).length > maxChars) {
      lines.push(line);
      line = word;
    } else {
      line = line ? line + ' ' + word : word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function formatTime(seconds) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function niceDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s} sec`;
  return s ? `${m} min ${s} sec` : `${m} min`;
}

// ---------- Drawing ----------
const BUBBLE_W = 290;
const CAT_W = 172;
const CAT_H = 179;
const PAD = 16;
const FONT = `'Comic Sans MS', 'Comic Neue', 'Chalkboard SE', 'Marker Felt', cursive`;
const MAX_ON_SCREEN_MS = 60 * 1000;
const ACCENTS ={ eye: '#7c6cf0', water: '#0a85c9', stretch: '#0b936a', grumpy: '#dc3752' };

let art; // the shared cat drawing, read once
function loadArt(extensionPath) {
  if (!art) {
    const media = path.join(extensionPath, 'media');
    art = {
      css: fs.readFileSync(path.join(media, 'cat-art.css'), 'utf8'),
      svg: fs.readFileSync(path.join(media, 'cat-art.svg'), 'utf8'),
    };
  }
  return art;
}

// scene: { title, message, mood, kind, colors, prop, enter, timer: { text, progress, reached } }
function drawScene(scene) {
  const x0 = 3;
  const y0 = 3;
  const x1 = x0 + BUBBLE_W;
  const texts = [];
  let y = y0 + PAD;

  for (const line of wrap(plain(scene.title), 26)) {
    y += 18;
    texts.push(`<text x="${x0 + PAD}" y="${y}" class="t">${xml(line)}</text>`);
    y += 4;
  }
  const body = wrap(plain(scene.message), 34);
  if (body.length) y += 4;
  for (const line of body) {
    y += 15;
    texts.push(`<text x="${x0 + PAD}" y="${y}" class="b">${xml(line)}</text>`);
    y += 4;
  }

  if (scene.timer) {
    const t = scene.timer;
    y += 12;
    if (t.progress == null) {
      texts.push(`<text x="${x0 + PAD}" y="${y + 9}" class="n">${xml(t.text)}</text>`);
    } else {
      const barW = BUBBLE_W - 2 * PAD - 100;
      const fill = t.reached ? '#22a35a' : 'var(--accent)';
      texts.push(
        `<rect x="${x0 + PAD}" y="${y}" width="${barW}" height="9" rx="4.5" fill="#ececec" stroke="#141414" stroke-width="1.5"/>`,
        `<rect x="${x0 + PAD}" y="${y}" width="${Math.max(9, barW * t.progress)}" height="9" rx="4.5" fill="${fill}" stroke="#141414" stroke-width="1.5"/>`,
        `<text x="${x1 - PAD}" y="${y + 9}" class="n" text-anchor="end">${xml(t.text)}</text>`
      );
    }
    y += 9;
  }
  const y1 = y + PAD;

  // The cat sits just below the bubble's bottom-right corner; the bubble's tail points at its cheek.
  const catX = BUBBLE_W - 66;
  const catY = y1 - 18;
  const width = catX + CAT_W + 8;
  const height = catY + CAT_H + 4;
  const r = 18;
  const tip = `${catX + 48} ${catY + 70}`;
  const bubble = `M${x0 + r} ${y0} H${x1 - r} Q${x1} ${y0} ${x1} ${y0 + r} V${y1 - r} Q${x1} ${y1} ${x1 - r} ${y1} `
    + `H${x1 - 40} L${tip} L${x1 - 72} ${y1} H${x0 + r} Q${x0} ${y1} ${x0} ${y1 - r} V${y0 + r} Q${x0} ${y0} ${x0 + r} ${y0} Z`;

  const cat = art.svg
    .replace('<svg class="cat"', `<svg class="cat ${scene.mood || ''}" x="${catX}" y="${catY}" width="${CAT_W}" height="${CAT_H}"`)
    .replace(/(<text id="prop"[^>]*>)(<\/text>)/, `$1${xml(scene.prop || '')}$2`);

  const furVars = Object.entries(scene.colors || {}).map(([k, v]) => `--${k}: ${v};`).join(' ');
  const accent = ACCENTS[scene.mood === 'grumpy' ? 'grumpy' : scene.kind] || ACCENTS.eye;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<style>
${art.css}
:root { ${furVars} --accent: ${accent}; }
svg.cat { width: ${CAT_W}px; height: ${CAT_H}px; filter: none; animation: none; }
.t { font: 700 16px ${FONT}; fill: #141414; }
.b { font: 400 14px ${FONT}; fill: #2a2a2a; }
.n { font: 700 13px ${FONT}; fill: #141414; }
.enter-cat { animation: rise .7s cubic-bezier(.16, 1, .3, 1) both; }
.enter-bubble { transform-box: fill-box; transform-origin: 85% 100%; animation: pop .45s cubic-bezier(.34, 1.56, .64, 1) .45s both; }
.bob { animation: bob 3.6s ease-in-out infinite; }
@keyframes rise { from { opacity: 0; transform: translateY(40px); } }
@keyframes pop { from { opacity: 0; transform: scale(.2); } }
@keyframes bob { 50% { transform: translateY(-2px); } }
</style>
<g class="${scene.enter ? 'enter-bubble' : ''}">
  <path d="${bubble}" transform="translate(4 5)" fill="#141414" opacity=".85"/>
  <path d="${bubble}" fill="#ffffff" stroke="#141414" stroke-width="3" stroke-linejoin="round"/>
  ${texts.join('\n  ')}
</g>
<g class="${scene.enter ? 'enter-cat' : ''}"><g class="bob">
${cat}
</g></g>
</svg>`;
  return { svg, width, height };
}

// ---------- Placement ----------
// Where the cat sits, from the "mochi.overlayPosition" setting.
const POSITIONS = [
  { value: 'auto', label: '$(sparkle) Find an empty spot', description: 'right of the code, where it is shortest' },
  { value: 'top-right', label: '$(arrow-up) Top right' },
  { value: 'bottom-right', label: '$(arrow-down) Bottom right' },
  { value: 'top-left', label: '$(arrow-up) Top left', description: 'covers the start of your code' },
  { value: 'bottom-left', label: '$(arrow-down) Bottom left', description: 'covers the start of your code' },
];

function overlayPosition() {
  const value = vscode.workspace.getConfiguration('mochi').get('overlayPosition');
  return POSITIONS.some((p) => p.value === value) ? value : 'auto';
}

// Picks a stretch of visible lines tall enough for the picture. "auto" finds the emptiest one;
// the others stick to the top or bottom of the screen. The picture goes just right of the code
// there, or at the left edge for the "-left" positions.
function pickSpot(editor, heightPx, position) {
  const visible = editor.visibleRanges[0];
  if (!visible) return null;

  const cfg = vscode.workspace.getConfiguration('editor', editor.document.uri);
  const fontSize = cfg.get('fontSize') || 14;
  let lineHeight = cfg.get('lineHeight') || 0;
  if (lineHeight === 0) lineHeight = Math.round(fontSize * (process.platform === 'darwin' ? 1.5 : 1.35));
  else if (lineHeight < 8) lineHeight = Math.round(lineHeight * fontSize);

  const doc = editor.document;
  const tab = ' '.repeat(Number(editor.options.tabSize) || 4);
  const length = (i) => (i < doc.lineCount ? doc.lineAt(i).text.replace(/\t/g, tab).trimEnd().length : 0);

  const rows = Math.ceil(heightPx / lineHeight);
  const first = visible.start.line;
  const last = Math.min(visible.end.line, doc.lineCount - 1);
  const lastStart = Math.max(first, last - rows + 1);

  const widthAt = (start) => {
    let width = 0;
    for (let i = start; i < start + rows; i++) width = Math.max(width, length(i));
    return width;
  };

  let best;
  if (position.startsWith('top')) {
    best = { line: first, width: widthAt(first) };
  } else if (position.startsWith('bottom')) {
    best = { line: lastStart, width: widthAt(lastStart) };
  } else {
    best = { line: first, width: Infinity };
    for (let start = first; start <= lastStart; start++) {
      const width = widthAt(start);
      if (width <= best.width) best = { line: start, width }; // ties go to the lower spot
    }
  }
  const column = position.endsWith('left') ? 2 : Math.min(best.width + 6, 80);
  return { line: best.line, column };
}

// ---------- One reminder on screen ----------
let current = null;

// Resolves like showCatPanel: { choice: 'done', seconds }, { choice: 'snooze' } or {} if dismissed.
// Returns null when there is no code editor on screen to sit on, so the caller can fall back.
function showOverlay(extensionPath, data) {
  // The focused editor, or else any visible code editor (e.g. while the terminal has focus).
  const editor = vscode.window.activeTextEditor || vscode.window.visibleTextEditors[0];
  if (!editor) return null;
  loadArt(extensionPath);
  return new Promise((resolve) => {
    current = new Overlay(data, editor, resolve);
    current.start();
  });
}

// The status bar button while the cat is on screen.
function overlayMenu() {
  if (current) current.menu();
}

// Asks where the cat should sit and remembers it in Settings. Resolves true if a spot was picked.
async function chooseOverlayPosition(catName) {
  const now = overlayPosition();
  const items = POSITIONS.map((p) => ({ ...p, detail: p.value === now ? 'current spot' : undefined }));
  const picked = await vscode.window.showQuickPick(items, { placeHolder: `Where should ${catName} sit?` });
  if (!picked) return false;
  await vscode.workspace.getConfiguration('mochi').update('overlayPosition', picked.value, vscode.ConfigurationTarget.Global);
  return true;
}

// Takes the cat off the screen right away (used when the extension shuts down or updates).
function hideOverlay() {
  if (current) current.finish({});
}

class Overlay {
  constructor(data, editor, resolve) {
    this.data = data;
    this.editor = editor;
    this.resolve = resolve;
    this.phase = 'reminder'; // then 'break', then 'done'
    this.seconds = 0;
    this.scene = { title: data.greeting, message: data.message, mood: data.mood };
    this.decoration = null;
    this.timer = null;
    this.repaintTimer = null;
  }

  start() {
    this.status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 1000);
    this.status.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    this.status.command = 'mochi.overlayActions';
    this.status.tooltip = `${this.data.catName} wants your attention. Click for options.`;
    this.status.show();

    this.listeners = [
      vscode.window.onDidChangeTextEditorVisibleRanges((e) => {
        if (e.textEditor === this.editor) this.repaintSoon();
      }),
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (!editor || editor === this.editor) return;
        if (this.decoration) this.decoration.dispose();
        this.decoration = null;
        this.editor = editor;
        this.paint(true);
      }),
      // Move, the main menu or Settings picked a new spot.
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('mochi.overlayPosition')) this.paint(false);
      }),
    ];

    this.paint(true);
    this.updateStatus();
    this.notify();

    // The cat never stays longer than a minute. An unanswered reminder counts as dismissed;
    // a running break is stopped and counted.
    this.leaveTimer = setTimeout(() => {
      if (this.phase !== 'done') this.close();
    }, MAX_ON_SCREEN_MS);
  }

  // ---- drawing ----
  paint(enter) {
    const goal = this.data.breakGoal || 0;
    const scene = {
      ...this.scene,
      kind: this.data.kind,
      colors: this.data.colors,
      prop: this.data.prop,
      enter,
      timer: this.phase === 'break'
        ? {
            text: goal ? `${formatTime(this.seconds)} / ${formatTime(goal)}` : formatTime(this.seconds),
            progress: goal ? Math.min(1, this.seconds / goal) : null,
            reached: goal > 0 && this.seconds >= goal,
          }
        : null,
    };
    const { svg, width, height } = drawScene(scene);
    const spot = pickSpot(this.editor, height, overlayPosition());
    if (!spot) return;

    const uri = 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
    const type = vscode.window.createTextEditorDecorationType({
      before: {
        contentText: '',
        // Everything after "none;" is the trick: it turns the decoration into a floating picture.
        textDecoration: `none; position: absolute; z-index: 100; top: 0; left: ${spot.column}ch; `
          + `width: ${width}px; height: ${height}px; pointer-events: none; `
          + `background: url("${uri}") no-repeat; background-size: ${width}px ${height}px;`,
      },
    });
    this.editor.setDecorations(type, [new vscode.Range(spot.line, 0, spot.line, 0)]);
    if (this.decoration) this.decoration.dispose();
    this.decoration = type;
  }

  // Scrolling moves the picture along with its line, so find a new spot once scrolling settles.
  repaintSoon() {
    clearTimeout(this.repaintTimer);
    this.repaintTimer = setTimeout(() => this.paint(false), 150);
  }

  updateStatus() {
    this.status.text = this.phase === 'break'
      ? `$(watch) ${formatTime(this.seconds)} · ${plain(this.data.stopLabel)}`
      : `$(bell) ${this.data.catName}: ${plain(this.data.greeting)}`;
  }

  // ---- choices ----
  choices() {
    if (this.phase === 'reminder') {
      return [
        { label: plain(this.data.breakLabel), action: 'break' },
        { label: plain(this.data.snoozeLabel), action: 'snooze' },
      ];
    }
    if (this.phase === 'break') return [{ label: plain(this.data.stopLabel), action: 'stop' }];
    return [];
  }

  // Move and Close are offered in every phase, after the reminder's own buttons.
  allChoices() {
    return [...this.choices(), { label: 'Move', action: 'move' }, { label: 'Close', action: 'close' }];
  }

  // A notification with the buttons. A stale one (from an earlier phase) is ignored.
  async notify() {
    const phase = this.phase;
    const choices = this.allChoices();
    const text = phase === 'reminder'
      ? `${this.data.catName}: ${plain(this.data.greeting)}`
      : `${plain(this.data.breakGreeting)}. Click "${plain(this.data.stopLabel)}" when you're back.`;
    const picked = await vscode.window.showInformationMessage(text, ...choices.map((c) => c.label));
    if (this.phase !== phase) return;
    const choice = choices.find((c) => c.label === picked);
    if (choice?.action === 'move') {
      await this.move();
      if (this.phase === phase) this.notify(); // clicking Move closed the notification, so bring it back
    } else if (choice) this.act(choice.action);
    else if (phase === 'reminder') this.finish({}); // closed with the X: the cat leaves, like closing the panel
  }

  async menu() {
    const phase = this.phase;
    const choices = this.allChoices().map((c) => ({
      ...c,
      label: c.action === 'move' ? '$(move) Move the cat' : c.action === 'close' ? '$(close) Close the cat' : c.label,
    }));
    const picked = await vscode.window.showQuickPick(choices, { placeHolder: `${this.data.catName} 🐱` });
    if (!picked || this.phase !== phase) return;
    if (picked.action === 'move') this.move();
    else this.act(picked.action);
  }

  // The config listener in start() repaints once the new spot is saved.
  move() {
    return chooseOverlayPosition(this.data.catName);
  }

  // Close: an unanswered reminder counts as dismissed; a running break is stopped and counted;
  // while the cat is saying goodbye, its answer (snooze or done) still counts.
  close() {
    if (this.phase === 'break') this.finish({ choice: 'done', seconds: this.seconds });
    else this.finish(this.answer || {});
  }

  act(action) {
    if (action === 'close') {
      this.close();
    } else if (action === 'snooze') {
      this.phase = 'done';
      this.scene = { title: 'Fine. Hmph.', message: plain(this.data.snoozeLabel), mood: 'grumpy' };
      this.paint(false);
      this.answer = { choice: 'snooze' };
      setTimeout(() => this.finish(this.answer), 1500);
    } else if (action === 'break') {
      this.startBreak();
    } else if (action === 'stop') {
      this.stopBreak();
    } else {
      this.finish({});
    }
  }

  startBreak() {
    this.phase = 'break';
    this.scene = {
      title: this.data.breakGreeting,
      message: this.data.breakMessage,
      mood: this.data.kind === 'eye' ? 'sleepy' : '',
    };
    const goal = this.data.breakGoal || 0;
    this.timer = setInterval(() => {
      this.seconds++;
      if (goal && this.seconds === goal) {
        this.scene = { ...this.scene, title: this.data.goalGreeting, message: 'Keep going, or stop whenever you like.', mood: 'happy' };
      }
      this.paint(false);
      this.updateStatus();
    }, 1000);
    this.paint(false);
    this.updateStatus();
    this.notify();
  }

  stopBreak() {
    clearInterval(this.timer);
    this.phase = 'done';
    this.scene = {
      title: this.data.celebrate,
      message: this.seconds ? `You took a ${niceDuration(this.seconds)} break.` : '',
      mood: 'happy',
    };
    this.paint(false);
    this.status.hide();
    this.answer = { choice: 'done', seconds: this.seconds };
    setTimeout(() => this.finish(this.answer), 2500);
  }

  finish(result) {
    if (this.finished) return;
    this.finished = true;
    this.phase = 'done'; // buttons on any leftover notification now do nothing
    clearTimeout(this.leaveTimer);
    clearInterval(this.timer);
    clearTimeout(this.repaintTimer);
    if (this.decoration) this.decoration.dispose();
    this.status.dispose();
    this.listeners.forEach((l) => l.dispose());
    if (current === this) current = null;
    this.resolve(result);
  }
}

module.exports = { showOverlay, overlayMenu, hideOverlay, chooseOverlayPosition, drawScene, loadArt };
