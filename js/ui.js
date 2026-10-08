/**
 * Bridge the Gap Arena — UI Renderer & Event Controller
 * Modular controller managing DOM elements, rendering pipelines, modal workflows, and hotkeys
 */
window.Arena = window.Arena || {};

window.Arena.UI = (function () {
  const State = window.Arena.State;
  const Audio = window.Arena.Audio;
  const Overlays = window.Arena.Overlays;

  function clearAutoTimer() {
    if (State.tmr) clearTimeout(State.tmr);
    State.tmr = null;
    State.pendGap = null;
    const banner = document.getElementById('autoAdvanceBanner');
    if (banner) banner.classList.add('hidden');
    const bar = document.getElementById('autoAdvanceProgressBar');
    if (bar) bar.classList.remove('animate-countdown');
  }

  function showAutoAdvanceBanner(msg) {
    const msgEl = document.getElementById('autoAdvanceMsg');
    const banner = document.getElementById('autoAdvanceBanner');
    const bar = document.getElementById('autoAdvanceProgressBar');

    if (msgEl) msgEl.innerText = msg;
    if (banner) banner.classList.remove('hidden');
    if (bar) {
      bar.classList.remove('animate-countdown');
      void bar.offsetWidth;
      bar.classList.add('animate-countdown');
    }
  }

  function execAdvance(targetGap) {
    clearAutoTimer();
    State.cfg.gap = targetGap;
    State.save();
    Audio.adv();
    render();
    Overlays.showToast(`Gap advanced to ${targetGap}cm`, '🚀');
  }

  function checkAutoAdvance() {
    clearAutoTimer();
    const bots = State.getBots(x => x.sem === State.cfg.sem && x.per === State.cfg.per);
    const curGap = State.cfg.gap;
    if (bots.length === 0) return;

    // Eligible bots are those still alive or failed at this exact round
    const eligible = bots.filter(x => !x.fail || x.fDist === curGap);
    if (eligible.length === 0) return;

    // Any bot that hasn't made an attempt at curGap yet?
    const unattempted = eligible.filter(
      x => !x.atts.some(a => a.dist === curGap && a.res !== 'READY')
    );
    if (unattempted.length > 0) return;

    // Check survivors who passed curGap
    const passed = eligible.filter(x =>
      x.atts.some(a => a.dist === curGap && a.res === 'PASS')
    );

    if (passed.length > 1) {
      State.pendGap = curGap + State.cfg.step;
      if (State.cfg.auto) {
        showAutoAdvanceBanner(`All attempts logged. Advancing to ${State.pendGap}cm...`);
        State.tmr = setTimeout(() => execAdvance(State.pendGap), 2000);
      }
    } else if (passed.length === 1) {
      State.pendGap = curGap + State.cfg.step;
      if (State.cfg.auto) {
        showAutoAdvanceBanner(`Sole survivor! Entering Sudden Death (${State.pendGap}cm)...`);
        State.tmr = setTimeout(() => {
          execAdvance(State.pendGap);
          Audio.alert();
          Overlays.triggerSiren(true);
        }, 2000);
      }
    } else {
      // All failed at this gap — tournament flight is complete!
      Audio.fail();
      Overlays.screenShake();
      Overlays.showToast('All failed. Tournament flight concluded.', '🏁');

      const champ = eligible.sort((a, b) => b.max - a.max)[0];
      if (champ) {
        setTimeout(() => {
          crownChampion(champ, champ.max >= State.getRec().d);
        }, 500);
      }
    }
  }

  function logAttempt(name, dist, res) {
    State.db = State.db.filter(
      a =>
        !(
          a.sem === State.cfg.sem &&
          a.per === State.cfg.per &&
          a.name === name &&
          (a.res === 'READY' || a.dist === dist)
        )
    );

    State.db.push({
      sem: State.cfg.sem,
      per: State.cfg.per,
      name,
      dist,
      res,
      ts: new Date().toLocaleTimeString()
    });

    const isRec = res === 'PASS' && dist > State.getRec().d;
    State.save();
    render();

    if (isRec) {
      Audio.fanfare();
      Overlays.flashGold();
      Overlays.confettiCelebration(3000);
      Overlays.showToast('💥 NEW ALL-TIME RECORD!', '👑');
    } else if (res === 'PASS') {
      Audio.pass();
      Overlays.showToast('CLEARED', '✓');
    } else {
      Audio.fail();
      Overlays.screenShake();
      Overlays.showToast('STRUCTURAL FAILURE', '✗');
    }

    checkAutoAdvance();
  }

  function crownChampion(bot, isRecord) {
    const crownModal = document.getElementById('modalCrown');
    const crownName = document.getElementById('crownName');
    const crownDist = document.getElementById('crownDist');
    const crownStatus = document.getElementById('crownStatus');
    const banner = document.getElementById('tournamentCompleteBanner');

    if (crownName) crownName.innerText = bot.name;
    if (crownDist) crownDist.innerText = bot.max + 'cm';
    if (crownStatus) crownStatus.innerText = isRecord ? 'APEX RECORD' : 'CHAMPION';

    if (crownModal) crownModal.classList.remove('hidden');
    if (banner) banner.classList.remove('hidden');

    Audio.crown();
    Overlays.confettiCelebration(3500);

    // Prompt user to download CSV if enabled
    if (State.cfg.promptCsvOnEnd) {
      setTimeout(() => {
        Overlays.showCompetitionCompletePrompt({
          championName: bot.name,
          championSpan: bot.max,
          period: State.cfg.per,
          semester: State.cfg.sem,
          onDownloadResults: () => State.downloadStandingsCSV(),
          onDownloadLog: () => State.downloadAttemptLogCSV()
        });
      }, 1200);
    }
  }

  function render() {
    const b = State.getBots(x => x.sem === State.cfg.sem && x.per === State.cfg.per);
    const inHunt = b.filter(x => !x.fail);
    const elim = b.filter(x => x.fail);

    // Semester Selector
    const sems = Array.from(new Set(State.db.map(x => x.sem).concat([State.cfg.sem]))).sort();
    const selSemester = document.getElementById('selSemester');
    if (selSemester) {
      selSemester.innerHTML = sems
        .map(s => `<option value="${s}" ${s === State.cfg.sem ? 'selected' : ''}>${s}</option>`)
        .join('');
    }

    // Period selector
    let pHtml = '';
    for (let i = 1; i <= State.cfg.nPer; i++) {
      const pn = `Period ${i}`;
      pHtml += `
        <button onclick="Arena.UI.selectPeriod('${pn}')" class="px-3 py-1 rounded-lg text-xs font-bold transition ${
          pn === State.cfg.per ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:bg-slate-800'
        }">${pn.replace('Period ', 'P')}</button>
      `;
    }
    const perSelector = document.getElementById('periodSelector');
    if (perSelector) {
      perSelector.innerHTML = pHtml;
      perSelector.style.display = State.cfg.nPer === 1 ? 'none' : 'inline-flex';
    }

    const soloBadge = document.getElementById('soloBadge');
    if (soloBadge) {
      soloBadge.style.display = State.cfg.nPer === 1 ? 'inline-block' : 'none';
    }

    // Rule Lock Indicator
    const isLocked = State.db.some(
      x => x.sem === State.cfg.sem && x.per === State.cfg.per && x.res !== 'READY'
    );
    const ruleConfigPill = document.getElementById('ruleConfigPill');
    const ruleLockBadge = document.getElementById('ruleLockBadge');
    const navSettingsBadge = document.getElementById('navSettingsBadge');
    if (ruleConfigPill) ruleConfigPill.innerText = isLocked ? '🔒 Locked' : '🔓 Editable';
    if (ruleLockBadge) ruleLockBadge.innerText = isLocked ? 'Locked' : 'Editable';
    if (navSettingsBadge) navSettingsBadge.style.display = isLocked ? 'inline' : 'none';

    ['setPer', 'setInit', 'setStep'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.disabled = isLocked;
    });

    // Round metrics
    const currentGap = document.getElementById('uiCurrentGap');
    const initGap = document.getElementById('uiInitGap');
    const stepEl = document.getElementById('uiStep');
    const roundNum = document.getElementById('uiRoundNum');
    const advLabel = document.getElementById('btnAdvLabel');
    const btnResetGapEl = document.getElementById('uiBtnResetGap');
    const aliveCount = document.getElementById('uiAliveCount');
    const elimCount = document.getElementById('uiElimCount');
    const queueBadge = document.getElementById('queueBadge');

    if (currentGap) currentGap.innerText = State.cfg.gap;
    if (initGap) initGap.innerText = State.cfg.init;
    if (stepEl) stepEl.innerText = State.cfg.step;
    if (roundNum) {
      roundNum.innerText = Math.max(
        1,
        Math.floor((State.cfg.gap - State.cfg.init) / State.cfg.step) + 1
      );
    }
    if (advLabel) advLabel.innerText = `+${State.cfg.step}cm`;
    if (btnResetGapEl) btnResetGapEl.innerText = State.cfg.init;
    if (aliveCount) aliveCount.innerText = inHunt.length;
    if (elimCount) elimCount.innerText = elim.length;
    if (queueBadge) queueBadge.innerText = `${inHunt.length} In Hunt`;

    // Apex Benchmark
    const rec = State.getRec();
    const benchDist = document.getElementById('uiBenchDist');
    const benchHolder = document.getElementById('uiBenchHolder');
    const benchMode = document.getElementById('uiBenchMode');
    const thRecord = document.getElementById('thRecord');

    if (benchDist) benchDist.innerHTML = `${rec.d}<span class="text-lg">cm</span>`;
    if (benchHolder) benchHolder.innerText = rec.n;
    if (benchMode) benchMode.innerText = rec.m;
    if (thRecord) thRecord.innerText = rec.d;

    // Rules Summary Card
    const rcInit = document.getElementById('rcInit');
    const rcStep = document.getElementById('rcStep');
    const rcPer = document.getElementById('rcPer');
    if (rcInit) rcInit.innerText = State.cfg.init;
    if (rcStep) rcStep.innerText = `+${State.cfg.step}`;
    if (rcPer) rcPer.innerText = State.cfg.nPer;

    // Render Queue Cards
    const qList =
      State.cfg.qFilt === 'active' ? inHunt : State.cfg.qFilt === 'elim' ? elim : b;
    const qc = document.getElementById('queueCards');
    const qEmpty = document.getElementById('queueEmpty');

    if (qc) {
      qc.innerHTML = '';
      if (qList.length === 0) {
        if (qEmpty) qEmpty.classList.remove('hidden');
      } else {
        if (qEmpty) qEmpty.classList.add('hidden');
        qList.forEach((x, i) => {
          const cur = x.atts.find(a => a.dist === State.cfg.gap && a.res !== 'READY');
          const bdg = x.fail
            ? `<span class="text-[10px] bg-rose-950 text-rose-300 px-2 rounded">ELIM at ${x.fDist}cm</span>`
            : cur
            ? `<span class="text-[10px] bg-emerald-950 text-emerald-300 px-2 rounded">CLEARED ${State.cfg.gap}cm</span>`
            : `<span class="text-[10px] bg-amber-950 text-amber-300 px-2 rounded animate-pulse">Up to Span (${State.cfg.gap}cm)</span>`;
          const topClass =
            i === 0 && State.cfg.qFilt === 'active' && !x.fail
              ? 'ring-2 ring-cyan-500 shadow-[0_0_15px_rgba(0,240,255,0.2)]'
              : '';

          let html = `
            <div class="bg-arena-950 border border-arena-border p-4 rounded-xl flex flex-col sm:flex-row justify-between gap-3 ${topClass}">
              <div>
                <div class="flex items-center gap-2"><b class="text-white">${x.name}</b>${bdg}</div>
                <div class="text-xs text-slate-400 mt-1">Best: <b class="text-emerald-400">${x.max}cm</b></div>
              </div>
              <div class="flex gap-2">
          `;

          if (!x.fail) {
            html += `
              <button onclick="Arena.UI.logAttempt('${x.name}', ${State.cfg.gap}, 'PASS')" class="px-3 py-1.5 rounded bg-emerald-900/50 hover:bg-emerald-500 text-emerald-300 hover:text-black font-bold text-xs transition">✓ Clear</button>
              <button onclick="Arena.UI.logAttempt('${x.name}', ${State.cfg.gap}, 'FAIL')" class="px-3 py-1.5 rounded bg-rose-900/50 hover:bg-rose-500 text-rose-300 hover:text-white font-bold text-xs transition">✗ Fail</button>
            `;
          } else {
            html += `
              <button onclick="Arena.UI.undoFail('${x.name}')" class="px-2 py-1 rounded bg-slate-800 text-[10px] text-slate-300">Undo</button>
            `;
          }
          html += `
              <button onclick="Arena.UI.removeBot('${x.name}')" class="px-2 py-1 text-slate-500 hover:text-rose-400">✕</button>
            </div>
          </div>`;
          qc.innerHTML += html;
        });
      }
    }

    // Queue filter buttons
    document.querySelectorAll('.q-btn').forEach(btn => {
      btn.className =
        btn.dataset.q === State.cfg.qFilt
          ? 'q-btn px-3 py-1 rounded bg-arena-800 text-white'
          : 'q-btn px-3 py-1 rounded text-slate-400';
    });

    // Sudden Death Banner
    const sdBan = document.getElementById('suddenDeathBanner');
    if (inHunt.length === 1 && b.length > 1) {
      if (sdBan) {
        sdBan.classList.remove('hidden');
        sdBan.classList.add('flex');
      }
      State.sdBot = inHunt[0];
      const sdBotName = document.getElementById('sdBotName');
      const sdTargetGap = document.getElementById('sdTargetGap');
      const sdBestSpan = document.getElementById('sdBestSpan');
      const sdRecord = document.getElementById('sdRecord');
      const sdClearLabel = document.getElementById('sdClearLabel');

      if (sdBotName) sdBotName.innerText = State.sdBot.name;
      if (sdTargetGap) sdTargetGap.innerText = State.cfg.gap;
      if (sdBestSpan) sdBestSpan.innerText = State.sdBot.max;
      if (sdRecord) sdRecord.innerText = rec.d;
      if (sdClearLabel) sdClearLabel.innerText = `(${State.cfg.gap}cm)`;
      Overlays.triggerSiren(true);
    } else {
      if (sdBan) {
        sdBan.classList.remove('flex');
        sdBan.classList.add('hidden');
      }
      State.sdBot = null;
      Overlays.triggerSiren(false);
    }

    // Side Stats (Solo vs Clash)
    const multiCard = document.getElementById('multiCard');
    const singleCard = document.getElementById('singleCard');
    if (State.cfg.nPer === 1) {
      if (multiCard) multiCard.classList.add('hidden');
      if (singleCard) singleCard.classList.remove('hidden');
      const clr = b.filter(x => x.max > 0);
      const soloAvg = document.getElementById('soloAvg');
      const soloRate = document.getElementById('soloRate');
      if (soloAvg) {
        soloAvg.innerText = clr.length
          ? (clr.reduce((acc, x) => acc + x.max, 0) / clr.length).toFixed(1)
          : 0;
      }
      if (soloRate) {
        soloRate.innerText = b.length
          ? Math.round((clr.length / b.length) * 100) + '%'
          : '0%';
      }
    } else {
      if (multiCard) multiCard.classList.remove('hidden');
      if (singleCard) singleCard.classList.add('hidden');
      const allBots = State.getBots(x => x.sem === State.cfg.sem);
      const cg = document.getElementById('clashGrid');
      const cb = document.getElementById('clashBar');
      if (cg && cb) {
        cg.innerHTML = '';
        cb.innerHTML = '';
        const colors = ['bg-cyan-500', 'bg-purple-500', 'bg-amber-500', 'bg-emerald-500'];
        const pAvg = [];
        for (let i = 1; i <= State.cfg.nPer; i++) {
          const pb = allBots.filter(x => x.per === `Period ${i}`);
          const clr = pb.filter(x => x.max > 0);
          const avg = clr.length ? clr.reduce((acc, x) => acc + x.max, 0) / clr.length : 0;
          pAvg.push({ p: `P${i}`, a: avg, c: colors[i - 1] });
          cg.innerHTML += `
            <div class="bg-black/30 p-2 border border-arena-border rounded-xl">
              <div class="text-[10px] text-slate-400">P${i}</div>
              <div class="text-xl font-display font-bold text-white">${avg.toFixed(1)}</div>
            </div>`;
        }
        const tAvg = pAvg.reduce((sum, x) => sum + x.a, 0);
        cb.innerHTML =
          tAvg > 0
            ? pAvg.map(x => `<div class="${x.c} h-full" style="width:${(x.a / tAvg) * 100}%"></div>`).join('')
            : '<div class="bg-slate-800 w-full h-full"></div>';
        const srt = [...pAvg].sort((a1, b1) => b1.a - a1.a);
        const clashBadge = document.getElementById('clashBadge');
        if (clashBadge) {
          clashBadge.innerText =
            srt[0].a > (srt[1]?.a || 0)
              ? `${srt[0].p} Leads (+${(srt[0].a - (srt[1]?.a || 0)).toFixed(1)})`
              : 'Tie';
        }
      }
    }

    // Survival Matrix
    const matrixScope = document.getElementById('matrixScope');
    const mScope = matrixScope ? matrixScope.value : 'current';
    const mBots = mScope === 'current' ? b : State.getBots();
    mBots.sort((a, b1) => b1.max - a.max);

    const dSet = new Set();
    mBots.forEach(x => x.atts.forEach(a => { if (a.res !== 'READY') dSet.add(a.dist); }));
    for (let i = State.cfg.init; i <= State.cfg.gap; i += State.cfg.step) dSet.add(i);
    const dists = Array.from(dSet).sort((a, b1) => a - b1);

    const mh = document.getElementById('matrixHead');
    const mb = document.getElementById('matrixBody');
    if (mh && mb) {
      mh.innerHTML = `<tr><th class="p-2 sticky left-0 bg-arena-900 z-10">Robot</th>${dists
        .map(
          d =>
            `<th class="p-2 text-center ${
              d === State.cfg.gap && mScope === 'current' ? 'text-cyan-400' : ''
            }">${d}</th>`
        )
        .join('')}</tr>`;

      mb.innerHTML =
        mBots
          .map(
            x => `<tr>
              <td class="p-2 sticky left-0 bg-arena-950 z-10 truncate max-w-[120px] ${
                x.fail ? 'text-slate-500' : ''
              }">${x.name}</td>
              ${dists
                .map(d => {
                  const a = x.atts.find(y => y.dist === d && y.res !== 'READY');
                  return `<td class="p-1 text-center ${
                    d === State.cfg.gap && mScope === 'current' ? 'bg-cyan-500/10' : ''
                  }">${
                    a
                      ? a.res === 'PASS'
                        ? '<span class="text-emerald-400 font-bold">✓</span>'
                        : '<span class="text-rose-400 font-bold">✗</span>'
                      : '<span class="text-slate-700">·</span>'
                  }</td>`;
                })
                .join('')}
            </tr>`
          )
          .join('') || `<tr><td colspan="99" class="p-4 text-center">No data</td></tr>`;
    }

    // Leaderboard Standings
    const sScope = State.cfg.sFilt;
    const sBots =
      sScope === 'block'
        ? b
        : sScope === 'semester'
        ? State.getBots(x => x.sem === State.cfg.sem)
        : State.getBots();
    sBots.sort((a, b1) => b1.max - a.max);

    const colPer = document.getElementById('colPer');
    if (colPer) {
      colPer.style.display = State.cfg.nPer === 1 && sScope === 'block' ? 'none' : 'table-cell';
    }

    document.querySelectorAll('.s-btn').forEach(btn => {
      btn.className =
        btn.dataset.s === State.cfg.sFilt
          ? 's-btn px-2 py-1 rounded bg-arena-800 text-white'
          : 's-btn px-2 py-1 rounded text-slate-400';
    });

    const sb = document.getElementById('standingsBody');
    if (sb) {
      sb.innerHTML =
        sBots
          .map((x, i) => {
            const rBdg =
              x.max === 0
                ? '<span class="text-[10px] bg-rose-900 text-rose-300 px-1 rounded">DNF</span>'
                : i === 0
                ? '🥇'
                : i === 1
                ? '🥈'
                : i === 2
                ? '🥉'
                : i + 1;
            const pct = rec.d > 0 ? Math.min(100, Math.round((x.max / rec.d) * 100)) : 0;
            return `<tr>
              <td class="p-2 text-center">${rBdg}</td>
              <td class="p-2 font-bold ${x.fail ? 'text-slate-500' : ''}">
                ${x.name} ${x.max >= rec.d && x.max > 0 ? '👑' : ''}
              </td>
              <td class="p-2 text-center" style="display:${
                State.cfg.nPer === 1 && sScope === 'block' ? 'none' : 'table-cell'
              }">
                <span class="text-[10px] bg-slate-800 px-1 rounded">${x.per.replace('Period ', 'P')}</span>
              </td>
              <td class="p-2">
                <div class="w-full bg-arena-950 h-1.5 rounded-full overflow-hidden">
                  <div class="bg-cyan-500 h-full rounded-full transition-all duration-500" style="width:${pct}%"></div>
                </div>
              </td>
              <td class="p-2 text-right font-display text-cyan-400 text-lg">${x.max}</td>
            </tr>`;
          })
          .join('') || `<tr><td colspan="5" class="p-4 text-center">No records</td></tr>`;
    }
  }

  function selectPeriod(periodName) {
    State.cfg.per = periodName;
    State.cfg.gap = State.cfg.init;
    State.save();
    render();
    Audio.playTone(600, 'sine', 0.1);
  }

  function undoFail(botName) {
    Audio.playTone(800, 'sine', 0.1);
    State.db = State.db.filter(
      a =>
        !(
          a.sem === State.cfg.sem &&
          a.per === State.cfg.per &&
          a.name === botName &&
          a.res === 'FAIL'
        )
    );
    State.save();
    render();
  }

  function removeBot(botName) {
    Audio.playTone(800, 'sine', 0.1);
    State.db = State.db.filter(
      a =>
        !(
          a.sem === State.cfg.sem &&
          a.per === State.cfg.per &&
          a.name === botName
        )
    );
    State.save();
    render();
  }

  // Modal Openers
  function openSettingsModal() {
    const setPer = document.getElementById('setPer');
    const setInit = document.getElementById('setInit');
    const setStep = document.getElementById('setStep');
    const setSem = document.getElementById('setSem');
    const setAutoAdv = document.getElementById('setAutoAdv');
    const setSnd = document.getElementById('setSnd');
    const setVol = document.getElementById('setVol');
    const setVolLabel = document.getElementById('setVolLabel');
    const setSoundpack = document.getElementById('setSoundpack');
    const setPromptCsv = document.getElementById('setPromptCsv');
    const setBDist = document.getElementById('setBDist');
    const setBName = document.getElementById('setBName');
    const bmCustom = document.getElementById('bmCustom');
    const bmAuto = document.getElementById('bmAuto');
    const setLockBanner = document.getElementById('setLockBanner');

    if (setPer) setPer.value = State.cfg.nPer;
    if (setInit) setInit.value = State.cfg.init;
    if (setStep) setStep.value = State.cfg.step;
    if (setSem) setSem.value = State.cfg.sem;
    if (setAutoAdv) setAutoAdv.checked = State.cfg.auto;
    if (setSnd) setSnd.checked = State.cfg.sOn;
    if (setVol) setVol.value = State.cfg.sVol;
    if (setVolLabel) setVolLabel.innerText = State.cfg.sVol + '%';
    if (setSoundpack) setSoundpack.value = State.cfg.soundpack || 'cyber';
    if (setPromptCsv) setPromptCsv.checked = State.cfg.promptCsvOnEnd !== false;

    if (State.cfg.bMode === 'custom') {
      if (bmCustom) bmCustom.checked = true;
    } else {
      if (bmAuto) bmAuto.checked = true;
    }
    if (setBDist) setBDist.value = State.cfg.bDist;
    if (setBName) setBName.value = State.cfg.bName;

    const isLocked = State.db.some(
      x => x.sem === State.cfg.sem && x.per === State.cfg.per && x.res !== 'READY'
    );
    if (setLockBanner) setLockBanner.style.display = isLocked ? 'block' : 'none';
    ['setPer', 'setInit', 'setStep'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.disabled = isLocked;
    });

    const modalSettings = document.getElementById('modalSettings');
    if (modalSettings) modalSettings.classList.remove('hidden');
  }

  function openPrepareModal() {
    const wipeConf = document.getElementById('wipeConf');
    const btnExecWipe = document.getElementById('btnExecWipe');
    if (wipeConf) wipeConf.value = '';
    if (btnExecWipe) btnExecWipe.disabled = true;
    const modalPrepare = document.getElementById('modalPrepare');
    if (modalPrepare) modalPrepare.classList.remove('hidden');
  }

  function openRosterModal() {
    const target = document.getElementById('rosterTarget');
    const input = document.getElementById('rosterInput');
    if (target) target.innerText = `Target: ${State.cfg.per} • ${State.cfg.sem}`;
    if (input) input.value = '';
    const modalRoster = document.getElementById('modalRoster');
    if (modalRoster) modalRoster.classList.remove('hidden');
  }

  function openCsvModal() {
    const ed = document.getElementById('csvEditor');
    if (ed) ed.value = State.toCSV(State.db);
    const modalCsv = document.getElementById('modalCsv');
    if (modalCsv) modalCsv.classList.remove('hidden');
  }

  function openGapModal() {
    const manGap = document.getElementById('manGap');
    if (manGap) manGap.value = State.cfg.gap;
    const modalGap = document.getElementById('modalGap');
    if (modalGap) modalGap.classList.remove('hidden');
  }

  function closeModal(modalId) {
    const m = document.getElementById(modalId);
    if (m) m.classList.add('hidden');
  }

  function initEventListeners() {
    // Close modal buttons
    document.querySelectorAll('.close-modal').forEach(b => {
      b.onclick = e => {
        const overlay = e.target.closest('.modal-overlay');
        if (overlay) overlay.classList.add('hidden');
      };
    });

    // Sound toggle in top navigation
    const btnSoundToggle = document.getElementById('btnSoundToggle');
    if (btnSoundToggle) {
      btnSoundToggle.onclick = () => {
        State.cfg.sOn = !State.cfg.sOn;
        Audio.on = State.cfg.sOn;
        if (State.cfg.sOn) Audio.playTone(900, 'sine', 0.15);
        State.save();
        btnSoundToggle.innerHTML = `<span>${State.cfg.sOn ? '🔊' : '🔇'}</span> FX: ${
          State.cfg.sOn ? 'ON' : 'OFF'
        }`;
      };
    }

    // Modal triggers in top nav
    const btnOpenSettingsModal = document.getElementById('btnOpenSettingsModal');
    if (btnOpenSettingsModal) btnOpenSettingsModal.onclick = openSettingsModal;

    const btnOpenPrepareModal = document.getElementById('btnOpenPrepareModal');
    if (btnOpenPrepareModal) btnOpenPrepareModal.onclick = openPrepareModal;

    const btnOpenBatchRoster = document.getElementById('btnOpenBatchRoster');
    if (btnOpenBatchRoster) btnOpenBatchRoster.onclick = openRosterModal;

    const btnCsvModal = document.getElementById('btnCsvModal');
    if (btnCsvModal) btnCsvModal.onclick = openCsvModal;

    // Volume input slider
    const setVol = document.getElementById('setVol');
    if (setVol) {
      setVol.oninput = e => {
        const label = document.getElementById('setVolLabel');
        if (label) label.innerText = e.target.value + '%';
      };
    }

    // Settings save button
    const btnSaveSet = document.getElementById('btnSaveSet');
    if (btnSaveSet) {
      btnSaveSet.onclick = () => {
        const setInit = document.getElementById('setInit');
        if (setInit && !setInit.disabled) {
          State.cfg.nPer = parseInt(document.getElementById('setPer').value) || 2;
          State.cfg.init = parseInt(document.getElementById('setInit').value) || 5;
          State.cfg.step = parseInt(document.getElementById('setStep').value) || 2;
          State.cfg.gap = State.cfg.init;
        }
        State.cfg.sem = document.getElementById('setSem').value || 'S2';
        State.cfg.auto = document.getElementById('setAutoAdv').checked;
        State.cfg.sOn = document.getElementById('setSnd').checked;
        Audio.on = State.cfg.sOn;
        State.cfg.sVol = parseInt(document.getElementById('setVol').value) || 75;
        Audio.vol = State.cfg.sVol / 100;

        const soundpackSelect = document.getElementById('setSoundpack');
        if (soundpackSelect) {
          State.cfg.soundpack = soundpackSelect.value;
          Audio.soundpack = soundpackSelect.value;
        }

        const promptCsvInput = document.getElementById('setPromptCsv');
        if (promptCsvInput) {
          State.cfg.promptCsvOnEnd = promptCsvInput.checked;
        }

        const isCustom = document.getElementById('bmCustom').checked;
        State.cfg.bMode = isCustom ? 'custom' : 'auto';
        State.cfg.bDist = parseInt(document.getElementById('setBDist').value) || 56;
        State.cfg.bName = document.getElementById('setBName').value || 'Apex Holder';

        State.save();
        render();
        closeModal('modalSettings');
        Overlays.showToast('Settings Saved', '⚙️');
      };
    }

    // Wipe modal confirmation input
    const wipeConf = document.getElementById('wipeConf');
    if (wipeConf) {
      wipeConf.oninput = e => {
        const btn = document.getElementById('btnExecWipe');
        if (btn) btn.disabled = e.target.value.trim().toUpperCase() !== 'RESET';
      };
    }

    const btnDlBackup = document.getElementById('btnDlBackup');
    if (btnDlBackup) {
      btnDlBackup.onclick = () => {
        State.triggerDownload(State.toCSV(State.db), 'btg_backup.csv');
        Overlays.showToast('Backup Downloaded', '💾');
      };
    }

    const btnExecWipe = document.getElementById('btnExecWipe');
    if (btnExecWipe) {
      btnExecWipe.onclick = () => {
        const choice = document.querySelector('input[name="wipe"]:checked').value;
        if (choice === 'all') {
          State.db = [];
          State.cfg.gap = State.cfg.init;
        } else {
          const currentBots = State.getBots(
            x => x.sem === State.cfg.sem && x.per === State.cfg.per
          );
          State.db = State.db.filter(
            x => !(x.sem === State.cfg.sem && x.per === State.cfg.per)
          );
          currentBots.forEach(x =>
            State.db.push({
              sem: State.cfg.sem,
              per: State.cfg.per,
              name: x.name,
              dist: State.cfg.init,
              res: 'READY',
              ts: ''
            })
          );
          State.cfg.gap = State.cfg.init;
        }
        State.save();
        render();
        closeModal('modalPrepare');
        Overlays.showToast('Data Cleared', '🧹');
      };
    }

    // Load roster button
    const btnLoadRoster = document.getElementById('btnLoadRoster');
    if (btnLoadRoster) {
      btnLoadRoster.onclick = () => {
        const raw = document.getElementById('rosterInput').value;
        const names = raw
          .split(/\r?\n/)
          .map(x => x.trim())
          .filter(x => x);

        names.forEach(name => {
          if (
            !State.db.some(
              a =>
                a.sem === State.cfg.sem &&
                a.per === State.cfg.per &&
                a.name === name
            )
          ) {
            State.db.push({
              sem: State.cfg.sem,
              per: State.cfg.per,
              name,
              dist: State.cfg.init,
              res: 'READY',
              ts: ''
            });
          }
        });

        State.save();
        render();
        closeModal('modalRoster');
        Overlays.showToast(`Loaded ${names.length} robots`, '👥');
      };
    }

    // CSV Hub actions
    const btnCsvClean = document.getElementById('btnCsvClean');
    if (btnCsvClean) {
      btnCsvClean.onclick = () => {
        try {
          const ed = document.getElementById('csvEditor');
          State.db = State.parseCSV(ed.value);
          ed.value = State.toCSV(State.db);
          Overlays.showToast('Syntax Cleaned', '✨');
        } catch (e) {
          Overlays.showToast('Error formatting', '❌');
        }
      };
    }

    const btnCsvCopy = document.getElementById('btnCsvCopy');
    if (btnCsvCopy) {
      btnCsvCopy.onclick = () => {
        const ed = document.getElementById('csvEditor');
        ed.select();
        document.execCommand('copy');
        Overlays.showToast('Copied to Clipboard', '📋');
      };
    }

    const btnCsvExport = document.getElementById('btnCsvExport');
    if (btnCsvExport) {
      btnCsvExport.onclick = () => {
        State.downloadAttemptLogCSV();
        Overlays.showToast('Attempt Log Exported', '📥');
      };
    }

    const btnCsvApply = document.getElementById('btnCsvApply');
    if (btnCsvApply) {
      btnCsvApply.onclick = () => {
        try {
          const ed = document.getElementById('csvEditor');
          State.db = State.parseCSV(ed.value);
          State.save();
          render();
          closeModal('modalCsv');
          Overlays.showToast('Data Applied', '💾');
        } catch (e) {
          Overlays.showToast('Parse Error', '❌');
        }
      };
    }

    // Projector Mode Toggle
    const btnToggleProjector = document.getElementById('btnToggleProjector');
    if (btnToggleProjector) {
      btnToggleProjector.onclick = () => {
        const isFull = !document.fullscreenElement;
        if (isFull) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
        document.body.classList.toggle('projector-mode', isFull);
        btnToggleProjector.innerHTML = isFull ? '📺 Standard' : '📺 Projector';
        Overlays.showToast(isFull ? 'Projector Mode On' : 'Standard View On', '📽️');
      };
    }

    // Advance Gap Button
    const btnAdvance = document.getElementById('btnAdvance');
    if (btnAdvance) {
      btnAdvance.onclick = () => {
        clearAutoTimer();
        State.cfg.gap += State.cfg.step;
        State.save();
        Audio.adv();
        render();
        Overlays.showToast(`Gap ${State.cfg.gap}cm`, '🚀');
      };
    }

    const btnCancelAutoAdvance = document.getElementById('btnCancelAutoAdvance');
    if (btnCancelAutoAdvance) {
      btnCancelAutoAdvance.onclick = () => {
        clearAutoTimer();
        Overlays.showToast('Auto-advance paused', '⏸️');
      };
    }

    const btnInstantAutoAdvance = document.getElementById('btnInstantAutoAdvance');
    if (btnInstantAutoAdvance) {
      btnInstantAutoAdvance.onclick = () => {
        if (State.pendGap) execAdvance(State.pendGap);
      };
    }

    // Manual Gap Modal
    const btnManualGap = document.getElementById('btnManualGap');
    if (btnManualGap) btnManualGap.onclick = openGapModal;

    const btnSaveManGap = document.getElementById('btnSaveManGap');
    if (btnSaveManGap) {
      btnSaveManGap.onclick = () => {
        const v = parseInt(document.getElementById('manGap').value);
        if (v) {
          State.cfg.gap = v;
          State.save();
          render();
          closeModal('modalGap');
          Overlays.showToast('Gap updated', '⚙️');
        }
      };
    }

    // Bulk Clear All Alive
    const btnBulkPass = document.getElementById('btnBulkPass');
    if (btnBulkPass) {
      btnBulkPass.onclick = () => {
        const inHunt = State.getBots(
          x => x.sem === State.cfg.sem && x.per === State.cfg.per && !x.fail
        );
        let count = 0;
        inHunt.forEach(b => {
          if (!b.atts.some(a => a.dist === State.cfg.gap && a.res !== 'READY')) {
            State.db = State.db.filter(
              a =>
                !(
                  a.sem === State.cfg.sem &&
                  a.per === State.cfg.per &&
                  a.name === b.name &&
                  a.res === 'READY'
                )
            );
            State.db.push({
              sem: State.cfg.sem,
              per: State.cfg.per,
              name: b.name,
              dist: State.cfg.gap,
              res: 'PASS',
              ts: new Date().toLocaleTimeString()
            });
            count++;
          }
        });

        if (count > 0) {
          Audio.pass();
          State.save();
          render();
          Overlays.showToast(`Cleared ${count} bots`, '✓');
          checkAutoAdvance();
        } else {
          Overlays.showToast('All bots already logged', 'ℹ️');
        }
      };
    }

    // Reset Gap
    const btnResetGap = document.getElementById('btnResetGap');
    if (btnResetGap) {
      btnResetGap.onclick = () => {
        clearAutoTimer();
        State.cfg.gap = State.cfg.init;
        State.save();
        render();
        Overlays.showToast(`Gap reset to ${State.cfg.init}cm`, '↺');
      };
    }

    // Restore Demo Data
    const btnRestoreDemo = document.getElementById('btnRestoreDemo');
    if (btnRestoreDemo) {
      btnRestoreDemo.onclick = () => {
        if (confirm('Restore demo competition data?')) {
          State.db = State.initData();
          State.cfg.nPer = 2;
          State.cfg.gap = 5;
          State.save();
          render();
          Overlays.showToast('Demo Data Restored', '🔄');
        }
      };
    }

    // Select change listeners
    const selSemester = document.getElementById('selSemester');
    if (selSemester) {
      selSemester.onchange = e => {
        State.cfg.sem = e.target.value;
        State.save();
        render();
      };
    }

    const matrixScope = document.getElementById('matrixScope');
    if (matrixScope) {
      matrixScope.onchange = () => render();
    }

    document.querySelectorAll('.q-btn').forEach(btn => {
      btn.onclick = e => {
        State.cfg.qFilt = e.target.dataset.q;
        render();
      };
    });

    document.querySelectorAll('.s-btn').forEach(btn => {
      btn.onclick = e => {
        State.cfg.sFilt = e.target.dataset.s;
        render();
      };
    });

    // Sudden death buttons
    const btnSdClear = document.getElementById('btnSdClear');
    if (btnSdClear) {
      btnSdClear.onclick = () => {
        if (State.sdBot) logAttempt(State.sdBot.name, State.cfg.gap, 'PASS');
      };
    }

    const btnSdFail = document.getElementById('btnSdFail');
    if (btnSdFail) {
      btnSdFail.onclick = () => {
        if (State.sdBot) {
          logAttempt(State.sdBot.name, State.cfg.gap, 'FAIL');
          crownChampion(State.sdBot, State.sdBot.max > State.getRec().d);
        }
      };
    }

    const btnSdRetire = document.getElementById('btnSdRetire');
    if (btnSdRetire) {
      btnSdRetire.onclick = () => {
        if (State.sdBot) {
          crownChampion(State.sdBot, State.sdBot.max >= State.getRec().d);
        }
      };
    }

    // CSV Download buttons
    const btnDlResults = document.getElementById('btnDlResults');
    if (btnDlResults) btnDlResults.onclick = () => State.downloadStandingsCSV();

    const bannerDownloadResultsBtn = document.getElementById('bannerDownloadResultsBtn');
    if (bannerDownloadResultsBtn) bannerDownloadResultsBtn.onclick = () => State.downloadStandingsCSV();

    const btnDlLog = document.getElementById('btnDlLog');
    if (btnDlLog) btnDlLog.onclick = () => State.downloadAttemptLogCSV();

    const bannerDownloadLogBtn = document.getElementById('bannerDownloadLogBtn');
    if (bannerDownloadLogBtn) bannerDownloadLogBtn.onclick = () => State.downloadAttemptLogCSV();

    const btnCloseCrown = document.getElementById('btnCloseCrown');
    if (btnCloseCrown) btnCloseCrown.onclick = () => closeModal('modalCrown');

    // Hotkeys: [1] Pass, [2] Fail, [Space] Advance, [Esc] Dismiss
    window.addEventListener('keydown', e => {
      if (document.querySelector('.modal-overlay:not(.hidden)')) {
        if (e.key === 'Escape') {
          document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
        }
        return;
      }

      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

      if (e.key === 'Escape') {
        clearAutoTimer();
      }

      const activeBots = State.getBots(
        x => x.sem === State.cfg.sem && x.per === State.cfg.per && !x.fail
      ).filter(x => !x.atts.some(a => a.dist === State.cfg.gap && a.res !== 'READY'));

      if (e.key === '1') {
        e.preventDefault();
        if (activeBots.length) logAttempt(activeBots[0].name, State.cfg.gap, 'PASS');
      } else if (e.key === '2') {
        e.preventDefault();
        if (activeBots.length) logAttempt(activeBots[0].name, State.cfg.gap, 'FAIL');
      } else if (e.code === 'Space') {
        e.preventDefault();
        const btnAdv = document.getElementById('btnAdvance');
        if (btnAdv) btnAdv.click();
      }
    });
  }

  return {
    render,
    logAttempt,
    undoFail,
    removeBot,
    selectPeriod,
    clearAutoTimer,
    crownChampion,
    openSettingsModal,
    openPrepareModal,
    openRosterModal,
    openCsvModal,
    openGapModal,
    closeModal,
    initEventListeners
  };
})();
