/*
 * Aurora App V2 - installazione dell'app sul telefono.
 * - registra il service worker (serve a rendere l'app installabile)
 * - mostra il banner "Installa l'app" a chi non l'ha ancora installata
 * - espone window.AuroraInstall, usato anche dalla pagina /installa/
 * Non dipende dal codice React del sito: se serve, basta togliere la riga
 * <script src="/install-banner.js"> da index.html per spegnere tutto.
 */
(function () {
  'use strict';

  // Indirizzo ufficiale dell'app (quello che l'icona sulla home aprirà)
  var APP_URL = 'https://appaurorav2updated.vercel.app/home';
  var APK_PATH = '/aurora-v2.apk';
  var INSTALL_PAGE = '/installa/';
  var DISMISS_KEY = 'aurora_v2_install_banner_dismissed';

  var ua = navigator.userAgent || '';
  var isIos = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var isAndroid = /Android/i.test(ua);
  var isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|FBAN|FBAV|Instagram|Line\//.test(ua);

  function isStandalone() {
    return (
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      window.navigator.standalone === true ||
      (document.referrer || '').indexOf('android-app://') === 0 ||
      /AuroraApp\//.test(navigator.userAgent || '')
    );
  }

  /* ---------- service worker ---------- */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function () {});
    });
  }

  /* ---------- prompt di installazione Android/Chrome ---------- */
  var deferredPrompt = null;
  var listeners = [];
  function notify() {
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](); } catch (e) {}
    }
  }
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    notify();
    maybeShowBanner();
  });
  window.addEventListener('appinstalled', function () {
    deferredPrompt = null;
    removeBanner();
    notify();
  });
  function promptInstall() {
    if (!deferredPrompt) return Promise.resolve('unavailable');
    var p = deferredPrompt;
    deferredPrompt = null;
    notify();
    p.prompt();
    return p.userChoice.then(function (c) { return c.outcome; });
  }

  /* ---------- profilo iPhone (.mobileconfig, WebClip ufficiale Apple) ---------- */
  function iconBase64() {
    return fetch('/webclip-icon.png')
      .then(function (r) { return r.blob(); })
      .then(function (blob) {
        return new Promise(function (resolve, reject) {
          var fr = new FileReader();
          fr.onloadend = function () { resolve(String(fr.result).split(',')[1] || ''); };
          fr.onerror = reject;
          fr.readAsDataURL(blob);
        });
      })
      .catch(function () { return ''; });
  }
  function buildProfile(b64) {
    var icon = b64
      ? '<key>Icon</key>\n            <data>\n            ' + (b64.match(/.{1,76}/g) || []).join('\n            ') + '\n            </data>\n            '
      : '';
    return '<?xml version="1.0" encoding="UTF-8"?>\n' +
'<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n' +
'<plist version="1.0">\n<dict>\n    <key>PayloadContent</key>\n    <array>\n        <dict>\n' +
'            <key>FullScreen</key>\n            <true/>\n' +
'            ' + icon +
'<key>IsRemovable</key>\n            <true/>\n' +
'            <key>Label</key>\n            <string>Aurora</string>\n' +
'            <key>PayloadDescription</key>\n            <string>Aggiunge l\'icona di Aurora alla schermata home.</string>\n' +
'            <key>PayloadDisplayName</key>\n            <string>Aurora</string>\n' +
'            <key>PayloadIdentifier</key>\n            <string>it.aurora.webclip.v2</string>\n' +
'            <key>PayloadType</key>\n            <string>com.apple.webClip.managed</string>\n' +
'            <key>PayloadUUID</key>\n            <string>6D61E6A6-E128-45DC-A7CD-91AB92C31892</string>\n' +
'            <key>PayloadVersion</key>\n            <integer>1</integer>\n' +
'            <key>URL</key>\n            <string>' + APP_URL + '</string>\n' +
'            <key>Precomposed</key>\n            <true/>\n' +
'        </dict>\n    </array>\n' +
'    <key>PayloadDisplayName</key>\n    <string>Installatore Aurora</string>\n' +
'    <key>PayloadDescription</key>\n    <string>Aggiunge l\'icona di Aurora alla schermata home del tuo iPhone. Puoi rimuoverla in qualsiasi momento da Impostazioni.</string>\n' +
'    <key>PayloadIdentifier</key>\n    <string>it.aurora.mobileconfig.v2</string>\n' +
'    <key>PayloadRemovalDisallowed</key>\n    <false/>\n' +
'    <key>PayloadType</key>\n    <string>Configuration</string>\n' +
'    <key>PayloadUUID</key>\n    <string>B908CC0B-F261-43E1-AEC7-B0AFBBAC4B99</string>\n' +
'    <key>PayloadVersion</key>\n    <integer>1</integer>\n</dict>\n</plist>\n';
  }
  // iPhone installa il profilo solo se arriva come file vero dal sito
  // (non creato nel browser) e solo da Safari.
  var PROFILE_PATH = '/aurora.mobileconfig';
  function downloadMobileConfig() {
    window.location.href = PROFILE_PATH;
    return Promise.resolve();
  }

  /* ---------- file APK Android ---------- */
  // Il sito risponde con index.html anche per i file che non esistono:
  // l'APK c'è davvero solo se la risposta NON è una pagina HTML.
  function apkAvailable() {
    return fetch(APK_PATH, { method: 'HEAD', cache: 'no-store' })
      .then(function (r) {
        var t = (r.headers.get('content-type') || '').toLowerCase();
        return r.ok && t.indexOf('text/html') === -1;
      })
      .catch(function () { return false; });
  }

  window.AuroraInstall = {
    appUrl: APP_URL,
    apkPath: APK_PATH,
    installPage: INSTALL_PAGE,
    isIos: isIos,
    isAndroid: isAndroid,
    isSafari: isSafari,
    isStandalone: isStandalone,
    hasPrompt: function () { return !!deferredPrompt; },
    promptInstall: promptInstall,
    onChange: function (cb) { listeners.push(cb); },
    downloadMobileConfig: downloadMobileConfig,
    profilePath: PROFILE_PATH,
    apkAvailable: apkAvailable,
    pwaBuilderUrl: function () {
      return 'https://www.pwabuilder.com/reportcard?site=' + encodeURIComponent(APP_URL.replace(/\/home$/, ''));
    }
  };

  /* ---------- banner ---------- */
  var banner = null;
  function dismissed() {
    try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch (e) { return false; }
  }
  function setDismissed() {
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch (e) {}
  }
  function removeBanner() {
    if (banner && banner.parentNode) banner.parentNode.removeChild(banner);
    banner = null;
  }
  function addCss() {
    if (document.getElementById('aur-ib-css')) return;
    var s = document.createElement('style');
    s.id = 'aur-ib-css';
    s.textContent =
      '.aur-ib{position:relative;z-index:20;display:flex;gap:12px;align-items:flex-start;padding:10px 12px;padding-top:calc(10px + env(safe-area-inset-top,0px));' +
      'background:#0e1b30;color:#e2e8f0;border-bottom:1px solid rgba(56,189,248,.35);font-family:"Plus Jakarta Sans",system-ui,sans-serif}' +
      '.aur-ib-ico{width:44px;height:44px;border-radius:10px;flex:none}' +
      '.aur-ib-body{flex:1;min-width:0}' +
      '.aur-ib-t{font-weight:800;font-size:14px;line-height:1.2}' +
      '.aur-ib-s{margin-top:3px;font-size:12px;line-height:1.35;color:#94a3b8}' +
      '.aur-ib-btns{display:flex;align-items:center;gap:12px;margin-top:10px;flex-wrap:wrap}' +
      '.aur-ib-go{border:0;border-radius:10px;padding:8px 14px;background:#0284c7;color:#fff;font-weight:700;font-size:13px;font-family:inherit;cursor:pointer}' +
      '.aur-ib-go:active{transform:scale(.97)}' +
      '.aur-ib-more{font-size:12px;color:#7dd3fc;text-decoration:underline}' +
      '.aur-ib-x{border:0;background:transparent;color:#94a3b8;font-size:22px;line-height:1;padding:0 2px;cursor:pointer}';
    document.head.appendChild(s);
  }
  function showBanner(mode) {
    if (banner || !document.body) return;
    addCss();
    var sub = mode === 'android'
      ? 'Si apre come una vera app, a schermo intero, senza passare dallo store.'
      : mode === 'ios'
        ? 'Un tocco e l\'icona è sulla schermata home. iPhone mostrerà un avviso di sistema: è normale, tocca "Installa".'
        : 'Per installarla apri Aurora da Safari: qui trovi i passaggi.';
    var label = mode === 'ios-other' ? 'Come installare' : 'Installa l\'app';
    banner = document.createElement('div');
    banner.className = 'aur-ib';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Installa l\'app Aurora');
    banner.innerHTML =
      '<img class="aur-ib-ico" src="/apple-touch-icon.png" alt="">' +
      '<div class="aur-ib-body"><div class="aur-ib-t">Installa l\'app Aurora</div>' +
      '<div class="aur-ib-s">' + sub + '</div>' +
      '<div class="aur-ib-btns"><button type="button" class="aur-ib-go">' + label + '</button>' +
      '<a class="aur-ib-more" href="' + INSTALL_PAGE + '">Altre opzioni</a></div></div>' +
      '<button type="button" class="aur-ib-x" aria-label="Chiudi">&times;</button>';
    banner.querySelector('.aur-ib-x').addEventListener('click', function () { setDismissed(); removeBanner(); });
    banner.querySelector('.aur-ib-go').addEventListener('click', function () {
      if (mode === 'android') {
        promptInstall().then(function () { setDismissed(); removeBanner(); });
      } else if (mode === 'ios') {
        downloadMobileConfig();
      } else {
        location.href = INSTALL_PAGE;
      }
    });
    document.body.insertBefore(banner, document.body.firstChild);
  }
  function eligible() {
    if (window.top !== window.self) return false;                    // non dentro l'anteprima
    if (location.pathname.indexOf('/installa') === 0) return false;  // la pagina ha già i suoi pulsanti
    if (isStandalone() || dismissed()) return false;                 // già installata o chiuso
    if (window.innerWidth >= 1024) return false;                     // schermi larghi: c'è la barra laterale
    return isIos || isAndroid;                                       // solo telefoni/tablet
  }
  function maybeShowBanner() {
    if (!eligible()) return;
    if (isAndroid && deferredPrompt) showBanner('android');
    else if (isIos) showBanner(isSafari ? 'ios' : 'ios-other');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', maybeShowBanner);
  else maybeShowBanner();
})();
