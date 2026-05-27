/* =========================================================
   CRYPTONAUTS — shared interactive script
   ========================================================= */

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/* ─────────────────────────────────────────────────────────
   CAESAR CIPHER
   ───────────────────────────────────────────────────────── */

function caesarShift(text, shift) {
  shift = ((shift % 26) + 26) % 26;
  let result = '';
  for (const ch of text.toUpperCase()) {
    const idx = ALPHABET.indexOf(ch);
    if (idx >= 0) {
      result += ALPHABET[(idx + shift) % 26];
    } else {
      result += ch;
    }
  }
  return result;
}

function buildCaesarWheel() {
  const outer = document.getElementById('outer-ring');
  const inner = document.getElementById('inner-letters');
  if (!outer || !inner) return;

  outer.innerHTML = '';
  inner.innerHTML = '';

  for (let i = 0; i < 26; i++) {
    const angle = (i * 360 / 26) - 90; // start at top
    const rad = angle * Math.PI / 180;

    // Outer ring (plaintext, fixed) — radius ~135
    const ox = Math.cos(rad) * 135;
    const oy = Math.sin(rad) * 135;
    const otxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    otxt.setAttribute('x', ox);
    otxt.setAttribute('y', oy + 6);
    otxt.setAttribute('text-anchor', 'middle');
    otxt.setAttribute('font-family', 'VT323');
    otxt.setAttribute('font-size', '20');
    otxt.setAttribute('fill', 'var(--phosphor)');
    otxt.textContent = ALPHABET[i];
    outer.appendChild(otxt);

    // Inner ring (ciphertext, rotates) — radius ~85
    const ix = Math.cos(rad) * 85;
    const iy = Math.sin(rad) * 85;
    const itxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    itxt.setAttribute('x', ix);
    itxt.setAttribute('y', iy + 6);
    itxt.setAttribute('text-anchor', 'middle');
    itxt.setAttribute('font-family', 'VT323');
    itxt.setAttribute('font-size', '20');
    itxt.setAttribute('fill', 'var(--amber)');
    // The parent group rotates; we counter-rotate each letter around its own
    // centre so it always stays upright. CSS transform-origin uses the letter's
    // own x/y in SVG units (via transform-box: view-box, set in stylesheet).
    itxt.style.transformOrigin = `${ix}px ${iy}px`;
    itxt.style.transformBox = 'view-box';
    itxt.style.transition = 'transform 0.5s cubic-bezier(.22,1,.36,1)';
    itxt.textContent = ALPHABET[i];
    inner.appendChild(itxt);
  }
}

function rotateCaesarWheel(shift) {
  const inner = document.getElementById('inner-ring');
  if (!inner) return;
  // Each letter slot is 360/26 degrees. Negative because we rotate the inner ring
  // backwards so the letter under A on the outer ring is A+shift.
  // We set the CSS `transform` property (not the SVG `transform` attribute) so
  // the CSS `transform-origin` + `transform-box: view-box` apply correctly and
  // the rotation pivots around the SVG centre (0, 0).
  const deg = -(shift * 360 / 26);
  inner.style.transform = `rotate(${deg}deg)`;
  // Counter-rotate each individual letter around its own centre so the glyphs
  // remain upright while the ring spins.
  const letters = document.getElementById('inner-letters');
  if (letters) {
    for (const letter of letters.children) {
      letter.style.transform = `rotate(${-deg}deg)`;
    }
  }
}

function initCaesarPage() {
  buildCaesarWheel();
  const shiftInput = document.getElementById('caesar-shift');
  const shiftVal = document.getElementById('shift-val');
  const textIn = document.getElementById('caesar-input');
  const out = document.getElementById('caesar-output');

  rotateCaesarWheel(parseInt(shiftInput.value));

  const update = () => {
    const s = parseInt(shiftInput.value);
    shiftVal.textContent = s;
    rotateCaesarWheel(s);
  };

  shiftInput.addEventListener('input', update);

  document.getElementById('caesar-encrypt-btn').addEventListener('click', () => {
    const s = parseInt(shiftInput.value);
    out.textContent = caesarShift(textIn.value, s);
  });

  document.getElementById('caesar-decrypt-btn').addEventListener('click', () => {
    const s = parseInt(shiftInput.value);
    out.textContent = caesarShift(textIn.value, -s);
  });

  document.getElementById('caesar-clear-btn').addEventListener('click', () => {
    textIn.value = '';
    out.textContent = '';
  });
}

/* ─────────────────────────────────────────────────────────
   VIGENÈRE CIPHER
   ───────────────────────────────────────────────────────── */

function cleanKeyword(key) {
  return (key || '').toUpperCase().replace(/[^A-Z]/g, '') || 'A';
}

function vigenereProcess(text, key, decrypt = false) {
  const cleanKey = cleanKeyword(key);
  let result = '';
  let keyIdx = 0;
  for (const ch of text.toUpperCase()) {
    const idx = ALPHABET.indexOf(ch);
    if (idx >= 0) {
      const shift = ALPHABET.indexOf(cleanKey[keyIdx % cleanKey.length]);
      const newIdx = decrypt
        ? (idx - shift + 26) % 26
        : (idx + shift) % 26;
      result += ALPHABET[newIdx];
      keyIdx++;
    } else {
      // Non-letter characters pass through unchanged; do NOT advance key pointer.
      result += ch;
    }
  }
  return result;
}

function renderVigenereBreakdown(plaintext, key, decrypt = false) {
  const grid = document.getElementById('vig-breakdown');
  if (!grid) return;
  grid.innerHTML = '';
  const cleanKey = cleanKeyword(key);
  const upper = plaintext.toUpperCase();
  let keyIdx = 0;

  for (const ch of upper) {
    if (!/[A-Z]/.test(ch)) {
      // Render a thin spacer to preserve word breaks
      const sp = document.createElement('div');
      sp.className = 'vig-col space';
      grid.appendChild(sp);
      continue;
    }
    const col = document.createElement('div');
    col.className = 'vig-col';

    const plainIdx = ALPHABET.indexOf(ch);
    const keyChar = cleanKey[keyIdx % cleanKey.length];
    const shift = ALPHABET.indexOf(keyChar);
    const cipherIdx = decrypt
      ? (plainIdx - shift + 26) % 26
      : (plainIdx + shift) % 26;

    col.innerHTML = `
      <div class="vig-row-label">${decrypt ? 'cipher' : 'plain'}</div>
      <div class="vig-cell vig-plain">${ch}</div>
      <div class="vig-row-label">key</div>
      <div class="vig-cell vig-key">${keyChar}</div>
      <div class="vig-shift">${decrypt ? '−' : '+'}${shift}</div>
      <div class="vig-row-label">${decrypt ? 'plain' : 'cipher'}</div>
      <div class="vig-cell vig-cipher">${ALPHABET[cipherIdx]}</div>
    `;
    grid.appendChild(col);
    keyIdx++;
  }
}

function buildVigenereTableau() {
  const tab = document.getElementById('vig-tableau');
  if (!tab) return;
  tab.innerHTML = '';
  // Corner
  const corner = document.createElement('div');
  corner.className = 'cell header';
  tab.appendChild(corner);
  // Top header row (plaintext letters)
  for (let c = 0; c < 26; c++) {
    const h = document.createElement('div');
    h.className = 'cell header';
    h.dataset.col = c;
    h.textContent = ALPHABET[c];
    tab.appendChild(h);
  }
  // Body rows
  for (let r = 0; r < 26; r++) {
    // Row header
    const rh = document.createElement('div');
    rh.className = 'cell header';
    rh.dataset.row = r;
    rh.textContent = ALPHABET[r];
    tab.appendChild(rh);
    for (let c = 0; c < 26; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = r;
      cell.dataset.col = c;
      cell.textContent = ALPHABET[(r + c) % 26];
      tab.appendChild(cell);
    }
  }
  // Highlight row + col on hover
  tab.addEventListener('mouseover', (e) => {
    const t = e.target;
    if (!t.classList.contains('cell')) return;
    const r = t.dataset.row;
    const c = t.dataset.col;
    tab.querySelectorAll('.cell').forEach(el => {
      el.classList.remove('col-hover', 'row-hover');
      if (c !== undefined && el.dataset.col === c) el.classList.add('col-hover');
      if (r !== undefined && el.dataset.row === r) el.classList.add('row-hover');
    });
  });
  tab.addEventListener('mouseleave', () => {
    tab.querySelectorAll('.cell').forEach(el => el.classList.remove('col-hover', 'row-hover'));
  });
}

function initVigenerePage() {
  buildVigenereTableau();
  const inp = document.getElementById('vig-input');
  const key = document.getElementById('vig-key');
  const out = document.getElementById('vig-output');

  document.getElementById('vig-encrypt-btn').addEventListener('click', () => {
    out.textContent = vigenereProcess(inp.value, key.value, false);
    renderVigenereBreakdown(inp.value, key.value, false);
  });
  document.getElementById('vig-decrypt-btn').addEventListener('click', () => {
    out.textContent = vigenereProcess(inp.value, key.value, true);
    renderVigenereBreakdown(inp.value, key.value, true);
  });
  document.getElementById('vig-clear-btn').addEventListener('click', () => {
    inp.value = '';
    out.textContent = '';
    document.getElementById('vig-breakdown').innerHTML = '';
  });

  // Render initial breakdown so the page isn't empty
  renderVigenereBreakdown(inp.value, key.value, false);
}

/* ─────────────────────────────────────────────────────────
   RAIL FENCE CIPHER (transposition)
   ───────────────────────────────────────────────────────── */

// Compute which rail each character lands on for a given length and rail count.
function railPattern(length, rails) {
  if (rails < 2) return new Array(length).fill(0);
  const pattern = [];
  let rail = 0;
  let direction = 1;
  for (let i = 0; i < length; i++) {
    pattern.push(rail);
    if (rail === 0) direction = 1;
    else if (rail === rails - 1) direction = -1;
    rail += direction;
  }
  return pattern;
}

function railFenceEncrypt(text, rails) {
  // Operate on letters-only for the cipher; preserve spaces/punctuation? For clarity
  // and to match how Rail Fence is taught, we strip non-letters and uppercase.
  const clean = text.toUpperCase().replace(/[^A-Z]/g, '');
  if (rails < 2 || clean.length === 0) return clean;
  const pattern = railPattern(clean.length, rails);
  const buckets = Array.from({ length: rails }, () => []);
  for (let i = 0; i < clean.length; i++) {
    buckets[pattern[i]].push(clean[i]);
  }
  return buckets.map(b => b.join('')).join('');
}

function railFenceDecrypt(text, rails) {
  const clean = text.toUpperCase().replace(/[^A-Z]/g, '');
  if (rails < 2 || clean.length === 0) return clean;
  const pattern = railPattern(clean.length, rails);
  // Count how many letters land on each rail.
  const counts = new Array(rails).fill(0);
  for (const r of pattern) counts[r]++;
  // Slice the ciphertext into per-rail strings in order.
  const railStrings = [];
  let pos = 0;
  for (let r = 0; r < rails; r++) {
    railStrings.push(clean.slice(pos, pos + counts[r]));
    pos += counts[r];
  }
  // Walk through positions in zig-zag order, pulling letters off the relevant rail.
  const railIdx = new Array(rails).fill(0);
  let out = '';
  for (let i = 0; i < clean.length; i++) {
    const r = pattern[i];
    out += railStrings[r][railIdx[r]++];
  }
  return out;
}

function renderRailFence(text, rails) {
  const fence = document.getElementById('rf-fence');
  if (!fence) return;
  fence.innerHTML = '';
  const clean = text.toUpperCase().replace(/[^A-Z]/g, '');
  if (!clean) {
    fence.innerHTML = '<div style="color: var(--phosphor-dim); font-style: italic; font-family: var(--terminal-mono);">› type a message to see the fence</div>';
    return;
  }
  const pattern = railPattern(clean.length, rails);
  // Build a matrix of rails × columns
  for (let r = 0; r < rails; r++) {
    const row = document.createElement('div');
    row.className = 'rf-row';
    const label = document.createElement('span');
    label.className = 'rf-row-label';
    label.textContent = `RAIL ${r + 1}`;
    row.appendChild(label);
    for (let c = 0; c < clean.length; c++) {
      const cell = document.createElement('span');
      if (pattern[c] === r) {
        cell.className = 'rf-cell filled';
        cell.textContent = clean[c];
        // Stagger animation delay so it looks like writing
        cell.style.animationDelay = `${c * 30}ms`;
      } else {
        cell.className = 'rf-cell dot';
        cell.textContent = '·';
      }
      row.appendChild(cell);
    }
    fence.appendChild(row);
  }
}

function initRailFencePage() {
  const inp = document.getElementById('rf-input');
  const rails = document.getElementById('rf-rails');
  const railVal = document.getElementById('rf-rail-val');
  const out = document.getElementById('rf-output');

  const updateFence = () => {
    railVal.textContent = rails.value;
    renderRailFence(inp.value, parseInt(rails.value));
  };

  rails.addEventListener('input', updateFence);
  inp.addEventListener('input', updateFence);

  document.getElementById('rf-encrypt-btn').addEventListener('click', () => {
    const r = parseInt(rails.value);
    out.textContent = railFenceEncrypt(inp.value, r);
    renderRailFence(inp.value, r);
  });

  document.getElementById('rf-decrypt-btn').addEventListener('click', () => {
    const r = parseInt(rails.value);
    const decoded = railFenceDecrypt(inp.value, r);
    out.textContent = decoded;
    // Re-render the fence showing the decoded plaintext zig-zagging
    renderRailFence(decoded, r);
  });

  document.getElementById('rf-clear-btn').addEventListener('click', () => {
    inp.value = '';
    out.textContent = '';
    renderRailFence('', parseInt(rails.value));
  });

  // Initial render
  updateFence();
}

/* ─────────────────────────────────────────────────────────
   ENIGMA MACHINE (simplified 3-rotor)
   ───────────────────────────────────────────────────────── */

// Real Enigma rotor wirings (rotors I, II, III from the historical machine).
const ROTOR_WIRINGS = [
  'EKMFLGDQVZNTOWYHXUSPAIBRCJ', // I
  'AJDKSIRUXBLHWTMCQGZNPYFVOE', // II
  'BDFHJLCPRTXVZNYEIWGAKMUSQO', // III
];
// Reflector B (symmetric)
const REFLECTOR = 'YRUHQSLDPXNGOKMIEBFZCWVJAT';

let rotorPositions = [0, 0, 0]; // 0..25 each, displayed as A..Z

function letterToIdx(l) { return l.charCodeAt(0) - 65; }
function idxToLetter(i) { return String.fromCharCode(65 + ((i % 26 + 26) % 26)); }

function stepRotors() {
  // Simplified stepping: rightmost rotor always advances. When it wraps
  // back to 0, the middle one advances; same for middle → left.
  rotorPositions[2] = (rotorPositions[2] + 1) % 26;
  if (rotorPositions[2] === 0) {
    rotorPositions[1] = (rotorPositions[1] + 1) % 26;
    if (rotorPositions[1] === 0) {
      rotorPositions[0] = (rotorPositions[0] + 1) % 26;
    }
  }
  updateRotorDisplay();
}

function passThroughRotor(c, wiring, pos, reverse = false) {
  // shift in by rotor position
  let i = (letterToIdx(c) + pos) % 26;
  let mapped;
  if (!reverse) {
    mapped = letterToIdx(wiring[i]);
  } else {
    mapped = wiring.indexOf(idxToLetter(i));
  }
  // shift out by rotor position
  let out = (mapped - pos + 26) % 26;
  return idxToLetter(out);
}

function enigmaEncryptLetter(letter) {
  if (!/[A-Z]/.test(letter)) return letter;
  stepRotors();
  let c = letter;
  // Forward through rotors III → II → I
  c = passThroughRotor(c, ROTOR_WIRINGS[2], rotorPositions[2], false);
  c = passThroughRotor(c, ROTOR_WIRINGS[1], rotorPositions[1], false);
  c = passThroughRotor(c, ROTOR_WIRINGS[0], rotorPositions[0], false);
  // Reflector
  c = REFLECTOR[letterToIdx(c)];
  // Back through rotors I → II → III (reverse)
  c = passThroughRotor(c, ROTOR_WIRINGS[0], rotorPositions[0], true);
  c = passThroughRotor(c, ROTOR_WIRINGS[1], rotorPositions[1], true);
  c = passThroughRotor(c, ROTOR_WIRINGS[2], rotorPositions[2], true);
  return c;
}

function updateRotorDisplay() {
  for (let i = 0; i < 3; i++) {
    const el = document.getElementById(`rotor-${i}`);
    if (el) el.textContent = idxToLetter(rotorPositions[i]);
  }
}

function adjustRotor(which, delta) {
  rotorPositions[which] = (rotorPositions[which] + delta + 26) % 26;
  updateRotorDisplay();
}

function buildLampboard() {
  const lb = document.getElementById('lampboard');
  if (!lb) return;
  lb.innerHTML = '';
  for (const letter of ALPHABET) {
    const d = document.createElement('div');
    d.className = 'lamp';
    d.id = `lamp-${letter}`;
    d.textContent = letter;
    lb.appendChild(d);
  }
}

function lightLamp(letter) {
  document.querySelectorAll('.lamp').forEach(l => l.classList.remove('on'));
  const lamp = document.getElementById(`lamp-${letter}`);
  if (lamp) lamp.classList.add('on');
}

let savedInitialPositions = [0, 0, 0];

function initEnigmaPage() {
  buildLampboard();
  updateRotorDisplay();
  savedInitialPositions = [...rotorPositions];

  document.getElementById('enigma-encrypt-btn').addEventListener('click', async () => {
    // remember the starting positions BEFORE processing,
    // and process letter by letter with a tiny delay so the user can see lamps flash.
    savedInitialPositions = [...rotorPositions];
    const input = document.getElementById('enigma-input').value.toUpperCase();
    const out = document.getElementById('enigma-output');
    out.textContent = '';
    for (const ch of input) {
      if (/[A-Z]/.test(ch)) {
        const enc = enigmaEncryptLetter(ch);
        lightLamp(enc);
        out.textContent += enc;
        await new Promise(r => setTimeout(r, 90));
      } else {
        out.textContent += ch;
      }
    }
  });

  document.getElementById('enigma-reset-btn').addEventListener('click', () => {
    rotorPositions = [0, 0, 0];
    updateRotorDisplay();
    document.querySelectorAll('.lamp').forEach(l => l.classList.remove('on'));
    document.getElementById('enigma-output').textContent = '';
  });
}

// Expose adjustRotor for inline onclick
window.adjustRotor = adjustRotor;

/* ─────────────────────────────────────────────────────────
   MORSE CODE
   ───────────────────────────────────────────────────────── */

const MORSE_MAP = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.',
  G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..',
  M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.',
  S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-',
  Y: '-.--', Z: '--..',
  '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
  '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
  '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.',
  '!': '-.-.--', '/': '-..-.', '(': '-.--.', ')': '-.--.-',
  '&': '.-...', ':': '---...', ';': '-.-.-.', '=': '-...-',
  '+': '.-.-.', '-': '-....-', '_': '..--.-', '"': '.-..-.',
  '@': '.--.-.'
};
const REVERSE_MORSE = Object.fromEntries(Object.entries(MORSE_MAP).map(([k, v]) => [v, k]));

function textToMorse(text) {
  return text.toUpperCase().split('').map(ch => {
    if (ch === ' ') return '/';
    return MORSE_MAP[ch] || '';
  }).filter(Boolean).join(' ');
}

function morseToText(morse) {
  return morse.trim().split(/\s+/).map(token => {
    if (token === '/') return ' ';
    return REVERSE_MORSE[token] || '?';
  }).join('');
}

let audioCtx = null;
let morsePlayback = { stopped: false };

function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function beep(duration) {
  return new Promise(resolve => {
    if (morsePlayback.stopped) { resolve(); return; }
    ensureAudio();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 600;
    gain.gain.value = 0.18;
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    document.getElementById('morse-lamp')?.classList.add('lit');
    setTimeout(() => {
      osc.stop();
      document.getElementById('morse-lamp')?.classList.remove('lit');
      resolve();
    }, duration);
  });
}
function pause(duration) {
  return new Promise(r => setTimeout(r, duration));
}

async function playMorse(morse, wpm) {
  // PARIS timing: dit = 1.2/wpm seconds
  const unit = 1200 / wpm; // ms
  morsePlayback.stopped = false;
  for (const ch of morse) {
    if (morsePlayback.stopped) return;
    if (ch === '.') { await beep(unit); await pause(unit); }
    else if (ch === '-') { await beep(unit * 3); await pause(unit); }
    else if (ch === ' ') { await pause(unit * 2); } // total 3 between letters
    else if (ch === '/') { await pause(unit * 4); } // total 7 between words
  }
}

function initMorsePage() {
  const inp = document.getElementById('morse-input');
  const out = document.getElementById('morse-output');
  const wpm = document.getElementById('morse-wpm');
  const wpmVal = document.getElementById('wpm-val');

  wpm.addEventListener('input', () => { wpmVal.textContent = wpm.value; });

  // Build chart
  const chart = document.getElementById('morse-chart');
  if (chart) {
    chart.innerHTML = '';
    for (const [k, v] of Object.entries(MORSE_MAP)) {
      if (k.length === 1 && /[A-Z0-9]/.test(k)) {
        const div = document.createElement('div');
        div.style.padding = '6px 10px';
        div.style.border = '1px solid var(--rule)';
        div.style.background = '#0a100a';
        div.innerHTML = `<strong style="color: var(--amber); font-family: var(--display); font-size: 20px;">${k}</strong> &nbsp;<span style="color: var(--phosphor); letter-spacing: 2px;">${v}</span>`;
        chart.appendChild(div);
      }
    }
  }

  document.getElementById('morse-text-to-morse-btn').addEventListener('click', () => {
    out.textContent = textToMorse(inp.value);
  });

  document.getElementById('morse-morse-to-text-btn').addEventListener('click', () => {
    // Treat current textbox as morse input
    out.textContent = morseToText(inp.value);
  });

  document.getElementById('morse-play-btn').addEventListener('click', async () => {
    // If output already has morse, play that; otherwise convert input
    let morse = out.textContent.trim();
    if (!morse || !/^[.\-/ ]+$/.test(morse)) {
      morse = textToMorse(inp.value);
      out.textContent = morse;
    }
    await playMorse(morse, parseInt(wpm.value));
  });

  document.getElementById('morse-stop-btn').addEventListener('click', () => {
    morsePlayback.stopped = true;
    document.getElementById('morse-lamp')?.classList.remove('lit');
  });
}

/* ─────────────────────────────────────────────────────────
   CICADA PUZZLE
   ───────────────────────────────────────────────────────── */

function normalize(s) {
  return (s || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function checkPuzzle(step) {
  if (step === 1) {
    // Step 1: Caesar shift 5 of "HWFHP YT TUJS" -> "CRACK TO OPEN"
    const answer = caesarShift('HWFHP YT TUJS', -5);
    const user = normalize(document.getElementById('puzzle-step-1').value);
    const target = normalize(answer); // "CRACK TO OPEN" -> "CRACKTOROPEN"
    const fb = document.getElementById('puzzle-1-feedback');
    if (user === target) {
      fb.innerHTML = `<span style="color: var(--phosphor);">✓ CORRECT — "${answer}"</span>`;
      document.getElementById('puzzle-box-2').style.display = 'block';
    } else {
      fb.innerHTML = `<span style="color: var(--crimson);">✗ Not quite. Shift back by 5 places. H→C, W→R, F→A...</span>`;
    }
  }
  if (step === 2) {
    // Step 2: Rail Fence 3 rails of "CTARPORPYYGH" -> "CRYPTOGRAPHY"
    const answer = railFenceDecrypt('CTARPORPYYGH', 3);
    const user = normalize(document.getElementById('puzzle-step-2').value);
    const target = normalize(answer); // "CRYPTOGRAPHY"
    const fb = document.getElementById('puzzle-2-feedback');
    if (user === target) {
      fb.innerHTML = `<span style="color: var(--phosphor);">✓ CORRECT — "${answer}"</span>`;
      document.getElementById('puzzle-box-3').style.display = 'block';
    } else {
      fb.innerHTML = `<span style="color: var(--crimson);">✗ Close! Use 3 rails and read the zigzag pattern. Go to RAIL FENCE lesson if stuck.</span>`;
    }
  }
  if (step === 3) {
    // Step 3: Vigenère with keyword "ENIGMA" of "WBTBUNK PQVTEV" -> "SOLVING CIPHER"
    const answer = vigenereProcess('WBTBUNK PQVTEV', 'ENIGMA', true);
    const user = normalize(document.getElementById('puzzle-step-3').value);
    const target = normalize(answer); // "SOLVING CIPHER" -> "SOLVINGCIPHER"
    const fb = document.getElementById('puzzle-3-feedback');
    if (user === target) {
      fb.innerHTML = `<span style="color: var(--phosphor);">✓ CORRECT — "${answer}"</span>`;
      document.getElementById('puzzle-box-4').style.display = 'block';
    } else {
      fb.innerHTML = `<span style="color: var(--crimson);">✗ Try using the VIGENÈRE lesson with keyword ENIGMA. The answer is _____ CIPHER.</span>`;
    }
  }
  if (step === 4) {
    // Step 4: Morse "- .... . / -.- . -.-- / .. ... / ... .. -..- - . . -.."
    // Decodes to "THE KEY IS SIXTEEN" — user needs to type SIXTEEN
    const answer = morseToText('- .... . / -.- . -.-- / .. ... / ... .. -..- - . . -..'); // -> "THE KEY IS SIXTEEN"
    const user = normalize(document.getElementById('puzzle-step-4').value);
    const target = normalize('SIXTEEN');
    const fb = document.getElementById('puzzle-4-feedback');
    if (user === target) {
      fb.innerHTML = `<span style="color: var(--phosphor);">✓ CORRECT — the last word is "${target}"</span>`;
      document.getElementById('puzzle-box-5').style.display = 'block';
    } else {
      fb.innerHTML = `<span style="color: var(--crimson);">✗ Decode the Morse. The full message is "THE KEY IS ??????". Type the last word.</span>`;
    }
  }
  if (step === 5) {
    // Step 5: Final calculation
    // "CRACK" from step 1 = 5 letters
    // "CRYPTOGRAPHY" from step 2 = 12 letters
    // "SIXTEEN" from step 4 = 16
    // 5 × 12 × 16 = 960
    const expectedAnswer = 5 * 12 * 16;
    const user = parseInt(document.getElementById('puzzle-step-5').value);
    const fb = document.getElementById('puzzle-5-feedback');
    if (user === expectedAnswer) {
      fb.innerHTML = `<span style="color: var(--phosphor);">✓ CORRECT — 5 × 12 × 16 = ${expectedAnswer}</span>`;
      document.getElementById('puzzle-final').style.display = 'block';
      document.getElementById('puzzle-final').scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      fb.innerHTML = `<span style="color: var(--crimson);">✗ Try again. (5 from CRACK) × (12 from CRYPTOGRAPHY) × (16 from SIXTEEN) = ?</span>`;
    }
  }
}

window.checkPuzzle = checkPuzzle;

function initCicadaPage() {
  // nothing extra to wire up — checkPuzzle is bound via onclick
}

// Expose init functions globally so they can be called from each page
window.initCaesarPage = initCaesarPage;
window.initVigenerePage = initVigenerePage;
window.initRailFencePage = initRailFencePage;
window.initEnigmaPage = initEnigmaPage;
window.initMorsePage = initMorsePage;
window.initCicadaPage = initCicadaPage;
