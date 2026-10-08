/**
 * Bridge the Gap Arena — Main Bootstrap & Coordination Script
 */
window.Arena = window.Arena || {};

window.Arena.App = (function () {
  function start() {
    // Load state from local storage or defaults
    window.Arena.State.load();

    // Setup UI event listeners
    window.Arena.UI.initEventListeners();

    // Initial render
    window.Arena.UI.render();

    console.log(
      '%c🌉 Bridge the Gap Arena Engine Initialized',
      'color: #00f0ff; font-weight: bold; font-size: 14px;'
    );
  }

  // Auto-start on DOMContentLoaded or immediate if already loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  return { start };
})();
