// ==========================================
// 🌌 KING OF TOKYO: DUEL CORE SCRIPT MODULE
// ==========================================

let gameState = {
  p1: { name: "Gigazaur", health: 10, energy: 0 },
  p2: { name: "Kraken", health: 10, energy: 0 }
};

let turnRollCount = 0;
let poolSize = 6;
let diceArray = [];
let executionLock = false;

const FACES = ['damage', 'destruction', 'energy', 'fame', 'ability', 'health'];

const SVG_ASSETS = {
  damage: `<svg viewBox="0 0 100 100" class="w-5/6 h-5/6 text-red-500 fill-current"><circle cx="50" cy="62" r="16"/><path d="M26,44 C21,34 31,24 36,36 Z"/><path d="M42,30 C41,16 53,14 53,28 Z"/><path d="M60,32 C64,16 75,22 70,36 Z"/><path d="M76,48 C83,40 90,52 80,58 Z"/></svg>`,
  destruction: `<svg viewBox="0 0 100 100" class="w-4/5 h-4/5 text-sky-400 fill-current"><path d="M30,90 L30,15 L70,15 L70,90 Z" /><rect x="38" y="25" width="8" height="12" fill="#18181b"/><rect x="54" y="25" width="8" height="12" fill="#18181b"/><rect x="38" y="47" width="8" height="12" fill="#18181b"/><rect x="54" y="47" width="8" height="12" fill="#18181b"/><rect x="38" y="69" width="8" height="12" fill="#18181b"/><rect x="54" y="69" width="8" height="12" fill="#18181b"/></svg>`,
  energy: `<svg viewBox="0 0 100 100" class="w-4/5 h-4/5 text-yellow-400 fill-current"><polygon points="62,8 24,54 52,54 38,92 76,46 48,46"/></svg>`,
  fame: `<svg viewBox="0 0 100 100" class="w-5/6 h-5/6 text-purple-400 fill-current"><polygon points="50,8 63,38 96,38 69,58 79,90 50,70 21,90 31,58 4,38 37,38"/></svg>`,
  ability: `<svg viewBox="0 0 100 100" class="w-4/5 h-4/5 text-orange-500 fill-current"><path d="M50,10 C27.9,10 10,27.9 10,50 C10,72.1 27.9,90 50,90 C72.1,90 90,72.1 90,50 C90,27.9 72.1,10 50,10 Z M50,22 C54.4,22 55,26 54,48 C53.5,58 46.5,58 46,48 C45,26 45.6,22 50,22 Z M50,78 C45.6,78 44,74.4 44,70 C44,65.6 45.6,62 50,62 C54.4,62 56,65.6 56,70 C56,74.4 54.4,78 50,78 Z" fill-rule="evenodd"/></svg>`,
  health: `<svg viewBox="0 0 100 100" class="w-4/5 h-4/5 text-emerald-500 fill-current"><path d="M50,84 C50,84 14,60 14,36 C14,18 32,10 50,28 C68,10 86,18 86,36 C86,60 50,84 50,84 Z"/></svg>`
};

// ==========================================
// 💾 PERSISTENT DEVICE DATA STATE ACTIONS
// ==========================================
function saveStateToLocalStorage() {
  try {
    gameState.p1.name = document.getElementById('p1-name-input').value;
    gameState.p2.name = document.getElementById('p2-name-input').value;
    
    const pack = { gameState, poolSize, turnRollCount };
    localStorage.setItem('kot_duel_state', JSON.stringify(pack));
  } catch (e) {
    console.error("Auto-save runtime error:", e);
  }
}

function loadStateFromLocalStorage() {
  try {
    const raw = localStorage.getItem('kot_duel_state');
    if (!raw) return false;
    
    const pack = JSON.parse(raw);
    gameState = pack.gameState;
    poolSize = pack.poolSize || 6;
    turnRollCount = pack.turnRollCount || 0;

    // Restore text content references inside the DOM fields
    document.getElementById('p1-name-input').value = gameState.p1.name || "Gigazaur";
    document.getElementById('p2-name-input').value = gameState.p2.name || "Kraken";
    
    const pDisplay = document.getElementById('pool-display');
    if (pDisplay) pDisplay.innerText = poolSize;
    
    const rDisplay = document.getElementById('roll-counter-display');
    if (rDisplay) rDisplay.innerText = turnRollCount;

    // Refresh layout tickers
    syncDOMCounterDisplay('p1', 'health');
    syncDOMCounterDisplay('p1', 'energy');
    syncDOMCounterDisplay('p2', 'health');
    syncDOMCounterDisplay('p2', 'energy');
    return true;
  } catch (e) {
    console.error("Boot diagnostics state read error:", e);
    return false;
  }
}

// ==========================================
// 🛠️ APPARATUS ROUTING INTERFACE METHODS
// ==========================================
function showTab(targetTab) {
  const scoreView = document.getElementById('tab-score-view');
  const diceView = document.getElementById('tab-dice-view');
  const navScore = document.getElementById('nav-score');
  const navDice = document.getElementById('nav-dice');
  
  if (targetTab === 'score') {
    scoreView.classList.remove('hidden');
    diceView.classList.add('hidden');
    navScore.className = "px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all bg-zinc-100 text-neutral-950 shadow";
    navDice.className = "px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all text-neutral-400 hover:text-white";
  } else {
    scoreView.classList.add('hidden');
    diceView.classList.remove('hidden');
    navDice.className = "px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all bg-zinc-100 text-neutral-950 shadow";
    navScore.className = "px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all text-neutral-400 hover:text-white";
    renderTable();
  }
}

function toggleDiceRotation() {
  const rotator = document.getElementById('dice-rotator');
  if (rotator) rotator.classList.toggle('rotate-180');
}

function changeScoreStat(player, stat, amount) {
  let nextValue = gameState[player][stat] + amount;
  if (nextValue >= 0) {
    gameState[player][stat] = nextValue;
    syncDOMCounterDisplay(player, stat);
    saveStateToLocalStorage();
  }
}

function syncDOMCounterDisplay(player, stat) {
  const currentVal = gameState[player][stat];
  const matchingNodes = document.querySelectorAll(`.${player}-${stat}-text`);
  matchingNodes.forEach(node => {
    node.innerText = currentVal;
  });
}

function updateResolveLabels() {
  const p1Input = document.getElementById('p1-name-input').value;
  const p2Input = document.getElementById('p2-name-input').value;
  document.getElementById('p1-btn-label').innerText = (p1Input || 'GIGAZAUR').toUpperCase();
  document.getElementById('p2-btn-label').innerText = (p2Input || 'KRAKEN').toUpperCase();
  saveStateToLocalStorage();
}

function animateScoreTicker(player, stat, finalTarget) {
  function tick() {
    let current = gameState[player][stat];
    if (current === finalTarget) {
      document.querySelectorAll(`.${player}-${stat}-text`).forEach(el => el.classList.remove('scale-110', 'text-yellow-400'));
      return;
    }
    gameState[player][stat] = (current < finalTarget) ? current + 1 : current - 1;
    syncDOMCounterDisplay(player, stat);
    document.querySelectorAll(`.${player}-${stat}-text`).forEach(el => el.classList.add('scale-110', 'text-yellow-400'));
    setTimeout(tick, 120);
  }
  tick();
}

// ==========================================
// 🎲 DICE WORKSPACE CALCULATION LOGIC
// ==========================================
function buildFreshPool() {
  diceArray = [];
  for (let i = 0; i < poolSize; i++) {
    diceArray.push({ id: i, face: null, held: false, isShuffling: false });
  }
  renderTable();
}

function adjustPoolSize(delta) {
  if (executionLock) return;
  const computed = poolSize + delta;
  if (computed >= 1 && computed <= 8) {
    poolSize = computed;
    const display = document.getElementById('pool-display');
    if (display) display.innerText = poolSize;
    buildFreshPool();
    saveStateToLocalStorage();
  }
}

function toggleLockState(id) {
  if (executionLock) return;
  const target = diceArray.find(d => d.id === id);
  if (target.face === null) return;
  target.held = !target.held;
  renderTable();
}

function executeManualRoll() {
  if (executionLock) return;
  const rollTargets = diceArray.filter(d => !d.held);
  if (rollTargets.length === 0) return;
  
  turnRollCount++;
  document.getElementById('roll-counter-display').innerText = turnRollCount;
  executionLock = true;
  
  let tickCount = 0;
  const absoluteTicks = 8;
  const speedStep = 38;
  
  const shuffleTimer = setInterval(() => {
    rollTargets.forEach(die => {
      die.isShuffling = true;
      die.face = FACES[Math.floor(Math.random() * FACES.length)];
    });
    renderTable();
    tickCount++;
    
    if (tickCount >= absoluteTicks) {
      clearInterval(shuffleTimer);
      rollTargets.forEach(die => {
        die.isShuffling = false;
        die.face = FACES[Math.floor(Math.random() * FACES.length)];
      });
      executionLock = false;
      renderTable();
      saveStateToLocalStorage();
    }
  }, speedStep);
}

function resolveDicePool(targetPlayerId) {
  if (executionLock) return;
  let diceHealthCount = 0;
  let diceEnergyCount = 0;
  let diceDamageCount = 0;
  let rolledFacesPool = [];
  
  diceArray.forEach(die => {
    if (die.face) rolledFacesPool.push(die.face);
    if (die.face === 'health') diceHealthCount++;
    if (die.face === 'energy') diceEnergyCount++;
    if (die.face === 'damage') diceDamageCount++;
  });
  
  if (rolledFacesPool.length === 0) return;
  
  const opponentPlayerId = (targetPlayerId === 'p1') ? 'p2' : 'p1';
  const finalHealthTarget = gameState[targetPlayerId].health + diceHealthCount;
  const finalEnergyTarget = gameState[targetPlayerId].energy + diceEnergyCount;
  let finalOpponentHealthTarget = gameState[opponentPlayerId].health - diceDamageCount;
  if (finalOpponentHealthTarget < 0) finalOpponentHealthTarget = 0;
  
  injectTurnSummaryBanner(rolledFacesPool);
  showTab('score');
  
  setTimeout(() => {
    if (diceHealthCount > 0) animateScoreTicker(targetPlayerId, 'health', finalHealthTarget);
    if (diceEnergyCount > 0) animateScoreTicker(targetPlayerId, 'energy', finalEnergyTarget);
    if (diceDamageCount > 0) animateScoreTicker(opponentPlayerId, 'health', finalOpponentHealthTarget);
    saveStateToLocalStorage();
  }, 150);
  
  turnRollCount = 0;
  document.getElementById('roll-counter-display').innerText = turnRollCount;
  buildFreshPool();
}

function injectTurnSummaryBanner(faces) {
  const dividerBlock = document.getElementById('center-divider-block');
  const summaryContainer = document.getElementById('summary-container');
  const diceGrid = document.getElementById('summary-dice-grid');
  
  document.getElementById('p1-standard-rows').classList.add('hidden');
  document.getElementById('p1-summary-tiles').classList.remove('hidden');
  document.getElementById('p2-standard-rows').classList.add('hidden');
  document.getElementById('p2-summary-tiles').classList.remove('hidden');
  
  diceGrid.innerHTML = '';
  faces.forEach(face => {
    const dieCard = document.createElement('div');
    dieCard.className = "aspect-square w-full rounded-2xl bg-zinc-800 border-4 border-zinc-700 flex items-center justify-center p-2 shadow-[4px_4px_0px_#000000]";
    dieCard.innerHTML = SVG_ASSETS[face];
    diceGrid.appendChild(dieCard);
  });
  
  dividerBlock.className = "flex-1 bg-zinc-950 border-y-4 border-black w-full shadow-2xl z-10 flex flex-col justify-center transition-all duration-300 min-h-0";
  summaryContainer.classList.remove('hidden');
}

function dismissSummary() {
  const dividerBlock = document.getElementById('center-divider-block');
  const summaryContainer = document.getElementById('summary-container');
  
  document.getElementById('p1-standard-rows').classList.remove('hidden');
  document.getElementById('p1-summary-tiles').classList.add('hidden');
  document.getElementById('p2-standard-rows').classList.remove('hidden');
  document.getElementById('p2-summary-tiles').classList.add('hidden');
  
  dividerBlock.className = "h-2 bg-neutral-800 w-full shadow-[0_0_15px_rgba(0,0,0,0.7)] z-10 flex flex-col justify-center transition-all duration-300 shrink-0";
  summaryContainer.classList.add('hidden');
}

function renderTable() {
  const activeShelf = document.getElementById('active-shelf');
  const lockedShelf = document.getElementById('locked-shelf');
  if (!activeShelf || !lockedShelf) return;
  
  activeShelf.innerHTML = '';
  lockedShelf.innerHTML = '';
  
  diceArray.filter(d => !d.held).forEach(die => activeShelf.appendChild(generateDieMarkup(die)));
  diceArray.filter(d => d.held).forEach(die => lockedShelf.appendChild(generateDieMarkup(die)));
}

function generateDieMarkup(die) {
  const block = document.createElement('button');
  let componentClasses = "aspect-square w-full max-w-[85px] rounded-2xl bg-zinc-800 border-4 border-zinc-700 flex items-center justify-center p-2 shadow-[4px_4px_0px_#000000] active:scale-95 transition-all duration-75 ";
  if (die.held) componentClasses += "held-style";
  else componentClasses += "hover:border-zinc-500";
  
  block.className = componentClasses;
  if (die.isShuffling) block.classList.add('animate-tumble');
  block.onclick = () => toggleLockState(die.id);
  
  if (die.face) block.innerHTML = SVG_ASSETS[die.face];
  else block.innerHTML = `<span class="font-comic-heavy text-3xl text-zinc-600 select-none">?</span>`;
  return block;
}

function toggleFullscreen() {
  if (!document.fullscreenElement && !document.webkitFullscreenElement) {
    if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
    else if (document.documentElement.webkitRequestFullscreen) document.documentElement.webkitRequestFullscreen();
  } else {
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
  }
}

// ==========================================
// 🚀 LIFECYCLE INITIALIZATION INITIALIZER
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  const hadSavedState = loadStateFromLocalStorage();
  if (!hadSavedState) {
    buildFreshPool();
  }
  updateResolveLabels();
});
