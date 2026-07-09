// Runs synchronously before first paint so light-theme users never see a dark
// flash. Kept as an external file so the CSP needs no inline-script exception.
;(function () {
  try {
    var theme = localStorage.getItem('bettertts-theme')
    if (theme !== 'light' && theme !== 'dark') {
      theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
    }
    document.documentElement.dataset.theme = theme
    // Keep browser/PWA chrome in sync with the applied theme from first paint.
    var meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#05080d' : '#eef3f8')
  } catch {
    /* storage blocked — App applies the theme post-mount */
  }
})()