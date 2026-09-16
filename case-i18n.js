/* Shared ES/EN toggle for case study pages. Each page defines its own
   DICT object ({key: {es:'...', en:'...'}}) and calls initCaseLang(DICT). */
function initCaseLang(dict) {
  function apply(lang) {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-lb]').forEach(b =>
      b.classList.toggle('active', b.dataset.lb === lang)
    );
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const entry = dict[el.dataset.i18n];
      if (entry) el.innerHTML = entry[lang] || entry.es;
    });
  }
  window.setCaseLang = function(lang) {
    try { localStorage.setItem('nm_lang', lang); } catch (e) {}
    apply(lang);
  };
  let lang = 'es';
  try { lang = localStorage.getItem('nm_lang') || 'es'; } catch (e) {}
  apply(lang);
}
