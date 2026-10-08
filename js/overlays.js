/**
 * Bridge the Gap Arena — Live Overlays & Visual FX Engine
 * Handles confetti cannons, screen shake, sudden death beacons, toasts, and completion prompts
 */
window.Arena = window.Arena || {};

window.Arena.Overlays = (function () {
  function confettiCelebration(duration = 2000) {
    if (typeof confetti !== 'function') return;

    const end = Date.now() + duration;
    const colors = ['#00f0ff', '#f59e0b', '#10b981', '#ec4899', '#ffffff'];

    (function frame() {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: colors
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: colors
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  }

  function screenShake() {
    const main = document.querySelector('main') || document.body;
    main.classList.remove('shake-effect');
    void main.offsetWidth; // Trigger reflow
    main.classList.add('shake-effect');
    setTimeout(() => main.classList.remove('shake-effect'), 400);
  }

  function flashGold() {
    let flash = document.getElementById('recordFlashOverlay');
    if (!flash) {
      flash = document.createElement('div');
      flash.id = 'recordFlashOverlay';
      flash.className = 'fixed inset-0 pointer-events-none z-50 bg-amber-400/30';
      document.body.appendChild(flash);
    }
    flash.classList.remove('gold-flash');
    void flash.offsetWidth;
    flash.classList.add('gold-flash');
  }

  function triggerSiren(active) {
    let beacon = document.getElementById('sirenBeaconOverlay');
    if (!beacon) {
      beacon = document.createElement('div');
      beacon.id = 'sirenBeaconOverlay';
      beacon.className = 'fixed inset-0 pointer-events-none z-40 border-8 border-rose-500/40 hidden';
      document.body.appendChild(beacon);
    }
    if (active) {
      beacon.classList.remove('hidden');
      beacon.classList.add('siren-active');
    } else {
      beacon.classList.add('hidden');
      beacon.classList.remove('siren-active');
    }
  }

  function showToast(message, icon = '✅') {
    const toast = document.getElementById('toast');
    const msgEl = document.getElementById('toastMsg');
    if (!toast || !msgEl) return;

    msgEl.innerHTML = `<span class="mr-2">${icon}</span> ${message}`;
    toast.classList.remove('translate-y-16', 'opacity-0');

    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.classList.add('translate-y-16', 'opacity-0');
    }, 2800);
  }

  /**
   * Prompts user with dedicated modal to download the competition results as CSV
   */
  function showCompetitionCompletePrompt(options = {}) {
    const {
      championName = 'Unknown',
      championSpan = 0,
      period = 'Period',
      semester = 'Current',
      onDownloadResults,
      onDownloadLog
    } = options;

    let modal = document.getElementById('modalCompetitionCompletePrompt');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modalCompetitionCompletePrompt';
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-content text-center p-6 sm:p-8 border-2 border-cyan-400 shadow-[0_0_50px_rgba(0,240,255,0.3)]">
          <div class="text-5xl animate-bounce mb-2">🏁</div>
          <div class="text-xs font-mono text-cyan-400 font-bold tracking-widest uppercase">COMPETITION FINISHED</div>
          <h2 class="text-3xl sm:text-4xl font-display font-black text-white mt-2 uppercase tracking-wide">
            Save Official Results?
          </h2>
          <p class="text-xs sm:text-sm text-slate-300 font-mono mt-2">
            Flight concluded for <span class="text-amber-300 font-bold" id="promptModalContext">${period} • ${semester}</span>.<br>
            Champion: <span class="text-emerald-400 font-bold" id="promptModalChampion">${championName} (${championSpan}cm)</span>
          </p>
          <div class="p-3 my-4 bg-arena-950 rounded-xl border border-arena-border text-left text-xs font-mono text-slate-300">
            <div class="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Recommended Action</div>
            Download the finalized CSV standings to preserve student scores and grading ledger.
          </div>
          <div class="flex flex-col gap-2.5 w-full">
            <button id="btnPromptDownloadResults" class="btn-primary bg-cyan-400 hover:bg-cyan-300 text-black py-3 text-sm flex items-center justify-center gap-2">
              📥 Download Standings Results (.csv)
            </button>
            <button id="btnPromptDownloadLog" class="btn-nav justify-center py-2 text-xs text-slate-300 hover:text-white">
              📋 Download Full Attempt Log (.csv)
            </button>
            <button id="btnPromptDismiss" class="mt-2 text-xs font-mono text-slate-500 hover:text-slate-300 transition">
              Dismiss / Review Arena Board
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      modal.querySelector('#btnPromptDismiss').onclick = () => {
        modal.classList.add('hidden');
      };
    }

    // Update dynamic text
    const contextEl = modal.querySelector('#promptModalContext');
    const champEl = modal.querySelector('#promptModalChampion');
    if (contextEl) contextEl.innerText = `${period} • ${semester}`;
    if (champEl) champEl.innerText = `${championName} (${championSpan}cm)`;

    // Wire callbacks
    const dlResultsBtn = modal.querySelector('#btnPromptDownloadResults');
    const dlLogBtn = modal.querySelector('#btnPromptDownloadLog');

    dlResultsBtn.onclick = () => {
      if (typeof onDownloadResults === 'function') onDownloadResults();
      showToast('Standings CSV Downloaded', '📥');
      modal.classList.add('hidden');
    };

    dlLogBtn.onclick = () => {
      if (typeof onDownloadLog === 'function') onDownloadLog();
      showToast('Full Option A Log CSV Downloaded', '📋');
      modal.classList.add('hidden');
    };

    modal.classList.remove('hidden');
  }

  return {
    confettiCelebration,
    screenShake,
    flashGold,
    triggerSiren,
    showToast,
    showCompetitionCompletePrompt
  };
})();
