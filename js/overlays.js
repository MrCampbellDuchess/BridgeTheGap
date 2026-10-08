/**
 * Bridge the Gap Arena — Live Overlays & Visual FX Engine
 * Native <dialog> modal controller, particle confetti, screen shake, and warning beacons
 */
window.Arena = window.Arena || {};

window.Arena.Overlays = (function () {
  function confettiCelebration(duration = 2500) {
    if (typeof confetti !== 'function') return;

    const end = Date.now() + duration;
    const colors = ['#00f0ff', '#f59e0b', '#10b981', '#ec4899', '#ffffff'];

    (function frame() {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: colors
      });
      confetti({
        particleCount: 5,
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
    void main.offsetWidth; // Force reflow
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

    msgEl.innerHTML = `<span class="mr-2 text-base">${icon}</span> <span>${message}</span>`;
    toast.classList.remove('translate-y-16', 'opacity-0');

    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.classList.add('translate-y-16', 'opacity-0');
    }, 2800);
  }

  /**
   * Prompts user with native dialog to download competition results as CSV
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

    const dialog = document.getElementById('modalCompetitionCompletePrompt');
    if (!dialog) return;

    const contextEl = document.getElementById('promptModalContext');
    const champEl = document.getElementById('promptModalChampion');
    if (contextEl) contextEl.innerText = `${period} • ${semester}`;
    if (champEl) champEl.innerText = `${championName} (${championSpan}cm)`;

    const dlResultsBtn = document.getElementById('btnPromptDownloadResults');
    const dlLogBtn = document.getElementById('btnPromptDownloadLog');

    if (dlResultsBtn) {
      dlResultsBtn.onclick = () => {
        if (typeof onDownloadResults === 'function') onDownloadResults();
        showToast('Standings CSV Downloaded', '📥');
        dialog.close();
      };
    }

    if (dlLogBtn) {
      dlLogBtn.onclick = () => {
        if (typeof onDownloadLog === 'function') onDownloadLog();
        showToast('Complete Attempt Log CSV Downloaded', '📋');
        dialog.close();
      };
    }

    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    }
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
