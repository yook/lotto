document.addEventListener("DOMContentLoaded", () => {
  const spinBtn = document.getElementById("spinBtn");
  const currentNumberDisplay = document.getElementById("currentNumber");
  const playerContainer = document.getElementById("playerContainer");
  const audioPlayer = document.getElementById("audioPlayer");
  const songTitle = document.getElementById("songTitle");
  const playedNumbersContainer = document.getElementById("playedNumbers");

  let playedNumbers = new Set();
  let currentNumber = null;

  const songCount = parseInt(localStorage.getItem("songCount")) || 100;
  const musicLibrary = Array.from({ length: songCount }, (_, i) => ({
    id: i + 1,
    title: `Трек ${i + 1}`,
    url: `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${
      (i % 10) + 1
    }.mp3`,
  }));

  // Restore state
  try {
    const saved = localStorage.getItem("playedNumbers");
    if (saved) JSON.parse(saved).forEach((n) => playedNumbers.add(n));
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
  let bingoPanel = document.getElementById("bingoPanel");
  let bingoCardEl = document.getElementById("bingoCard");
  let bingoMarkedCount = document.getElementById("bingoMarkedCount");
  let bingoResetBtn = document.getElementById("bingoResetBtn");
  let bingoShareBtn = document.getElementById("bingoShareBtn");

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
    const seed = xfnv1a(name || "");
    const rnd = mulberry32(seed);
    const set = new Set();
    while (set.size < Math.min(needed, count)) {
      set.add(Math.floor(rnd() * count) + 1);
      if (set.size >= count) break;
    }
    if (set.size < needed) {
      for (let i = 1; i <= count && set.size < needed; i++) set.add(i);
    }
    return Array.from(set).slice(0, needed);
  }
  function loadMarks(name) {
    const key = `bingo:marks:${name}`;
    const raw = localStorage.getItem(key);
    if (!raw) return Array(25).fill(false);
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length === 25) return arr.map(Boolean);
    } catch (e) {}
    return Array(25).fill(false);
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
        "bingo-cell bingo-number text-center text-white rounded-lg p-2";
      cell.tabIndex = 0;
      cell.setAttribute("role", "gridcell");
      cell.dataset.index = idx;
      cell.dataset.number = num;
      cell.textContent = num;
      if (marks[idx]) cell.classList.add("bingo-marked");
      bingoCardEl.appendChild(cell);
    });
    updateMarkedCount(marks);
  }
  function updateMarkedCount(marks) {
    const c = marks.filter(Boolean).length;
    if (bingoMarkedCount) bingoMarkedCount.textContent = `${c}/25`;
  }

  if (activeCardName) {
    let cardNumbers, marks;

    try {
      if (!bingoPanel) {
        const panel = document.createElement("div");
        panel.id = "bingoPanel";
        panel.className = "bg-white bg-opacity-5 rounded-2xl p-4 mb-6";
        const container =
          document.querySelector("main .container") ||
          document.querySelector("main") ||
          document.body;
        container.insertBefore(panel, container.firstChild);
        bingoPanel = panel;
      }

      if (!bingoCardEl) {
        const grid = document.createElement("div");
        grid.id = "bingoCard";
        grid.className = "grid grid-cols-5 gap-2";
        bingoPanel.appendChild(grid);
        bingoCardEl = grid;
      }

      if (!bingoMarkedCount) {
        const sc = document.createElement("span");
        sc.id = "bingoMarkedCount";
        sc.className = "text-sm opacity-80";
        sc.textContent = "0/25";
        const header = bingoPanel.querySelector("h3");
        if (header && header.parentElement)
          header.parentElement.appendChild(sc);
        else bingoPanel.insertBefore(sc, bingoPanel.firstChild);
        bingoMarkedCount = sc;
      }

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

    if (bingoResetBtn) {
      bingoResetBtn.addEventListener("click", () => {
        if (!confirm("Сбросить отметки на этой карточке?")) return;
        const newMarks = Array(25).fill(false);
        saveMarks(activeCardName, newMarks);
        renderBingo(cardNumbers, newMarks);
      });
    }

    if (bingoShareBtn) {
      bingoShareBtn.addEventListener("click", async () => {
        const base = window.location.origin + window.location.pathname;
        const url = base + "?card=" + encodeURIComponent(activeCardName);

        try {
          await navigator.clipboard.writeText(url);
          showNotification("Ссылка скопированна");
        } catch (err) {
          const ta = document.createElement("textarea");
          ta.value = url;
          document.body.appendChild(ta);
          ta.select();
          try {
            document.execCommand("copy");
            showNotification("Ссылка скопированна");
          } finally {
            ta.remove();
          }
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
    const song = musicLibrary.find((t) => t.id === number);
    if (song && audioPlayer && songTitle && playerContainer) {
      playerContainer.style.opacity = 0;
      setTimeout(() => {
        audioPlayer.pause();
        audioPlayer.currentTime = 0;
        audioPlayer.src =
          "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
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
