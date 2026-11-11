// D23: the theme choice (light, dark or system) is stored per device and applied before first paint.
(function () {
  try {
    var t = localStorage.getItem("zamane.theme");
    if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t);
  } catch (e) {
    /* private window: system theme */
  }
})();
