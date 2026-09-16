(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = typeof window.gsap !== 'undefined';

  /* ----------------------------------------------------------------
     UTM capture: tags each registration with how the visitor arrived
     (utm_source/medium/campaign in the URL) by copying them into hidden
     form fields, so Netlify Forms submissions can be filtered by
     audience — Customer / Partner / Lenovo / Others.
     Persisted to sessionStorage so the tags survive if someone lands on
     the tagged link, browses, then submits later in the same session.
  ---------------------------------------------------------------- */
  (function captureUtm() {
    var params = new URLSearchParams(window.location.search);
    var keys = ['utm_source', 'utm_medium', 'utm_campaign'];
    keys.forEach(function (key) {
      var field = document.getElementById(key);
      if (!field) return;
      var fromUrl = params.get(key);
      if (fromUrl) {
        try { sessionStorage.setItem(key, fromUrl); } catch (e) {}
        field.value = fromUrl;
      } else {
        var stored;
        try { stored = sessionStorage.getItem(key); } catch (e) {}
        if (stored) field.value = stored;
      }
    });
  })();

  /* ----------------------------------------------------------------
     Animations (skipped entirely for reduced-motion or missing GSAP —
     the CSS default state is already fully visible/static, so bailing
     out here is a safe no-op, not a broken page).
  ---------------------------------------------------------------- */
  if (hasGsap && !prefersReducedMotion) {
    document.documentElement.classList.add('js-anim-ready');
    gsap.registerPlugin(ScrollTrigger);

    // Hero load-in
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .to('[data-hero-anim]', {
        opacity: 1,
        y: 0,
        duration: 0.9,
        stagger: 0.12,
        delay: 0.15
      });

    // Section reveal on scroll
    document.querySelectorAll('section, .site-footer').forEach(function (section) {
      var items = section.querySelectorAll('[data-reveal]');
      if (!items.length) return;
      gsap.to(items, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: section,
          start: 'top 80%',
          once: true
        }
      });
    });
  }

  /* ----------------------------------------------------------------
     Generic modal helper (used by both the trailer lightbox and the
     thank-you confirmation) — handles show/hide, focus return, Escape,
     and backdrop/close-button clicks.
  ---------------------------------------------------------------- */
  function createModal(el, closeSelector, onBeforeClose) {
    var lastFocused = null;

    function onKeydown(e) {
      if (e.key === 'Escape') close();
    }

    function open(focusTarget) {
      lastFocused = document.activeElement;
      el.hidden = false;
      document.body.style.overflow = 'hidden';
      (focusTarget || el.querySelector('.lightbox__close')).focus();
      document.addEventListener('keydown', onKeydown);
    }

    function close() {
      if (onBeforeClose) onBeforeClose();
      el.hidden = true;
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKeydown);
      if (lastFocused) lastFocused.focus();
    }

    el.querySelectorAll(closeSelector).forEach(function (btn) {
      btn.addEventListener('click', close);
    });

    return { open: open, close: close };
  }

  /* ----------------------------------------------------------------
     Trailer lightbox
  ---------------------------------------------------------------- */
  var lightboxEl = document.getElementById('trailer-lightbox');
  var lightboxFrame = document.getElementById('lightbox-frame');
  var trailerTrigger = document.querySelector('[data-trailer-trigger]');

  if (lightboxEl && lightboxFrame) {
    var trailerModal = createModal(lightboxEl, '[data-trailer-close]', function () {
      lightboxFrame.innerHTML = ''; // stop playback
    });

    if (trailerTrigger) {
      trailerTrigger.addEventListener('click', function () {
        var youtubeId = trailerTrigger.getAttribute('data-youtube-id');
        var iframe = document.createElement('iframe');
        iframe.src = 'https://www.youtube-nocookie.com/embed/' + youtubeId + '?autoplay=1&rel=0';
        iframe.title = 'Forgotten Island trailer';
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        iframe.allowFullscreen = true;
        lightboxFrame.innerHTML = '';
        lightboxFrame.appendChild(iframe);
        trailerModal.open();
      });
    }
  }

  /* ----------------------------------------------------------------
     Thank-you confirmation modal
  ---------------------------------------------------------------- */
  var thankYouEl = document.getElementById('thank-you-modal');
  var thankYouModal = thankYouEl ? createModal(thankYouEl, '[data-confirm-close]') : null;

  /* ----------------------------------------------------------------
     Form: AJAX submit to Netlify Forms (so we can show the thank-you
     modal in place instead of a full-page redirect), with a loading
     state on the button and a native-validation fallback.
  ---------------------------------------------------------------- */
  var form = document.getElementById('rsvp-form');
  var registerBtn = document.getElementById('register-btn');
  var status = document.getElementById('form-status');

  function encodeFormData(formEl) {
    return new URLSearchParams(new FormData(formEl)).toString();
  }

  if (form && registerBtn) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      registerBtn.classList.add('is-loading');
      registerBtn.setAttribute('aria-busy', 'true');
      if (status) {
        status.textContent = 'Submitting your registration…';
        status.dataset.state = '';
      }

      fetch(form.getAttribute('action') || window.location.pathname, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: encodeFormData(form)
      })
        .then(function (response) {
          if (!response.ok) throw new Error('Submission failed with status ' + response.status);
          if (status) {
            status.textContent = '';
            status.dataset.state = '';
          }
          form.reset();
          if (thankYouModal) {
            thankYouModal.open(document.getElementById('confirm-heading') || undefined);
          } else if (status) {
            status.textContent = 'Thanks — you’re registered! Check your email for confirmation.';
            status.dataset.state = 'success';
          }
        })
        .catch(function () {
          if (status) {
            status.textContent = 'Something went wrong submitting the form. Please try again, or email us directly.';
            status.dataset.state = 'error';
          }
        })
        .finally(function () {
          registerBtn.classList.remove('is-loading');
          registerBtn.removeAttribute('aria-busy');
        });
    });
  }
})();
