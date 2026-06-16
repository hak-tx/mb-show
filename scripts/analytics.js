(function () {
  const analytics = window.MB_SHOW_ANALYTICS || {};
  const measurementId = String(analytics.measurementId || "").trim();

  if (!/^G-[A-Z0-9]+$/i.test(measurementId)) {
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function () {
      window.dataLayer.push(arguments);
    };

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);

  window.gtag("js", new Date());
  window.gtag("config", measurementId);
})();
