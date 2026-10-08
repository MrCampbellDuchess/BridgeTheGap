/**
 * Bridge the Gap Arena — Tournament State & Data Engine
 * Manages attempt ledgers, competition rules, calculations, and CSV operations
 */
window.Arena = window.Arena || {};

window.Arena.State = (function () {
  let db = [];
  let cfg = {
    sem: 'S2 25-26 Final',
    per: 'Period 2',
    nPer: 2,
    gap: 5,
    init: 5,
    step: 2,
    bMode: 'auto',
    bDist: 56,
    bName: 'Chasm Crawler',
    sOn: true,
    sVol: 75,
    soundpack: 'cyber',
    theme: 'cyber',
    syncAudio: false,
    auto: true,
    qFilt: 'active',
    sFilt: 'block',
    promptCsvOnEnd: true
  };

  let tmr = null;
  let pendGap = null;
  let sdBot = null;

  function applyTheme(themeName) {
    if (!themeName) return;
    cfg.theme = themeName;
    document.documentElement.setAttribute('data-theme', themeName);

    if (cfg.syncAudio && window.Arena && window.Arena.Audio && window.Arena.Audio.getCompanionSoundpack) {
      const sp = window.Arena.Audio.getCompanionSoundpack(themeName);
      cfg.soundpack = sp;
      window.Arena.Audio.soundpack = sp;
    }
  }

  function initData() {
    const historical = [
      ['S2 24-25', 'Period 3', 'Grumz', 41],
      ['S2 24-25', 'Period 2', 'King Toddd the 7th', 31],
      ['S1 25-26', 'Period 3', 'Bartholemew', 40],
      ['S1 25-26', 'Period 3', 'Pfshsh', 30],
      ['S2 25-26 Final', 'Period 3', 'Chasm Crawler', 56],
      ['S2 25-26 Final', 'Period 3', 'The Horn', 46],
      ['S2 25-26 Final', 'Period 2', 'Pinegrapple', 34],
      ['S2 25-26 Final', 'Period 2', "Ethan's Shrug", 32],
      ['S2 25-26 Final', 'Period 2', 'Porker', 0]
    ];

    let rows = [];
    historical.forEach(b => {
      if (b[3] === 0) {
        rows.push({ sem: b[0], per: b[1], name: b[2], dist: 5, res: 'FAIL', ts: '10:00' });
      } else {
        for (let d = 5; d <= b[3]; d += 2) {
          rows.push({ sem: b[0], per: b[1], name: b[2], dist: d, res: 'PASS', ts: '10:00' });
        }
        rows.push({ sem: b[0], per: b[1], name: b[2], dist: b[3] + 2, res: 'FAIL', ts: '10:00' });
      }
    });
    return rows;
  }

  function parseCSV(str) {
    if (!str || typeof str !== 'string') return [];
    let lines = str.trim().split(/\r?\n/);
    let rows = [];
    for (let i = 1; i < lines.length; i++) {
      let parts = lines[i].split(',').map(x => x.replace(/^"|"$/g, '').trim());
      if (parts.length >= 5 && parts[2]) {
        rows.push({
          sem: parts[0],
          per: parts[1],
          name: parts[2],
          dist: parseFloat(parts[3]) || 5,
          res: parts[4],
          ts: parts[5] || ''
        });
      }
    }
    return rows;
  }

  function toCSV(arr) {
    return (
      'Semester,Period,Robot Name,Round Distance (cm),Result,Timestamp\n' +
      arr
        .map(
          r => `"${r.sem}","${r.per}","${r.name}",${r.dist},${r.res},${r.ts}`
        )
        .join('\n')
    );
  }

  function load() {
    let rawDB = localStorage.getItem('btg_db');
    let rawCfg = localStorage.getItem('btg_cfg');

    if (rawDB) {
      try {
        db = parseCSV(rawDB);
      } catch (e) {
        db = initData();
      }
    } else {
      db = initData();
    }

    if (rawCfg) {
      try {
        Object.assign(cfg, JSON.parse(rawCfg));
      } catch (e) {}
    }

    // Sync sound engine
    if (window.Arena && window.Arena.Audio) {
      window.Arena.Audio.on = cfg.sOn;
      window.Arena.Audio.vol = cfg.sVol / 100;
      if (cfg.soundpack) window.Arena.Audio.soundpack = cfg.soundpack;
    }

    // Apply visual theme
    applyTheme(cfg.theme || 'cyber');
  }

  function save() {
    localStorage.setItem('btg_db', toCSV(db));
    localStorage.setItem('btg_cfg', JSON.stringify(cfg));
  }

  function getBots(filterFn) {
    let map = new Map();
    let source = filterFn ? db.filter(filterFn) : db;

    source.forEach(r => {
      let key = `${r.sem}_${r.per}_${r.name}`;
      if (!map.has(key)) {
        map.set(key, {
          sem: r.sem,
          per: r.per,
          name: r.name,
          atts: [],
          max: 0,
          fail: false,
          fDist: 0
        });
      }
      let bot = map.get(key);
      bot.atts.push(r);
      if (r.res === 'PASS' && r.dist > bot.max) bot.max = r.dist;
      if (r.res === 'FAIL') {
        bot.fail = true;
        bot.fDist = r.dist;
      }
    });

    return Array.from(map.values()).sort(
      (a, b) => b.max - a.max || a.name.localeCompare(b.name)
    );
  }

  function getRec() {
    if (cfg.bMode === 'custom') {
      return { d: cfg.bDist || 56, n: cfg.bName || 'Apex Holder', m: 'Custom Benchmark' };
    }
    let allBots = getBots();
    let max = 0;
    let name = 'Chasm Crawler';
    let mode = 'Auto Mode';

    allBots.forEach(x => {
      if (x.max > max) {
        max = x.max;
        name = x.name;
        mode = `${x.sem} • ${x.per}`;
      }
    });

    return { d: max || 56, n: name, m: mode };
  }

  function triggerDownload(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function downloadStandingsCSV() {
    const bots = getBots(x => x.sem === cfg.sem && x.per === cfg.per).sort(
      (a, b) => b.max - a.max
    );
    let csv =
      'Rank,Robot Name,Period,Semester,Longest Distance (cm),Status,Gap from Winner (cm),Completed Timestamp\n';
    const winnerMax = bots[0]?.max || 0;

    bots.forEach((bot, idx) => {
      const rank = idx + 1;
      const status = bot.fail ? 'Eliminated' : 'Active';
      const gapDiff = bot.max - winnerMax;
      csv += `${rank},"${bot.name}","${bot.per}","${bot.sem}",${bot.max},${status},${gapDiff},"${new Date().toLocaleTimeString()}"\n`;
    });

    const filename = `btg_results_${cfg.sem.replace(/\s+/g, '_')}_${cfg.per.replace(/\s+/g, '_')}.csv`;
    triggerDownload(csv, filename);
  }

  function downloadAttemptLogCSV() {
    const filename = `btg_log_${cfg.sem.replace(/\s+/g, '_')}.csv`;
    triggerDownload(toCSV(db), filename);
  }

  return {
    get db() { return db; },
    set db(val) { db = val; },
    cfg,
    get tmr() { return tmr; },
    set tmr(val) { tmr = val; },
    get pendGap() { return pendGap; },
    set pendGap(val) { pendGap = val; },
    get sdBot() { return sdBot; },
    set sdBot(val) { sdBot = val; },
    initData,
    parseCSV,
    toCSV,
    load,
    save,
    getBots,
    getRec,
    applyTheme,
    triggerDownload,
    downloadStandingsCSV,
    downloadAttemptLogCSV
  };
})();
