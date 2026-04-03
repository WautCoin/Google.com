/**
 * app.js – Google.com clone: profile settings & theme management
 */

(function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /*  Constants & Defaults                                                */
  /* ------------------------------------------------------------------ */
  const STORAGE_KEY = 'google_profile_settings';

  const DEFAULTS = {
    displayName: 'User',
    email: 'user@example.com',
    language: 'en',
    theme: 'light',
    safeSearch: true,
    searchHistory: true,
  };

  /* ------------------------------------------------------------------ */
  /*  State – persisted to localStorage                                   */
  /* ------------------------------------------------------------------ */
  let settings = loadSettings();

  /* ------------------------------------------------------------------ */
  /*  DOM refs                                                            */
  /* ------------------------------------------------------------------ */
  const profileBtn     = document.getElementById('profileBtn');
  const profileDropdown = document.getElementById('profileDropdown');
  const dropdownName   = document.getElementById('dropdownName');
  const dropdownEmail  = document.getElementById('dropdownEmail');
  const openSettingsBtn = document.getElementById('openSettingsBtn');
  const signOutBtn     = document.getElementById('signOutBtn');
  const settingsModal  = document.getElementById('settingsModal');
  const closeModalBtn  = document.getElementById('closeModalBtn');
  const cancelBtn      = document.getElementById('cancelBtn');
  const settingsForm   = document.getElementById('settingsForm');
  const toast          = document.getElementById('toast');
  const luckyBtn       = document.getElementById('luckyBtn');
  const searchInput    = document.getElementById('searchInput');

  /* Form fields */
  const fieldDisplayName   = document.getElementById('displayName');
  const fieldEmail         = document.getElementById('emailInput');
  const fieldLanguage      = document.getElementById('languageSelect');
  const fieldSafeSearch    = document.getElementById('safeSearch');
  const fieldSearchHistory = document.getElementById('searchHistory');
  const errorDisplayName   = document.getElementById('displayNameError');
  const errorEmail         = document.getElementById('emailError');

  /* ------------------------------------------------------------------ */
  /*  Initialise                                                          */
  /* ------------------------------------------------------------------ */
  function init() {
    applyTheme(settings.theme);
    updateProfileDisplay();

    // Profile dropdown toggle
    profileBtn.addEventListener('click', toggleDropdown);
    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('keydown', handleGlobalKey);

    // Settings modal open / close
    openSettingsBtn.addEventListener('click', openModal);
    closeModalBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    settingsModal.addEventListener('click', function (e) {
      if (e.target === settingsModal) closeModal();
    });

    // Form submission
    settingsForm.addEventListener('submit', handleSave);

    // Live theme preview
    settingsForm.querySelectorAll('input[name="theme"]').forEach(function (radio) {
      radio.addEventListener('change', function () {
        applyTheme(radio.value);
      });
    });

    // "I'm Feeling Lucky"
    luckyBtn.addEventListener('click', function () {
      var q = searchInput.value.trim();
      if (q) {
        var url = 'https://www.google.com/search?q=' + encodeURIComponent(q) + '&btnI=1';
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    });

    // Sign out (clears settings)
    signOutBtn.addEventListener('click', handleSignOut);
  }

  /* ------------------------------------------------------------------ */
  /*  Profile Dropdown                                                    */
  /* ------------------------------------------------------------------ */
  function toggleDropdown() {
    var open = !profileDropdown.hidden;
    setDropdownOpen(!open);
  }

  function setDropdownOpen(open) {
    profileDropdown.hidden = !open;
    profileBtn.setAttribute('aria-expanded', String(open));
  }

  function handleOutsideClick(e) {
    if (
      !profileDropdown.hidden &&
      !profileBtn.contains(e.target) &&
      !profileDropdown.contains(e.target)
    ) {
      setDropdownOpen(false);
    }
  }

  function handleGlobalKey(e) {
    if (e.key === 'Escape') {
      if (!settingsModal.hidden) {
        closeModal();
      } else if (!profileDropdown.hidden) {
        setDropdownOpen(false);
        profileBtn.focus();
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Settings Modal                                                      */
  /* ------------------------------------------------------------------ */
  function openModal() {
    setDropdownOpen(false);
    populateForm();
    settingsModal.hidden = false;
    // Focus first interactive element
    fieldDisplayName.focus();
  }

  function closeModal() {
    // Restore theme to saved setting if user changed it via radio without saving
    applyTheme(settings.theme);
    settingsModal.hidden = true;
    profileBtn.focus();
  }

  function populateForm() {
    fieldDisplayName.value   = settings.displayName;
    fieldEmail.value         = settings.email;
    fieldLanguage.value      = settings.language;
    fieldSafeSearch.checked  = settings.safeSearch;
    fieldSearchHistory.checked = settings.searchHistory;

    // Set theme radio
    var themeRadio = settingsForm.querySelector('input[name="theme"][value="' + settings.theme + '"]');
    if (themeRadio) themeRadio.checked = true;

    // Clear validation state
    clearErrors();
  }

  function handleSave(e) {
    e.preventDefault();
    if (!validateForm()) return;

    var selectedTheme = (settingsForm.querySelector('input[name="theme"]:checked') || {}).value || 'light';

    settings = {
      displayName:   fieldDisplayName.value.trim(),
      email:         fieldEmail.value.trim(),
      language:      fieldLanguage.value,
      theme:         selectedTheme,
      safeSearch:    fieldSafeSearch.checked,
      searchHistory: fieldSearchHistory.checked,
    };

    saveSettings(settings);
    applyTheme(settings.theme);
    updateProfileDisplay();
    settingsModal.hidden = true;
    showToast('Settings saved successfully.');
    profileBtn.focus();
  }

  /* ------------------------------------------------------------------ */
  /*  Form Validation                                                     */
  /* ------------------------------------------------------------------ */
  function validateForm() {
    clearErrors();
    var firstErrorField = null;

    var name = fieldDisplayName.value.trim();
    if (!name) {
      markError(fieldDisplayName, errorDisplayName, 'Display name is required.');
      firstErrorField = firstErrorField || fieldDisplayName;
    } else if (name.length > 60) {
      markError(fieldDisplayName, errorDisplayName, 'Display name must be 60 characters or fewer.');
      firstErrorField = firstErrorField || fieldDisplayName;
    }

    var email = fieldEmail.value.trim();
    if (!email) {
      markError(fieldEmail, errorEmail, 'Email is required.');
      firstErrorField = firstErrorField || fieldEmail;
    } else if (!isValidEmail(email)) {
      markError(fieldEmail, errorEmail, 'Please enter a valid email address.');
      firstErrorField = firstErrorField || fieldEmail;
    }

    if (firstErrorField) {
      firstErrorField.focus();
      return false;
    }
    return true;
  }

  function isValidEmail(value) {
    // Validates email: local@domain.tld, disallows consecutive dots in local or domain parts
    return /^(?!.*\.\.)([a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*)@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/.test(value);
  }

  function markError(input, errorEl, message) {
    input.classList.add('error');
    errorEl.textContent = message;
  }

  function clearErrors() {
    [fieldDisplayName, fieldEmail].forEach(function (el) {
      el.classList.remove('error');
    });
    errorDisplayName.textContent = '';
    errorEmail.textContent = '';
  }

  /* ------------------------------------------------------------------ */
  /*  Profile Display                                                     */
  /* ------------------------------------------------------------------ */
  function updateProfileDisplay() {
    // Update dropdown name/email
    dropdownName.textContent  = settings.displayName || DEFAULTS.displayName;
    dropdownEmail.textContent = settings.email || DEFAULTS.email;

    // Update avatar initial(s) in header + dropdown
    var initial = (settings.displayName || 'U').charAt(0).toUpperCase();
    document.querySelectorAll('.avatar').forEach(function (el) {
      el.textContent = initial;
    });

    // Update lang attribute
    document.documentElement.lang = settings.language || 'en';
  }

  /* ------------------------------------------------------------------ */
  /*  Theme                                                               */
  /* ------------------------------------------------------------------ */
  function applyTheme(theme) {
    if (theme === 'system') {
      var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      theme = prefersDark ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', theme);
  }

  /* ------------------------------------------------------------------ */
  /*  Sign Out                                                            */
  /* ------------------------------------------------------------------ */
  function handleSignOut() {
    settings = Object.assign({}, DEFAULTS);
    saveSettings(settings);
    applyTheme(settings.theme);
    updateProfileDisplay();
    setDropdownOpen(false);
    showToast('Signed out successfully.');
  }

  /* ------------------------------------------------------------------ */
  /*  Toast                                                               */
  /* ------------------------------------------------------------------ */
  var toastTimer;

  function showToast(message) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('show');
    toastTimer = setTimeout(function () {
      toast.classList.remove('show');
    }, 3000);
  }

  /* ------------------------------------------------------------------ */
  /*  localStorage helpers                                                */
  /* ------------------------------------------------------------------ */
  function loadSettings() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return Object.assign({}, DEFAULTS, JSON.parse(raw));
      }
    } catch (e) {
      // ignore parse errors
    }
    return Object.assign({}, DEFAULTS);
  }

  function saveSettings(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      // ignore storage errors (e.g. private browsing quota exceeded)
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Boot                                                                */
  /* ------------------------------------------------------------------ */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
