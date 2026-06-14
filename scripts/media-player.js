(function () {
  const dock = document.querySelector("#media-player");
  const frameWrap = document.querySelector("#media-frame-wrap");
  const frame = document.querySelector("#media-frame");
  const title = document.querySelector("#media-title");
  const label = document.querySelector("#media-label");
  const openLink = document.querySelector("#media-open-link");
  const minimizeButton = document.querySelector("#media-minimize");
  const closeButton = document.querySelector("#media-close");
  const playerButtons = Array.from(document.querySelectorAll("[data-player-open]"));

  if (!dock || !frameWrap || !frame || !title || !label || !openLink || !minimizeButton) return;

  const players = {
    live: {
      label: "Live radio",
      title: "NewsRadio 740 KTRH live",
      embed: "https://www.iheart.com/live/newsradio-740-ktrh-2285/?embed=true&theme=dark",
      href: "https://www.iheart.com/live/newsradio-740-ktrh-2285/",
      height: "118",
    },
    podcast: {
      label: "Podcast",
      title: "The Michael Berry Show podcast",
      embed: "https://www.iheart.com/podcast/44-the-michael-berry-show-27764850/?embed=true&theme=dark",
      href: "https://www.iheart.com/podcast/44-the-michael-berry-show-27764850/",
      height: "500",
    },
  };

  let currentKind = "";

  function setActive(kind) {
    const player = players[kind];
    if (!player) return;

    currentKind = kind;
    label.textContent = player.label;
    title.textContent = player.title;
    openLink.href = player.href;
    if (frame.getAttribute("src") !== player.embed) frame.src = player.embed;
    frame.height = player.height;
    dock.hidden = false;
    dock.dataset.playerState = "open";
    dock.dataset.playerKind = kind;
    frameWrap.hidden = false;
    minimizeButton.textContent = "Minimize";
    minimizeButton.setAttribute("aria-expanded", "true");

    playerButtons.forEach((button) => {
      const selected = button.dataset.playerOpen === kind;
      button.classList.toggle("is-active", selected);
      if (button.tagName === "BUTTON") button.setAttribute("aria-pressed", String(selected));
    });
  }

  function setMinimized(isMinimized) {
    if (!currentKind || !players[currentKind]) return;
    dock.hidden = false;
    frameWrap.hidden = false;
    dock.dataset.playerState = isMinimized ? "minimized" : "open";
    minimizeButton.textContent = isMinimized ? "Expand" : "Minimize";
    minimizeButton.setAttribute("aria-expanded", String(!isMinimized));
  }

  function closePlayer() {
    frameWrap.hidden = true;
    dock.hidden = true;
    frame.removeAttribute("src");
    frame.removeAttribute("height");
    dock.dataset.playerState = "hidden";
    delete dock.dataset.playerKind;
    currentKind = "";
    label.textContent = "Listen";
    title.textContent = "KTRH 740 AM and The Michael Berry Show";
    minimizeButton.textContent = "Minimize";
    minimizeButton.setAttribute("aria-expanded", "false");

    playerButtons.forEach((button) => {
      button.classList.remove("is-active");
      if (button.tagName === "BUTTON") button.setAttribute("aria-pressed", "false");
    });
  }

  playerButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      const kind = button.dataset.playerOpen;
      if (!players[kind]) return;
      event.preventDefault();
      setActive(kind);
    });
  });

  minimizeButton.addEventListener("click", () => {
    setMinimized(dock.dataset.playerState !== "minimized");
  });

  if (closeButton) {
    closeButton.addEventListener("click", closePlayer);
  }
})();
