/**
 * i18n.js - Internationalization utility
 * Handles language detection and translation management
 */

// Current language state
let currentLanguage = 'auto';
let effectiveLanguage = 'en'; // The actual language being used
let messages = {}; // Loaded messages

/**
 * Initialize i18n system
 * Detects browser language and sets up translations
 */
async function initI18n() {
  // Get saved language preference
  const data = await chrome.storage.sync.get('marklogData');
  if (data.marklogData && data.marklogData.settings && data.marklogData.settings.language) {
    currentLanguage = data.marklogData.settings.language;
  }

  // Determine effective language
  if (currentLanguage === 'auto') {
    const browserLang = chrome.i18n.getUILanguage();
    effectiveLanguage = browserLang.startsWith('ko') ? 'ko' : 'en';
  } else {
    effectiveLanguage = currentLanguage;
  }

  // Load messages for the effective language
  await loadMessages(effectiveLanguage);

  // Apply translations to the page
  applyTranslations();
}

/**
 * Load messages from locale file
 * @param {string} locale - Locale code (en, ko)
 */
async function loadMessages(locale) {
  try {
    const response = await fetch(`/_locales/${locale}/messages.json`);
    const data = await response.json();
    messages = data;
  } catch (error) {
    console.warn(`Failed to load messages for ${locale}:`, error);
    // Fallback to English
    if (locale !== 'en') {
      const response = await fetch('/_locales/en/messages.json');
      const data = await response.json();
      messages = data;
    }
  }
}

/**
 * Get translated message
 * @param {string} key - Message key from messages.json
 * @param {string} fallback - Fallback text if translation not found
 * @returns {string} Translated message
 */
function t(key, fallback = '') {
  return messages[key]?.message || fallback || key;
}

/**
 * Apply translations to all elements with data-i18n attribute
 */
function applyTranslations() {
  // Translate elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    const translated = t(key);

    // Handle different element types
    if (element.tagName === 'INPUT' && element.type !== 'submit') {
      element.placeholder = translated;
    } else {
      element.textContent = translated;
    }
  });

  // Translate elements with data-i18n-placeholder attribute
  document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
    const key = element.getAttribute('data-i18n-placeholder');
    element.placeholder = t(key);
  });

  // Translate elements with data-i18n-title attribute
  document.querySelectorAll('[data-i18n-title]').forEach(element => {
    const key = element.getAttribute('data-i18n-title');
    element.title = t(key);
  });

  // Translate elements with data-i18n-aria-label attribute
  document.querySelectorAll('[data-i18n-aria-label]').forEach(element => {
    const key = element.getAttribute('data-i18n-aria-label');
    element.setAttribute('aria-label', t(key));
  });
}

/**
 * Change language and reload translations
 * @param {string} lang - Language code ('auto', 'en', 'ko')
 */
async function changeLanguage(lang) {
  currentLanguage = lang;

  // Determine effective language
  if (lang === 'auto') {
    const browserLang = chrome.i18n.getUILanguage();
    effectiveLanguage = browserLang.startsWith('ko') ? 'ko' : 'en';
  } else {
    effectiveLanguage = lang;
  }

  // Reload messages and apply translations
  await loadMessages(effectiveLanguage);
  applyTranslations();
}

/**
 * Get current effective language
 * @returns {string} Current language code
 */
function getCurrentLanguage() {
  return effectiveLanguage;
}

/**
 * Get current language preference (including 'auto')
 * @returns {string} Language preference
 */
function getLanguagePreference() {
  return currentLanguage;
}
