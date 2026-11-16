// Per-device choices, applied before first paint:
// - D23: the theme (light, dark or system);
// - the logo (classic or tiles): <html data-logo> for the static splash, and the favicon, apple-touch-icon and
//   manifest links, so the browser installs and updates the app with that icon. Paths mirror src/client/lib/logo.ts.
(function () {
  var root = document.documentElement;
  try {
    var t = localStorage.getItem("zamane.theme");
    if (t === "light" || t === "dark") root.setAttribute("data-theme", t);
  } catch (e) {
    /* private window: system theme */
  }
  try {
    if (localStorage.getItem("zamane.logo") !== "tiles") return;
    root.setAttribute("data-logo", "tiles");
    var links = {
      'link[rel="icon"][type="image/svg+xml"]': "/icons/tiles/favicon.svg",
      'link[rel="icon"]:not([type])': "/icons/tiles/favicon.ico",
      'link[rel="apple-touch-icon"]': "/icons/tiles/apple-touch-icon-180x180.png",
      'link[rel="manifest"]': "/manifest-tiles.webmanifest",
    };
    for (var sel in links) {
      var el = document.head.querySelector(sel);
      if (el) el.setAttribute("href", links[sel]);
    }
  } catch (e) {
    /* private window: classic logo */
  }
})();
