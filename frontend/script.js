(function () {
  // Configuration: change BASE_URL if your dashboard API is hosted elsewhere
  const BASE_URL = 'http://localhost:3000/api/sessions';
  const STORAGE_KEY = 'analytics_session_id';

  function generateSessionId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 's_' + Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  function getDeviceType() {
    if (typeof navigator === 'undefined') return 'unknown';
    return /Mobi|Android|iPhone|iPad|iPod|IEMobile|Windows Phone/.test(navigator.userAgent) ? 'mobile' : 'desktop';
  }

  function getSessionId() {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = generateSessionId();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  }

  function cssSelectorFor(el) {
    if (!el || !el.tagName) return null;
    try {
      if (el.id) return `#${el.id}`;
      let path = '';
      let node = el;
      let depth = 0;
      while (node && node.tagName && depth < 5) {
        let name = node.tagName.toLowerCase();
        if (node.className && typeof node.className === 'string') {
          const cls = node.className.trim().split(/\s+/)[0];
          if (cls) name += `.${cls}`;
        }
        path = path ? `${name} > ${path}` : name;
        node = node.parentElement;
        depth++;
      }
      return path;
    } catch (e) {
      return null;
    }
  }

  async function postCreateSession(sessionId, device) {
    const payload = { sessionId, device, events: [] };
    try {
      await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      });
    } catch (err) {
      // silent
      console.warn('create session failed', err);
    }
  }

  async function putEvents(sessionId, device, events) {
    const payload = { sessionId, device, events };
    try {
      // use fetch normally
      await fetch(BASE_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      });
    } catch (err) {
      console.warn('put events failed', err);
    }
  }

  function sendBeaconIfPossible(sessionId, device, events) {
    if (!navigator || !navigator.sendBeacon) return false;
    try {
      const data = JSON.stringify({ sessionId, device, events });
      const blob = new Blob([data], { type: 'application/json' });
      return navigator.sendBeacon(BASE_URL, blob);
    } catch (e) {
      return false;
    }
  }

  // Main
  const sessionId = getSessionId();
  const device = getDeviceType();
  // create session on load (safe to call even if already exists on server)
  postCreateSession(sessionId, device);

  // Click handler
  async function handleClick(e) {
    try {
      const ev = {
        type: 'click',
        x: e.clientX,
        y: e.clientY,
        selector: cssSelectorFor(e.target),
        timestamp: Date.now(),
        device,
      };
      // send immediately via PUT
      putEvents(sessionId, device, [ev]);
    } catch (err) {
      // ignore
    }
  }

  document.addEventListener('click', handleClick, true);

  // Try to flush a final small event on unload
  window.addEventListener('beforeunload', function () {
    const lastEvent = { type: 'unload', timestamp: Date.now(), device };
    const ok = sendBeaconIfPossible(sessionId, device, [lastEvent]);
    if (!ok) {
      // best-effort synchronous XHR fallback (rarely needed)
      try {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', BASE_URL, false);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify({ sessionId, device, events: [lastEvent] }));
      } catch (e) {
        // ignore
      }
    }
  });

  // Expose for debugging
  window.__analytics = {
    sessionId,
    device,
    sendEvent: (evt) => putEvents(sessionId, device, Array.isArray(evt) ? evt : [evt]),
  };
})();