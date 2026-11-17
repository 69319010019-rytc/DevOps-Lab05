const difficultyMap = {
  easy: { rows: 3, cols: 3 },
  medium: { rows: 4, cols: 4 },
  hard: { rows: 5, cols: 4 },
  expert: { rows: 5, cols: 5 }
};

const board = document.getElementById('board');
const tray = document.getElementById('tray');
const difficultySelect = document.getElementById('difficulty');
const resetBtn = document.getElementById('resetBtn');
const status = document.getElementById('status');
const timerEl = document.getElementById('timer');
const movesEl = document.getElementById('moves');
const startScreen = document.getElementById('startScreen');
const gameScreen = document.getElementById('gameScreen');
const startBtn = document.getElementById('startBtn');
const menuDifficulty = document.getElementById('menuDifficulty');
const resultModal = document.getElementById('resultModal');
const resultText = document.getElementById('resultText');
const closeModalBtn = document.getElementById('closeModalBtn');
const redLight = document.getElementById('redLight');
const yellowLight = document.getElementById('yellowLight');
const greenLight = document.getElementById('greenLight');
const launchSequence = document.getElementById('launchSequence');
const audioCtx = window.AudioContext || window.webkitAudioContext ? new (window.AudioContext || window.webkitAudioContext)() : null;

let state = {
  rows: 5,
  cols: 4,
  pieces: [],
  placed: new Set(),
  draggingPiece: null,
  startTime: Date.now(),
  elapsedSeconds: 0,
  moves: 0,
  timerId: null
};

function shuffleArray(array) {
  const clone = [...array];
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
}

function formatTime(totalSeconds) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function startTimer() {
  if (state.timerId) {
    clearInterval(state.timerId);
  }

  state.startTime = Date.now();
  state.elapsedSeconds = 0;
  timerEl.textContent = formatTime(state.elapsedSeconds);

  state.timerId = setInterval(() => {
    state.elapsedSeconds = Math.floor((Date.now() - state.startTime) / 1000);
    timerEl.textContent = formatTime(state.elapsedSeconds);
  }, 1000);
}

function stopTimer() {
  if (state.timerId) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
}

function updateMoves() {
  movesEl.textContent = String(state.moves);
}

function getTileBackgroundStyle(index) {
  const row = Math.floor(index / state.cols);
  const col = index % state.cols;
  const x = state.cols > 1 ? (col / (state.cols - 1)) * 100 : 0;
  const y = state.rows > 1 ? (row / (state.rows - 1)) * 100 : 0;

  return {
    backgroundImage: 'url("./Renault.jpg")',
    backgroundSize: `${state.cols * 100}% ${state.rows * 100}%`,
    backgroundPosition: `${x}% ${y}%`
  };
}

function updateStatus() {
  const completed = state.placed.size;
  const total = state.rows * state.cols;

  if (completed === total) {
    status.textContent = 'Complete! 🏁';
    status.style.color = '#34d399';
    stopTimer();
    showFinishModal();
    playFinishSound();
  } else {
    status.textContent = `${completed} / ${total} completed`;
    status.style.color = '#38bdf8';
  }
}

function createPiece(index) {
  const piece = document.createElement('div');
  piece.className = 'piece';
  piece.dataset.index = String(index);
  piece.draggable = true;

  const style = getTileBackgroundStyle(index);
  Object.assign(piece.style, {
    backgroundImage: style.backgroundImage,
    backgroundSize: style.backgroundSize,
    backgroundPosition: style.backgroundPosition
  });

  piece.addEventListener('dragstart', (event) => {
    if (piece.classList.contains('locked')) {
      event.preventDefault();
      return;
    }

    state.draggingPiece = Number(piece.dataset.index);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(state.draggingPiece));
    piece.style.opacity = '0.5';
    playButtonSound();
  });

  piece.addEventListener('dragend', () => {
    piece.style.opacity = '1';
    state.draggingPiece = null;
  });

  return piece;
}

function createSlot(index) {
  const slot = document.createElement('div');
  slot.className = 'slot';
  slot.dataset.index = String(index);

  slot.addEventListener('dragover', (event) => {
    if (!state.draggingPiece && !event.dataTransfer) return;
    event.preventDefault();
    slot.classList.add('drag-over');
  });

  slot.addEventListener('dragleave', () => {
    slot.classList.remove('drag-over');
  });

  slot.addEventListener('drop', (event) => {
    event.preventDefault();
    slot.classList.remove('drag-over');

    const droppedIndex = Number(event.dataTransfer.getData('text/plain'));
    if (Number.isNaN(droppedIndex)) return;

    const targetIndex = Number(slot.dataset.index);
    const piece = tray.querySelector(`.piece[data-index="${droppedIndex}"]`);

    if (!piece || piece.classList.contains('locked')) return;

    if (droppedIndex === targetIndex) {
      const slotPiece = slot.querySelector('.piece');
      if (slotPiece) {
        slotPiece.remove();
      }

      slot.appendChild(piece);
      piece.classList.add('locked');
      piece.draggable = false;
      state.placed.add(droppedIndex);
      state.moves += 1;
      updateMoves();
      updateStatus();
      playCorrectSound();
      return;
    }

    state.moves += 1;
    updateMoves();
    playWrongSound();
  });

  return slot;
}

function renderBoard() {
  board.innerHTML = '';
  board.style.gridTemplateColumns = `repeat(${state.cols}, minmax(0, 1fr))`;
  board.style.gridTemplateRows = `repeat(${state.rows}, minmax(0, 1fr))`;

  for (let i = 0; i < state.rows * state.cols; i += 1) {
    const slot = createSlot(i);
    board.appendChild(slot);
  }
}

function renderTray() {
  tray.innerHTML = '';

  const shuffled = shuffleArray(state.pieces);
  shuffled.forEach((index) => {
    const piece = createPiece(index);
    tray.appendChild(piece);
  });
}

function resetGame() {
  const config = difficultyMap[difficultySelect.value] || difficultyMap.hard;
  state.rows = config.rows;
  state.cols = config.cols;
  state.pieces = Array.from({ length: state.rows * state.cols }, (_, idx) => idx);
  state.placed = new Set();
  state.moves = 0;
  updateMoves();

  renderBoard();
  renderTray();
  updateStatus();
  startTimer();
}

function setLaunchLights(activeLight) {
  if (!redLight || !yellowLight || !greenLight) return;

  [redLight, yellowLight, greenLight].forEach((light) => {
    light.classList.remove('active');
  });

  if (activeLight) {
    activeLight.classList.add('active');
  }
}

function startGame() {
  if (!startBtn || !startScreen || !gameScreen || !menuDifficulty || !difficultySelect) {
    return;
  }

  playButtonSound();
  const chosenDifficulty = menuDifficulty.value;
  difficultySelect.value = chosenDifficulty;

  startScreen.classList.remove('hidden');
  gameScreen.classList.add('hidden');
  hideFinishModal();

  if (launchSequence) {
    launchSequence.classList.remove('hidden');
  }
  setLaunchLights(redLight);
  if (menuCar) {
    menuCar.classList.remove('launching');
  }
  playStartSound();

  setTimeout(() => {
    setLaunchLights(yellowLight);
  }, 700);

  setTimeout(() => {
    setLaunchLights(greenLight);
    if (menuCar) {
      menuCar.classList.add('launching');
    }
  }, 1400);

  setTimeout(() => {
    if (launchSequence) {
      launchSequence.classList.add('hidden');
    }
    startScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    resetGame();
  }, 2200);
}

function showFinishModal() {
  const total = state.rows * state.cols;
  resultText.textContent = `You completed ${total} pieces in ${formatTime(state.elapsedSeconds)} with ${state.moves} moves.`;
  resultModal.classList.remove('hidden');
}

function hideFinishModal() {
  resultModal.classList.add('hidden');
}

closeModalBtn.addEventListener('click', () => {
  playButtonSound();
  hideFinishModal();
  startScreen.classList.remove('hidden');
  gameScreen.classList.add('hidden');
  resetGame();
});

if (difficultySelect) {
  difficultySelect.addEventListener('change', () => {
    playButtonSound();
    resetGame();
  });
}
if (resetBtn) {
  resetBtn.addEventListener('click', () => {
    playButtonSound();
    resetGame();
  });
}
if (startBtn) {
  startBtn.addEventListener('click', startGame);
}

resetGame();

function ensureAudio() {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playTone({ frequency = 440, duration = 0.08, type = 'sine', volume = 0.04, slideTo = null, delay = 0 }) {
  if (!audioCtx) return;

  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  const startAt = audioCtx.currentTime + delay;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startAt);

  if (slideTo) {
    oscillator.frequency.exponentialRampToValueAtTime(slideTo, startAt + duration);
  }

  gainNode.gain.setValueAtTime(0.0001, startAt);
  gainNode.gain.exponentialRampToValueAtTime(volume, startAt + 0.015);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  oscillator.start(startAt);
  oscillator.stop(startAt + duration);
}

function playButtonSound() {
  ensureAudio();
  playTone({ frequency: 660, duration: 0.08, type: 'triangle', volume: 0.04, slideTo: 850 });
  playTone({ frequency: 920, duration: 0.06, type: 'sine', volume: 0.03, slideTo: 1100, delay: 0.06 });
}

function playCorrectSound() {
  ensureAudio();
  playTone({ frequency: 520, duration: 0.12, type: 'square', volume: 0.05, slideTo: 800 });
  playTone({ frequency: 760, duration: 0.1, type: 'triangle', volume: 0.03, slideTo: 980, delay: 0.07 });
}

function playWrongSound() {
  ensureAudio();
  playTone({ frequency: 220, duration: 0.08, type: 'sawtooth', volume: 0.025, slideTo: 160 });
}

function playFinishSound() {
  ensureAudio();
  playTone({ frequency: 440, duration: 0.12, type: 'triangle', volume: 0.04, slideTo: 700 });
  playTone({ frequency: 620, duration: 0.14, type: 'sine', volume: 0.04, slideTo: 980, delay: 0.08 });
  playTone({ frequency: 860, duration: 0.16, type: 'triangle', volume: 0.04, slideTo: 1200, delay: 0.16 });
}

function playStartSound() {
  ensureAudio();
  playTone({ frequency: 280, duration: 0.1, type: 'square', volume: 0.03, slideTo: 180 });
  playTone({ frequency: 410, duration: 0.12, type: 'triangle', volume: 0.04, slideTo: 560, delay: 0.12 });
  playTone({ frequency: 620, duration: 0.2, type: 'sine', volume: 0.05, slideTo: 820, delay: 0.24 });
}
