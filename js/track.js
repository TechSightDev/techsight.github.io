/*
 * Funnel tracking on top of GA4 (gtag is loaded in _includes/google-analytics.html).
 *
 * Funnel: landing -> cta_click (free_screen) -> free-screen page -> contact page
 *         -> calendly_date_selected -> calendly_event_scheduled (+ generate_lead)
 *
 * Mark CTAs with data-track="<cta_id>" (and optionally data-track-location="<where>").
 * Calendly, mailto, and LinkedIn links are tracked automatically.
 * Add ?debug_track=1 to any URL to log events to the console and GA4 DebugView
 * for the rest of the browser session.
 */
(function () {
  var DEBUG = false;
  try {
    if (/[?&]debug_track=1/.test(location.search)) sessionStorage.setItem('ts_debug_track', '1');
    DEBUG = sessionStorage.getItem('ts_debug_track') === '1';
  } catch (e) {}
  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  var FIRST_TOUCH_KEY = 'ts_first_touch';

  function send(name, params) {
    params = params || {};
    if (DEBUG) {
      params.debug_mode = true;
      console.log('[track]', name, params);
    }
    if (typeof window.gtag === 'function') window.gtag('event', name, params);
  }

  // First-touch attribution: remember where this visitor first came from so a
  // booking made days later on a direct visit is still credited to the post/email.
  function readFirstTouch() {
    try {
      return JSON.parse(localStorage.getItem(FIRST_TOUCH_KEY) || 'null');
    } catch (e) {
      return null;
    }
  }

  function captureFirstTouch() {
    var qs = new URLSearchParams(location.search);
    var touch = {};
    UTM_KEYS.forEach(function (k) {
      if (qs.get(k)) touch[k] = qs.get(k);
    });
    if (!Object.keys(touch).length) return;
    try {
      if (!localStorage.getItem(FIRST_TOUCH_KEY)) {
        touch.landing_page = location.pathname;
        localStorage.setItem(FIRST_TOUCH_KEY, JSON.stringify(touch));
      }
    } catch (e) {}
  }

  // Calendly reads utm_* from its data-url, so pass attribution through to the
  // booking record (and its notification email / webhook payload).
  function decorateCalendly() {
    var touch = readFirstTouch() || {};
    var current = new URLSearchParams(location.search);
    document.querySelectorAll('.calendly-inline-widget[data-url], a[href*="calendly.com"]').forEach(function (el) {
      var attr = el.hasAttribute('data-url') ? 'data-url' : 'href';
      var url = new URL(el.getAttribute(attr));
      UTM_KEYS.forEach(function (k) {
        var v = current.get(k) || touch[k];
        if (v && !url.searchParams.has(k)) url.searchParams.set(k, v);
      });
      if (!url.searchParams.has('utm_content')) url.searchParams.set('utm_content', location.pathname);
      el.setAttribute(attr, url.toString());
    });
  }

  function locationOf(el) {
    if (el.dataset.trackLocation) return el.dataset.trackLocation;
    if (el.closest('.site-navbar, .site-mobile-menu')) return 'nav';
    if (el.closest('.footer')) return 'footer';
    if (el.closest('.site-section-cover')) return 'hero';
    return 'body';
  }

  function onClick(e) {
    var el = e.target.closest('a, button');
    if (!el) return;
    var href = el.getAttribute('href') || '';
    var base = {
      cta_location: locationOf(el),
      page_path: location.pathname,
      link_url: href,
      link_text: (el.textContent || '').trim().slice(0, 80)
    };

    if (el.dataset.track) {
      base.cta_id = el.dataset.track;
      send('cta_click', base);
    } else if (el.closest('.site-navbar, .site-mobile-menu') && href) {
      base.cta_id = 'nav_' + (href.split('/').pop().replace('.html', '') || 'home');
      send('nav_click', base);
    }
    if (href.indexOf('calendly.com') !== -1) send('calendly_link_click', base);
    if (href.indexOf('mailto:') === 0) send('email_click', base);
    if (href.indexOf('linkedin.com') !== -1) send('linkedin_click', base);
  }

  // Calendly embed lifecycle: https://developer.calendly.com/api-docs/ZG9jOjI3ODM2MTAz-notifying-the-parent-window
  var CALENDLY_EVENTS = {
    'calendly.event_type_viewed': 'calendly_viewed',
    'calendly.date_and_time_selected': 'calendly_date_selected',
    'calendly.event_scheduled': 'calendly_event_scheduled'
  };

  // Calendly can post the same lifecycle event more than once (observed: event_type_viewed
  // fires twice per popup open), so count each stage once per page load.
  var calendlySeen = {};

  function onMessage(e) {
    if (e.origin !== 'https://calendly.com' || !e.data || !CALENDLY_EVENTS[e.data.event]) return;
    if (calendlySeen[e.data.event]) return;
    calendlySeen[e.data.event] = true;
    var params = { page_path: location.pathname };
    var touch = readFirstTouch();
    if (touch) {
      params.first_source = touch.utm_source;
      params.first_campaign = touch.utm_campaign;
    }
    send(CALENDLY_EVENTS[e.data.event], params);
    if (e.data.event === 'calendly.event_scheduled') {
      // GA4 recommended event; mark it as a key event in GA4 Admin.
      send('generate_lead', Object.assign({ lead_source: 'calendly' }, params));
    }
  }

  // Fires once per page when the visitor reaches the bottom of the main content,
  // so we can see whether people actually read the offer before bouncing.
  function watchReadThrough() {
    var footer = document.querySelector('.footer');
    if (!footer || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) {
        send('page_read_through', { page_path: location.pathname });
        io.disconnect();
      }
    });
    io.observe(footer);
  }

  // Loaded in <head>: listeners attach before any Calendly embed can post messages.
  // Pages with an inline Calendly embed call tsTrack.decorateCalendly() right after
  // the embed div and before widget.js, so the widget initialises with UTMs.
  window.tsTrack = { send: send, decorateCalendly: decorateCalendly };
  captureFirstTouch();
  document.addEventListener('click', onClick, true);
  window.addEventListener('message', onMessage);
  document.addEventListener('DOMContentLoaded', function () {
    decorateCalendly();
    watchReadThrough();
  });
})();
