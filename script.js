document.addEventListener("DOMContentLoaded", () => {
  const spinBtn = document.getElementById("spinBtn");
  const currentNumberDisplay = document.getElementById("currentNumber");
  const playerContainer = document.getElementById("playerContainer");
  const audioPlayer = document.getElementById("audioPlayer");
  // Auto-spin: when song ends and user selected auto mode, trigger spin
  if (audioPlayer) {
    audioPlayer.addEventListener("ended", () => {
      try {
        const mode = localStorage.getItem("spinMode") || "manual";
        if (mode === "auto") {
          if (spinBtn && !spinBtn.disabled) {
            // small delay to allow UI update after track end
            setTimeout(() => spinBtn.click(), 400);
          }
        }
      } catch (e) {}
    });
  }
  const songTitle = document.getElementById("songTitle");
  const playedNumbersContainer = document.getElementById("playedNumbers");

  // Configuration: maximum number of songs in the library
  // Change this value to adjust the roulette size (can still be overridden by localStorage 'songCount')
  const DEFAULT_SONG_COUNT = 70;

  let playedNumbers = new Set();
  let currentNumber = null;

  // Determine effective song count (allow local override but clamp to DEFAULT_SONG_COUNT)
  let songCount = DEFAULT_SONG_COUNT;
  try {
    const stored = parseInt(localStorage.getItem("songCount"), 10);
    if (!isNaN(stored) && stored > 0)
      songCount = Math.min(stored, DEFAULT_SONG_COUNT);
  } catch (e) {}
  const musicLibrary = Array.from({ length: songCount }, (_, i) => ({
    id: i + 1,
    title: `Трек ${i + 1}`,
    // Prefer local songs directory; files should be named 1.mp3, 2.mp3, ...
    url: `songs/${i + 1}.mp3`,
  }));

  // Restore state
  try {
    const saved = localStorage.getItem("playedNumbers");
    if (saved)
      JSON.parse(saved).forEach((n) => playedNumbers.add(parseInt(n, 10)));
  } catch (e) {}
  // Render any restored played numbers into the UI
  try {
    updatePlayedNumbers();
  } catch (e) {}
  const savedCurrentNumber = localStorage.getItem("currentNumber");
  if (savedCurrentNumber) {
    currentNumber = parseInt(savedCurrentNumber, 10);
    if (currentNumberDisplay) {
      currentNumberDisplay.textContent = currentNumber;
      currentNumberDisplay.classList.remove("animate-pulse");
    }
    const song = musicLibrary.find((t) => t.id === currentNumber);
    if (song) {
      if (songTitle) songTitle.textContent = song.title;
      if (audioPlayer) audioPlayer.src = song.url;
      if (playerContainer) playerContainer.classList.remove("player-hidden");
    }
  }

  // Bingo elements
  let bingoCardEl = document.getElementById("bingoCard");
  let bingoMarkedCount = document.getElementById("bingoMarkedCount");

  const urlParams = new URLSearchParams(window.location.search);
  const cardName = urlParams.get("card");
  let activeCardName = cardName;
  if (!activeCardName && window.location.pathname.endsWith("card.html")) {
    const persisted = localStorage.getItem("bingo:autoCardId");
    if (persisted) activeCardName = persisted;
    else {
      const id =
        "c" +
        Date.now().toString(36) +
        "-" +
        Math.random().toString(36).slice(2, 8);
      activeCardName = id;
      localStorage.setItem("bingo:autoCardId", id);
    }
  }

  function xfnv1a(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
    }
    return h >>> 0;
  }
  function mulberry32(a) {
    return function () {
      var t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function generateCardNumbers(name, count, needed = 25) {
    // Generate a standard 75-ball Bingo card (B I N G O columns)
    const seed = xfnv1a(name || "");
    const rnd = mulberry32(seed);

    function pickUnique(start, end, howMany) {
      const pool = [];
      for (let i = start; i <= end; i++) pool.push(i);
      // Fisher-Yates shuffle using seeded rnd
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        const tmp = pool[i];
        pool[i] = pool[j];
        pool[j] = tmp;
      }
      return pool.slice(0, howMany);
    }

    // Columns ranges for 75-ball bingo
    const colB = pickUnique(1, 15, 5);
    const colI = pickUnique(16, 30, 5);
    const colN = pickUnique(31, 45, 4); // center is FREE
    const colG = pickUnique(46, 60, 5);
    const colO = pickUnique(61, 75, 5);

    const card = [];
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (r === 2 && c === 2) {
          card.push("FREE");
          continue;
        }
        if (c === 0) card.push(colB[r]);
        else if (c === 1) card.push(colI[r]);
        else if (c === 2) card.push(r < 2 ? colN[r] : colN[r - 1]);
        else if (c === 3) card.push(colG[r]);
        else if (c === 4) card.push(colO[r]);
      }
    }
    return card;
  }
  function loadMarks(name) {
    const key = `bingo:marks:${name}`;
    const raw = localStorage.getItem(key);
    if (!raw) {
      const arr = Array(25).fill(false);
      // center is free and marked
      arr[12] = true;
      return arr;
    }
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length === 25) {
        const mapped = arr.map(Boolean);
        mapped[12] = true;
        return mapped;
      }
    } catch (e) {}
    const fallback = Array(25).fill(false);
    fallback[12] = true;
    return fallback;
  }
  function saveMarks(name, marks) {
    const key = `bingo:marks:${name}`;
    localStorage.setItem(key, JSON.stringify(marks));
  }
  function renderBingo(cardNumbers, marks) {
    if (!bingoCardEl) return;
    bingoCardEl.innerHTML = "";
    cardNumbers.forEach((num, idx) => {
      const cell = document.createElement("div");
      cell.className =
        "bingo-cell text-center text-white rounded-lg p-4 flex items-center justify-center flex-col";
      cell.tabIndex = 0;
      cell.setAttribute("role", "gridcell");
      cell.dataset.index = idx;
      if (num === "FREE") {
        cell.dataset.number = "";
        const freeLabel = document.createElement("div");
        freeLabel.className =
          "text-sm opacity-90 flex items-center justify-center";
        freeLabel.innerHTML = '<i data-feather="star" class="free-icon"></i>';
        cell.appendChild(freeLabel);
      } else {
        cell.dataset.number = num;
        const numEl = document.createElement("div");
        numEl.className = "text-xl font-bold";
        numEl.textContent = num;
        cell.appendChild(numEl);
      }
      if (marks[idx]) cell.classList.add("bingo-marked");
      bingoCardEl.appendChild(cell);
    });
    updateMarkedCount(marks);
    try {
      if (typeof feather !== "undefined") feather.replace();
    } catch (e) {}
  }
  function updateMarkedCount(marks) {
    const c = marks.filter(Boolean).length;
    if (bingoMarkedCount) bingoMarkedCount.textContent = `${c}/25`;
  }

  function checkBingo(marks) {
    const achieved = [];

    // Check all rows
    for (let r = 0; r < 5; r++) {
      const offset = r * 5;
      if (marks.slice(offset, offset + 5).every(Boolean))
        achieved.push(`row${r + 1}`);
    }

    // Check all columns
    for (let c = 0; c < 5; c++) {
      const col = [0, 1, 2, 3, 4].map((r) => marks[r * 5 + c]);
      if (col.every(Boolean)) achieved.push(`col${c + 1}`);
    }

    // Check two diagonals
    if ([0, 6, 12, 18, 24].every((i) => marks[i])) achieved.push("diag1");
    if ([4, 8, 12, 16, 20].every((i) => marks[i])) achieved.push("diag2");

    // Full card
    if (marks.every(Boolean)) achieved.push("full");

    return achieved;
  }

  function showBingoWin(type) {
    const modal = document.getElementById("bingoWinModal");
    if (!modal) return;

    // Update message based on type
    const message = modal.querySelector(".bingo-message");
    if (message) {
      message.textContent =
        type === "full" ? "Вы победитель!" : "Вы собрали линию!";
    }

    modal.classList.remove("hidden");
    // Trigger confetti animation
    const confettiContainer = modal.querySelector(".confetti-container");
    if (confettiContainer) {
      confettiContainer.innerHTML = "";
      for (let i = 0; i < 50; i++) {
        const confetti = document.createElement("div");
        confetti.className = "confetti";
        confetti.style.left = Math.random() * 100 + "%";
        confetti.style.animationDelay = Math.random() * 0.5 + "s";
        confetti.style.backgroundColor = [
          "#ff6b6b",
          "#4ecdc4",
          "#45b7d1",
          "#f9ca24",
          "#6c5ce7",
        ][Math.floor(Math.random() * 5)];
        confettiContainer.appendChild(confetti);
      }
    }
  }

  // Small confetti salute (used when clicking the FREE star)
  function showConfetti() {
    const container = document.createElement("div");
    container.className =
      "confetti-container fixed inset-0 pointer-events-none z-50";
    document.body.appendChild(container);
    for (let i = 0; i < 40; i++) {
      const confetti = document.createElement("div");
      confetti.className = "confetti";
      confetti.style.left = Math.random() * 100 + "%";
      confetti.style.animationDelay = Math.random() * 0.5 + "s";
      confetti.style.backgroundColor = [
        "#ff6b6b",
        "#4ecdc4",
        "#45b7d1",
        "#f9ca24",
        "#6c5ce7",
      ][Math.floor(Math.random() * 5)];
      container.appendChild(confetti);
    }
    setTimeout(() => {
      try {
        container.remove();
      } catch (e) {}
    }, 3200);
  }

  if (activeCardName) {
    let cardNumbers, marks;

    try {
      // Use existing #bingoCard and #bingoMarkedCount from static HTML
      cardNumbers = generateCardNumbers(activeCardName, songCount, 25);
      marks = loadMarks(activeCardName);
      renderBingo(cardNumbers, marks);
    } catch (err) {
      console.warn("Bingo initialization failed:", err);
    }

    if (bingoCardEl && typeof marks !== "undefined") {
      bingoCardEl.addEventListener("click", async (e) => {
        const cell = e.target.closest(".bingo-cell");
        if (!cell) return;
        const idx = parseInt(cell.dataset.index, 10);
        // If center FREE cell clicked — show confetti salute
        const cellNumber = cell.dataset.number;
        if (idx === 12) {
          // Animate the free star briefly
          try {
            const icon = cell.querySelector(".free-icon");
            if (icon) {
              icon.classList.remove("free-animate");
              // Force reflow to restart animation
              void icon.offsetWidth;
              icon.classList.add("free-animate");
              icon.addEventListener("animationend", function handler() {
                icon.classList.remove("free-animate");
                icon.removeEventListener("animationend", handler);
              });
            }
          } catch (e) {}
          showConfetti();
          return;
        }
        // Ignore other empty-number cells (safety)
        if (cellNumber === "") return;

        // Determine previously achieved types before this click
        const prevTypes = checkBingo(marks);

        // If this cell is already marked, confirm before unmarking
        if (marks[idx]) {
          const confirmed = await showConfirm(
            "Вы уверены, что хотите сбросить отметку?",
            "Да, сбросить",
            "Отмена"
          );
          if (!confirmed) return;
          marks[idx] = false;
          cell.classList.remove("bingo-marked");
        } else {
          marks[idx] = true;
          cell.classList.add("bingo-marked");
        }

        try {
          saveMarks(activeCardName, marks);
        } catch (err) {
          console.warn("Failed saving bingo marks", err);
        }
        updateMarkedCount(marks);

        // Check for bingo - find types that are NEW after this click
        const bingoTypes = checkBingo(marks);
        const newlyAchieved = bingoTypes.filter((t) => !prevTypes.includes(t));
        if (newlyAchieved.length > 0) {
          const shownKey = `bingo:shown:${activeCardName}`;
          const shownRaw = JSON.parse(localStorage.getItem(shownKey) || "null");

          // Map achievement types to categories: row -> 'row', col -> 'col', diag -> 'diag', full -> 'full'
          const mapToCategory = (t) => {
            if (t === "full") return "full";
            if (t.startsWith("row")) return "row";
            if (t.startsWith("col")) return "col";
            if (t.startsWith("diag")) return "diag";
            return t;
          };

          // Normalize stored value into an object map { row: true, col: true, diag: true, full: true }
          const shownMap = {};
          if (
            shownRaw &&
            typeof shownRaw === "object" &&
            !Array.isArray(shownRaw)
          ) {
            // already a map (new format)
            Object.assign(shownMap, shownRaw);
          } else if (Array.isArray(shownRaw)) {
            // legacy array, convert to categories
            shownRaw.forEach((s) => (shownMap[mapToCategory(s)] = true));
          }

          // Determine newly achieved categories (unique)
          const newlyCats = Array.from(
            new Set(newlyAchieved.map(mapToCategory))
          );
          // Find first category not yet shown
          const newCat = newlyCats.find((cat) => !shownMap[cat]);
          if (newCat) {
            shownMap[newCat] = true;
            localStorage.setItem(shownKey, JSON.stringify(shownMap));
            setTimeout(
              () => showBingoWin(newCat === "full" ? "full" : newCat),
              300
            );
          }
        }
      });
    }

    if (bingoCardEl) {
      bingoCardEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          const cell = e.target.closest(".bingo-cell");
          if (!cell) return;
          cell.click();
          e.preventDefault();
        }
      });
    }
  }

  // Spin wiring
  if (spinBtn) {
    spinBtn.addEventListener("click", () => {
      if (playedNumbers.size === songCount) {
        alert(
          "Все номера уже были сыграны! Обновите страницу, чтобы начать заново."
        );
        return;
      }
      spinBtn.disabled = true;
      spinBtn.innerHTML =
        '<i data-feather="loader" class="animate-spin"></i> Крутим...';
      feather.replace();
      let spins = 0;
      const totalSpins = 30;
      let currentInterval = 20;
      const spin = () => {
        let randomNum;
        do {
          randomNum = Math.floor(Math.random() * songCount) + 1;
        } while (playedNumbers.has(randomNum));
        if (currentNumberDisplay) {
          currentNumberDisplay.textContent = randomNum;
          currentNumberDisplay.classList.add("spinning");
          setTimeout(
            () => currentNumberDisplay.classList.remove("spinning"),
            100
          );
        }
        spins++;
        if (spins >= totalSpins) finishSpin(randomNum);
        else {
          if (spins > totalSpins * 0.6) currentInterval += 8;
          else if (spins > totalSpins * 0.3) currentInterval += 3;
          setTimeout(spin, currentInterval);
        }
      };
      spin();
    });
  }

  // Notification helper (uses #notifyModal if present)
  function showNotification(msg) {
    let modal = document.getElementById("notifyModal");
    if (!modal) {
      // create a minimal modal if not present
      modal = document.createElement("div");
      modal.id = "notifyModal";
      modal.className =
        "hidden fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50";
      modal.innerHTML = `
        <div class="bg-white bg-opacity-10 backdrop-blur-lg rounded-3xl p-6 max-w-sm mx-4 shadow-2xl modal-content">
          <div class="text-center">
            <p id="notifyMessage" class="mb-4"></p>
            <div class="flex justify-center">
              <button id="notifyOk" class="bg-gradient-to-r from-green-500 to-blue-500 text-white font-bold py-2 px-4 rounded-lg">OK</button>
            </div>
          </div>
        </div>`;
      document.body.appendChild(modal);
    }
    const msgEl = modal.querySelector("#notifyMessage");
    if (msgEl) msgEl.textContent = msg;
    modal.classList.remove("hidden");
    const ok = modal.querySelector("#notifyOk");
    const hide = () => modal.classList.add("hidden");
    if (ok) {
      ok.focus();
      const handler = () => {
        hide();
        ok.removeEventListener("click", handler);
      };
      ok.addEventListener("click", handler);
    }
    modal.addEventListener("click", (e) => {
      if (e.target === modal) hide();
    });
  }

  // Confirmation helper that returns a Promise<boolean>
  function showConfirm(message, yesText = "Да, сбросить", noText = "Отмена") {
    return new Promise((resolve) => {
      let modal = document.getElementById("confirmUnmarkModal");
      if (!modal) {
        modal = document.createElement("div");
        modal.id = "confirmUnmarkModal";
        modal.className =
          "hidden fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50";
        modal.innerHTML = `
          <div class="bg-white bg-opacity-10 backdrop-blur-lg rounded-3xl p-8 max-w-md mx-4 shadow-2xl modal-content">
            <div class="text-center mb-6">
              <i data-feather="alert-circle" class="mx-auto mb-4" style="width: 48px; height: 48px; color: #fbbf24;"></i>
              <h3 id="confirmTitle" class="text-2xl font-bold mb-2">Подтверждение</h3>
              <p id="confirmMessage" class="text-lg opacity-90"></p>
            </div>
            <div class="flex gap-4 justify-center">
              <button id="confirmCancel" class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg">${noText}</button>
              <button id="confirmOk" class="bg-gradient-to-r from-green-500 to-blue-500 text-white font-bold py-3 px-6 rounded-lg">${yesText}</button>
            </div>
          </div>`;
        document.body.appendChild(modal);
        try {
          feather.replace();
        } catch (e) {}
      }

      const msgEl = modal.querySelector("#confirmMessage");
      if (msgEl) msgEl.textContent = message;
      const ok = modal.querySelector("#confirmOk");
      const cancel = modal.querySelector("#confirmCancel");
      if (ok) ok.textContent = yesText;
      if (cancel) cancel.textContent = noText;

      modal.classList.remove("hidden");

      const cleanup = () => {
        modal.classList.add("hidden");
        ok.removeEventListener("click", onOk);
        cancel.removeEventListener("click", onCancel);
      };
      const onOk = () => {
        cleanup();
        resolve(true);
      };
      const onCancel = () => {
        cleanup();
        resolve(false);
      };
      ok.addEventListener("click", onOk);
      cancel.addEventListener("click", onCancel);
      modal.addEventListener("click", function handler(e) {
        if (e.target === modal) {
          modal.removeEventListener("click", handler);
          cleanup();
          resolve(false);
        }
      });
    });
  }

  // Bingo win modal close handler
  const bingoWinModal = document.getElementById("bingoWinModal");
  const bingoWinOk = document.getElementById("bingoWinOk");
  if (bingoWinModal && bingoWinOk) {
    bingoWinOk.addEventListener("click", () => {
      bingoWinModal.classList.add("hidden");
    });
    bingoWinModal.addEventListener("click", (e) => {
      if (e.target === bingoWinModal) {
        bingoWinModal.classList.add("hidden");
      }
    });
  }

  function finishSpin(number) {
    currentNumber = number;
    playedNumbers.add(number);
    localStorage.setItem(
      "playedNumbers",
      JSON.stringify(Array.from(playedNumbers))
    );
    localStorage.setItem("currentNumber", number.toString());
    if (currentNumberDisplay) {
      currentNumberDisplay.textContent = number;
      currentNumberDisplay.classList.remove("animate-pulse");
      currentNumberDisplay.classList.add("number-change");
      setTimeout(() => {
        currentNumberDisplay.classList.remove("number-change");
        currentNumberDisplay.classList.add("winner-scale");
        setTimeout(
          () => currentNumberDisplay.classList.remove("winner-scale"),
          600
        );
      }, 200);
    }
    if (playedNumbersContainer) {
      const numberTile = playedNumbersContainer.lastChild;
      if (numberTile) {
        numberTile.classList.add("winner");
        setTimeout(() => numberTile.classList.remove("winner"), 1500);
      }
    }
    let song = musicLibrary.find((t) => t.id === number);
    // If exact song is missing, fall back to the next available by id, or wrap to first
    if (!song) {
      song = musicLibrary.find((t) => t.id > number) || musicLibrary[0] || null;
    }
    if (song && audioPlayer && songTitle && playerContainer) {
      playerContainer.style.opacity = 0;
      setTimeout(() => {
        audioPlayer.pause();
        audioPlayer.currentTime = 0;
        // Play the track that matches the selected roulette number
        audioPlayer.src = song.url;
        audioPlayer.load();
        audioPlayer.setAttribute("autoplay", "");
        songTitle.textContent = song.title;
        playerContainer.classList.remove("player-hidden");
        playerContainer.style.opacity = 1;
        playerContainer.style.transition =
          "opacity 0.5s ease, height 0.3s ease";
        const playPromise = audioPlayer.play();
        if (playPromise !== undefined)
          playPromise.catch((err) => {
            console.error("Playback failed:", err);
            audioPlayer.controls = true;
            songTitle.textContent =
              "Ошибка воспроизведения: нажмите кнопку Play";
          });
      }, 200);
    }
    updatePlayedNumbers();
    if (spinBtn) {
      spinBtn.disabled = false;
      spinBtn.innerHTML = '<i data-feather="play"></i> Крутить снова';
      feather.replace();
    }
  }

  function updatePlayedNumbers() {
    if (!playedNumbersContainer) return;
    playedNumbersContainer.innerHTML = "";
    Array.from(playedNumbers)
      .sort((a, b) => a - b)
      .forEach((num) => {
        const numberTile = document.createElement("div");
        numberTile.className =
          "number-tile bg-purple-600 text-white rounded-lg w-12 h-12 flex items-center justify-center font-bold text-lg";
        numberTile.textContent = num;
        playedNumbersContainer.appendChild(numberTile);
      });
  }

  // Modal handlers
  const confirmModal = document.getElementById("confirmModal");
  const modalConfirm = document.getElementById("modalConfirm");
  const modalCancel = document.getElementById("modalCancel");
  const newGameBtn = document.getElementById("newGameBtn");
  const startGameBtn = document.getElementById("startGameBtn");
  if (newGameBtn && confirmModal)
    newGameBtn.addEventListener("click", () => {
      confirmModal.classList.remove("hidden");
      feather.replace();
    });
  if (modalCancel && confirmModal)
    modalCancel.addEventListener("click", () => {
      confirmModal.classList.add("hidden");
    });
  if (modalConfirm && confirmModal)
    modalConfirm.addEventListener("click", () => {
      confirmModal.classList.add("hidden");
      playedNumbers.clear();
      localStorage.removeItem("playedNumbers");
      localStorage.removeItem("currentNumber");
      updatePlayedNumbers();
      if (currentNumberDisplay) {
        currentNumberDisplay.textContent = "?";
        currentNumberDisplay.classList.add("animate-pulse");
      }
      if (playerContainer) playerContainer.classList.add("player-hidden");
      if (spinBtn) {
        spinBtn.disabled = false;
        spinBtn.innerHTML = '<i data-feather="play"></i> Крутить рулетку';
      }
      feather.replace();
      // After resetting state, navigate back to main page
      try {
        window.location.href = "index.html";
      } catch (e) {}
    });
  if (startGameBtn) {
    startGameBtn.addEventListener("click", () => {
      // clear bingo related data and roulette state then navigate to a fresh card
      const keys = Object.keys(localStorage);
      keys.forEach((k) => {
        if (k.startsWith("bingo:marks:")) localStorage.removeItem(k);
      });
      localStorage.removeItem("bingo:autoCardId");
      localStorage.removeItem("playedNumbers");
      localStorage.removeItem("currentNumber");

      const id =
        "c" +
        Date.now().toString(36) +
        "-" +
        Math.random().toString(36).slice(2, 8);
      // persist the auto id so card.html can pick it up without ?card param if desired
      localStorage.setItem("bingo:autoCardId", id);
      // navigate to card with explicit id to force new card
      window.location.href = "card.html?card=" + encodeURIComponent(id);
    });
  }
  if (confirmModal)
    confirmModal.addEventListener("click", (e) => {
      if (e.target === confirmModal) confirmModal.classList.add("hidden");
    });
});
