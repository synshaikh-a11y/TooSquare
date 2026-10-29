
(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  const statusText = document.getElementById('statusText');
  const canvasTip = document.getElementById('canvasTip');
  const undoBtn = document.getElementById('undoBtn');
  const clearBtn = document.getElementById('clearBtn');
  const checkBtn = document.getElementById('checkBtn');
  const newLoopBtn = document.getElementById('newLoopBtn');
  const tryAgainBtn = document.getElementById('tryAgainBtn');
  const resultPanel = document.getElementById('resultPanel');
  const scoreValue = document.getElementById('scoreValue');
  const resultTitle = document.getElementById('resultTitle');
  const resultDescription = document.getElementById('resultDescription');
  const bestScore = document.getElementById('bestScore');
  const scoreFill = document.getElementById('scoreFill');
  const scoreNote = document.getElementById('scoreNote');
  const dailyTimerSection =document.getElementById('dailyTimerSection');
  const dailyTimerDisplay = document.getElementById('dailyTimer');
  let dailyTimerStartedAt = null;
  let dailyTimerInterval = null;
  let dailyElapsedMs = 0;

  const dailyModeBtn = document.getElementById('gameDailyModeBtn');
  const classicModeBtn = document.getElementById('gameClassicModeBtn');
  const dailyCardScore = document.getElementById('dailyCardScore');
  const modeLabel = document.getElementById('modeLabel');
  const scoreCardLabel = document.getElementById('scoreCardLabel');
  const scoreCardTitle = document.getElementById('scoreCardTitle');
  const dailyStatus = document.getElementById('dailyStatus');
  const dailyLockOverlay = document.getElementById('dailyLockOverlay');
  const switchClassicBtn = document.getElementById('switchClassicBtn');

  const modeScreen = document.getElementById('modeScreen');
  const gamePage = document.getElementById('gamePage');
  const dailyStartBtn = document.getElementById('dailyStartBtn');
  const classicStartBtn = document.getElementById('classicStartBtn');
  const backToModesBtn = document.getElementById('backToModesBtn');

  const W = 900;
  const H = 665;
  const DAILY_KEY_PREFIX = 'toosquare-daily-';

  let loop = [];
  let selected = [];
  let result = null;
  let mode = 'daily';
  let dpr = 1;

  // Use the computer's local calendar date.
  function localDateKey() {
    const d = new Date();

    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function dailyStorageKey() {
    return DAILY_KEY_PREFIX + localDateKey();
  }
  function formatTime(milliseconds) {
  const totalTenths = Math.floor(milliseconds / 100);

  const minutes = Math.floor(totalTenths / 600);
  const seconds = Math.floor((totalTenths % 600) / 10);
  const tenths = totalTenths % 10;

  return (
    String(minutes).padStart(2, '0') + ':' +
    String(seconds).padStart(2, '0') + '.' +
    tenths
  );
}

function updateDailyTimer() {
  if (mode !== 'daily') return;

  const elapsed =
    dailyElapsedMs + (
      dailyTimerStartedAt === null
        ? 0
        : performance.now() - dailyTimerStartedAt
    );

  dailyTimerDisplay.textContent = formatTime(elapsed);
}

function startDailyTimer() {
  if (mode !== 'daily' || dailyTimerStartedAt !== null) {
    return;
  }

  dailyTimerStartedAt = performance.now();

  dailyTimerInterval = setInterval(updateDailyTimer, 100);

  updateDailyTimer();
}

function stopDailyTimer() {
  if (dailyTimerStartedAt !== null) {
    dailyElapsedMs += performance.now() - dailyTimerStartedAt;
    dailyTimerStartedAt = null;
  }

  if (dailyTimerInterval !== null) {
    clearInterval(dailyTimerInterval);
    dailyTimerInterval = null;
  }

  updateDailyTimer();
}

function resetDailyTimer() {
  stopDailyTimer();

  dailyElapsedMs = 0;
  dailyTimerStartedAt = null;

  dailyTimerDisplay.textContent = '00:00.0';
}

  function getDailyRecord() {
    try {
      const record = JSON.parse(
        localStorage.getItem(dailyStorageKey()) || 'null'
      );

      // Only accept a valid record for today's date.
      if (
        record &&
        record.date === localDateKey() &&
        Number.isFinite(record.score)
      ) {
        return record;
      }

      return null;
    } catch {
      return null;
    }
  }

  function saveDailyRecord(record) {
    try {
      localStorage.setItem(
        dailyStorageKey(),
        JSON.stringify(record)
      );
    } catch (error) {
      console.warn('Could not save the daily score.', error);
    }
  }

  function dailyComplete() {
    return !!getDailyRecord();
  }

  // A seeded random generator makes the daily loop repeatable.
  function seededRandom(seed) {
    let value = seed >>> 0;

    return function () {
      value = (value * 1664525 + 1013904223) >>> 0;
      return value / 4294967296;
    };
  }

  function dateSeed() {
    const key = localDateKey().replaceAll('-', '');
    let hash = 2166136261;

    for (const char of key) {
      hash ^= char.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }

    return hash >>> 0;
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();

    if (!rect.width) return;

    DevicePR = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(rect.width * DevicePR);
    canvas.height = Math.round(rect.width * (H / W) * DevicePR);

    draw();
  }

  // Create a new loop.
  function makeLoop() {
    const cx = W / 2;
    const cy = H / 2;
    const rx = 290;
    const ry = 225;

    const random =
      mode === 'daily'
        ? seededRandom(dateSeed())
        : Math.random;

    const phase = random() * Math.PI * 2;
    const count = 1000;

    loop = [];

    for (let i = 0; i < count; i++) {
      const t = (i / count) * Math.PI * 2;

      const r =
        1 +
        0.22 * Math.sin(3 * t + phase) +
        0.14 * Math.cos(5 * t - phase * 0.8) +
        0.07 * Math.sin(2 * t + phase * 1.4) +
        0.045 * Math.cos(7 * t + phase * 0.5);

      loop.push({
        x: cx + rx * r * Math.cos(t),
        y: cy + ry * r * Math.sin(t),
        t
      });
    }

    selected = [];
    result = null;

    resultPanel.hidden = true;

    statusText.textContent = 'Select 4 points on the loop';

    canvasTip.innerHTML =
      '<span class="tip-dot"></span> Click the loop to place point 1 of 4';

    updateModeUI();
    updateControls();
    draw();
  }

  function pointAtCanvas(event) {
    const rect = canvas.getBoundingClientRect();

    return {
      x: ((event.clientX - rect.left) / rect.width) * W,
      y: ((event.clientY - rect.top) / rect.height) * H
    };
  }

  function nearestLoopPoint(point) {
    let best = null;
    let bestDistance = Infinity;

    for (const candidate of loop) {
      const distance = Math.hypot(
        candidate.x - point.x,
        candidate.y - point.y
      );

      if (distance < bestDistance) {
        bestDistance = distance;
        best = candidate;
      }
    }

    return bestDistance < 36
      ? { x: best.x, y: best.y, t: best.t }
      : null;
  }

  function onCanvasClick(event) {
    if (
      result ||
      (mode === 'daily' && dailyComplete()) ||
      selected.length >= 4
    ) {
      return;
    }

    const point = nearestLoopPoint(pointAtCanvas(event));

    if (!point) {
      statusText.textContent = 'Click closer to the loop line';
      return;
    }

    const duplicate = selected.some(
      existing => Math.hypot(
        existing.x - point.x,
        existing.y - point.y
      ) < 24
    );

    if (duplicate) {
      statusText.textContent = 'Choose a different spot on the loop';
      return;
    }

    selected.push(point);
    if (mode === 'daily' && selected.length === 1) 
      {
  startDailyTimer();
}

    statusText.textContent = selected.length < 4
        ? `Point ${selected.length} placed — choose point ${selected.length + 1}`
        : 'Four points placed — score your square';

    canvasTip.innerHTML = selected.length < 4
        ? `<span class="tip-dot"></span> Click the loop to place point ${selected.length + 1} of 4`
        : '<span class="tip-dot"></span> Ready to score your shape';

    updateControls();
    draw();
  }

  function updateControls() {
    const locked = mode === 'daily' && dailyComplete();
//Buttons
    undoBtn.disabled =
      selected.length === 0 || !!result || locked;

    clearBtn.disabled =
      (selected.length === 0 && !result) || locked;

    checkBtn.disabled =
      selected.length !== 4 || !!result || locked;

    newLoopBtn.disabled =
      mode === 'daily' || locked;

    tryAgainBtn.textContent =
      mode === 'daily' ? 'View result' : 'Try again ↻';

    dailyLockOverlay.hidden =
      !(mode === 'daily' && locked && !result);
  }

  function updateModeUI() {
    const record = getDailyRecord();

    dailyModeBtn.classList.toggle('active', mode === 'daily');
    classicModeBtn.classList.toggle('active', mode === 'classic');

    dailyCardScore.textContent = ecord ? `${record.score} / 100` : '— / 100';

    modeLabel.textContent =  mode === 'daily' ? 'DAILY CHALLENGE' : 'CLASSIC MODE';
     
    scoreCardLabel.textContent =  mode === 'daily' ? 'DAILY SCORE' : 'CLASSIC ROUND';

    scoreCardTitle.textContent =
      mode === 'daily' ? "Today's attempt" : 'Current round';

    if (mode === 'daily' && record) 
      {
      bestScore.innerHTML = `${record.score}<small> / 100</small>`;

      scoreFill.style.width = `${record.score}%`;

      scoreNote.textContent = 'Completed today. Your score is saved until midnight.';

      dailyStatus.textContent =
        '✓ Daily attempt used · resets at 12:00 AM';

      if (!result) 
        {
        scoreValue.textContent = record.score;

        resultTitle.textContent =
          record.title || 'Daily challenge complete';

        resultDescription.textContent =
          record.description || 'Your daily score has been saved.';

        resultPanel.hidden = false;
      }
    } else if (mode === 'daily') 
      {
      bestScore.innerHTML = '—<small> / 100</small>';
      scoreFill.style.width = '0%';

      scoreNote.textContent = 'Your daily score will appear here after you submit.';

      dailyStatus.textContent =  'One scored attempt available today';

      if (!result)
         {
        resultPanel.hidden = true;
      }
    } else 
      {
      bestScore.innerHTML = result
        ? `${result.total}<small> / 100</small>`
        : '—<small> / 100</small>';

      scoreFill.style.width = result ? `${result.total}%` : '0%';

      scoreNote.textContent = result
        ? 'This is your current classic round score.'
        : 'Play as many rounds as you like.';

      dailyStatus.textContent =
        'Unlimited rounds · scores are not saved';
    }

    updateControls();
  }

  function switchMode(nextMode) {
    if (mode === nextMode) return;

    mode = nextMode;
    result = null;
    selected = [];
    resultPanel.hidden = true;

    makeLoop();
  }

  // Geometry calculations and scoring.
  function distance(a, b) {
    return Math.hypot(b.x - a.x, b.y - a.y);
  }

  function angleAt(a, b, c) {
    const v1 = { x: a.x - b.x, y: a.y - b.y };
    const v2 = { x: c.x - b.x, y: c.y - b.y };

    const denominator =
      Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y);

    if (!denominator) return 0;

    const cosine = Math.max(
      -1,
      Math.min(
        1,
        (v1.x * v2.x + v1.y * v2.y) / denominator
      )
    );

    return Math.acos(cosine) * 180 / Math.PI;
  }

  function scoreShape() {
    const points = selected;

    const sides = points.map(
      (point, i) => distance(point, points[(i + 1) % 4])
    );

    const mean =
      sides.reduce((sum, side) => sum + side, 0) / 4;

    const sideVariation = Math.sqrt(
      sides.reduce(
        (sum, side) => sum + (side - mean) ** 2,
        0
      ) / 4
    ) / mean;

    const sideScore = Math.max(
      0,
      100 * (1 - sideVariation * 2.7)
    );

    const angles = points.map(
      (point, i) => angleAt(
        points[(i + 3) % 4],
        point,
        points[(i + 1) % 4]
      )
    );

    const averageAngleError = angles.reduce(
      (sum, angle) => sum + Math.abs(angle - 90),
      0
    ) / 4;

    const angleScore = Math.max(
      0,
      100 * (1 - averageAngleError / 75)
    );

    const diagonal1 = distance(points[0], points[2]);
    const diagonal2 = distance(points[1], points[3]);

    const diagonalDifference =
      Math.abs(diagonal1 - diagonal2) /
      Math.max((diagonal1 + diagonal2) / 2, 1);

    const balanceScore = Math.max(
      0,
      100 * (1 - diagonalDifference * 2.5)
    );

    const total = Math.round(
      sideScore * 0.42 +
      angleScore * 0.43 +
      balanceScore * 0.15
    );

    return {
      total,
      sideScore: Math.round(sideScore),
      angleScore: Math.round(angleScore),
      balanceScore: Math.round(balanceScore),
      angles,
      sides
    };
  }

  function showResult() {
    // Enforce one scored attempt in Daily Challenge.
    if (mode === 'daily' && dailyComplete()) {
      updateModeUI();
      return;
    }

    if (selected.length !== 4) return;

    result = scoreShape();
    if (mode === 'daily') 
      {
  stopDailyTimer();
    }

    scoreValue.textContent = result.total;

    bestScore.innerHTML =
      `${result.total}<small> / 100</small>`;

    scoreFill.style.width = `${result.total}%`;

    scoreNote.textContent =
      result.total >= 90
        ? 'Excellent geometry. Almost perfectly square.'
        : result.total >= 70
          ? 'Strong attempt — refine the angles to improve.'
          : 'Keep experimenting and try again.';

    resultTitle.textContent =
      result.total >= 90
        ? 'Geometry genius!'
        : result.total >= 75
          ? 'That’s looking square!'
          : result.total >= 50
            ? 'A good start'
            : 'Keep experimenting';

    const averageAngle = Math.round(
      result.angles.reduce((sum, angle) => sum + angle, 0) / 4
    );

    resultDescription.textContent =
      `Average corner angle: ${averageAngle}°. Side lengths range from ${Math.round(Math.min(...result.sides))} to ${Math.round(Math.max(...result.sides))} canvas units.`;

    resultPanel.hidden = false;

    statusText.textContent =
      'Shape scored — review your result below';

    canvasTip.innerHTML =
      '<span class="tip-dot"></span> Score recorded';

    if (mode === 'daily') {
     saveDailyRecord({
  date: localDateKey(),
  score: result.total,
  title: resultTitle.textContent,
  description: resultDescription.textContent,
  elapsedMs: dailyElapsedMs
});

      dailyCardScore.textContent =
        `${result.total} / 100`;

      dailyStatus.textContent =
        '✓ Daily attempt used · resets at 12:00 AM';

      scoreNote.textContent =
        'Daily score saved in this browser until midnight.';
    }

    updateControls();
    draw();
  }

  function draw() {
    if (!ctx || !canvas.width) return;

    ctx.setTransform(
      canvas.width / W,
      0,
      0,
      canvas.height / H,
      0,
      0
    );

    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = '#170D2B';
    ctx.fillRect(0, 0, W, H);

    // Subtle background dots.
    ctx.fillStyle = '#ffffff0b';

    for (let x = 24; x < W; x += 28) {
      for (let y = 20; y < H; y += 28) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw the loop.
    if (loop.length) {
      ctx.beginPath();

      loop.forEach((point, i) => {
        if (i === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });

      ctx.closePath();

      ctx.strokeStyle = '#D9B6FF18';
      ctx.lineWidth = 14;
      ctx.stroke();

      ctx.strokeStyle = '#D9B6FF';
      ctx.lineWidth = 2.4;
      ctx.stroke();
    }

    // Draw the selected shape.
    if (selected.length) {
      ctx.beginPath();
      ctx.moveTo(selected[0].x, selected[0].y);

      selected.slice(1).forEach(point => {
        ctx.lineTo(point.x, point.y);
      });

      if (selected.length === 4) {
        ctx.closePath();
      }

      ctx.strokeStyle = '#F2C45A';
      ctx.lineWidth = 2.8;
      ctx.lineJoin = 'round';
      ctx.stroke();

      if (selected.length === 4) {
        ctx.fillStyle = '#F2C45A0b';
        ctx.fill();
      }

      // Draw numbered points.
      selected.forEach((point, i) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#F2C45A';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#170D2B';
        ctx.fill();

        ctx.font = '600 13px Poppins, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#170D2B';

        ctx.fillText(String(i + 1), point.x, point.y + 0.5);
      });

      // Show side lengths after scoring.
      if (result) {
        selected.forEach((point, i) => {
          const next = selected[(i + 1) % 4];

          const midpoint = {
            x: (point.x + next.x) / 2,
            y: (point.y + next.y) / 2
          };

          ctx.font = '11px Poppins, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#F2C45A';

          ctx.fillText(
            Math.round(distance(point, next)),
            midpoint.x,
            midpoint.y - 10
          );
        });
      }
    }
  }

  // Game controls.
  canvas.addEventListener('click', onCanvasClick);

  undoBtn.addEventListener('click', () => {
    if (result || (mode === 'daily' && dailyComplete())) return;

    selected.pop();

    statusText.textContent = selected.length
      ? `Point ${selected.length} placed — choose point ${selected.length + 1}`
      : 'Select 4 points on the loop';

    canvasTip.innerHTML =
      `<span class="tip-dot"></span> Click the loop to place point ${selected.length + 1} of 4`;

    updateControls();
    draw();
  });

  clearBtn.addEventListener('click', () => {
    if (mode === 'daily' && dailyComplete()) return;

    selected = [];
    result = null;
    resultPanel.hidden = true;

    statusText.textContent = 'Select 4 points on the loop';

    canvasTip.innerHTML =
      '<span class="tip-dot"></span> Click the loop to place point 1 of 4';

    updateControls();
    draw();
  });

  checkBtn.addEventListener('click', showResult);

  newLoopBtn.addEventListener('click', () => {
    if (mode === 'classic') {
      makeLoop();
    }
  });

  tryAgainBtn.addEventListener('click', () => {
    if (mode === 'daily' && dailyComplete()) {
      updateModeUI();
      return;
    }

    if (mode === 'classic') {
      // Classic Mode can be replayed without limits.
      makeLoop();
      return;
    }

    selected = [];
result = null;

resetDailyTimer();

dailyTimerSection.hidden = mode !== 'daily';

if (mode === 'daily')
   {
  const savedRecord = getDailyRecord();

  if (savedRecord && Number.isFinite(savedRecord.elapsedMs)) 
    {
    dailyElapsedMs = savedRecord.elapsedMs;
    dailyTimerDisplay.textContent =
      formatTime(dailyElapsedMs);
  }
}
    resultPanel.hidden = true;

    statusText.textContent = 'Select 4 points on the loop';

    canvasTip.innerHTML =
      '<span class="tip-dot"></span> Click the loop to place point 1 of 4';

    updateControls();
    draw();
  });

  // Mode selection and navigation.
  function startGame(selectedMode) 
  {
    mode = selectedMode;

    modeScreen.hidden = true;
    gamePage.hidden = false;

    makeLoop();

    requestAnimationFrame(resize);
  }

  dailyStartBtn.addEventListener('click', () => {
    startGame('daily');
  });

  classicStartBtn.addEventListener('click', () => {
    startGame('classic');
  });

  backToModesBtn.addEventListener('click', event => {
    event.preventDefault();

    gamePage.hidden = true;
    modeScreen.hidden = false;
  });

  dailyModeBtn.addEventListener('click', () => {
    switchMode('daily');
  });

  classicModeBtn.addEventListener('click', () => {
    switchMode('classic');
  });

  switchClassicBtn.addEventListener('click', () => {
    switchMode('classic');
  });

  window.addEventListener('resize', resize);

  // Refresh daily state if the page remains open past midnight.
  let lastDate = localDateKey();

  window.setInterval(() => {
    const now = localDateKey();

    if (now !== lastDate) {
      lastDate = now;

      if (mode === 'daily') {
        makeLoop();
      } else {
        updateModeUI();
      }
    }
  }, 15000);

  // Do not start the game until a mode is selected.
  updateModeUI();
})();
