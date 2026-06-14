(function () {
  const dock = document.querySelector("#media-player");
  const frameWrap = document.querySelector("#media-frame-wrap");
  const frame = document.querySelector("#media-frame");
  const title = document.querySelector("#media-title");
  const label = document.querySelector("#media-label");
  const openLink = document.querySelector("#media-open-link");
  const closeButton = document.querySelector("#media-close");
  const playerButtons = Array.from(document.querySelectorAll("[data-player-open]"));

  if (!dock || !frameWrap || !frame || !title || !label || !openLink) return;

  const players = {
    live: {
      label: "Live radio",
      title: "NewsRadio 740 KTRH live",
      embed: "https://www.iheart.com/live/newsradio-740-ktrh-2285/?embed=true&theme=dark",
      href: "https://www.iheart.com/live/newsradio-740-ktrh-2285/",
      height: "200",
    },
    podcast: {
      label: "Podcast",
      title: "The Michael Berry Show podcast",
      embed: "https://www.iheart.com/podcast/44-the-michael-berry-show-27764850/?embed=true&theme=dark",
      href: "https://www.iheart.com/podcast/44-the-michael-berry-show-27764850/",
      height: "500",
    },
  };

  function setActive(kind) {
    const player = players[kind];
    if (!player) return;

    label.textContent = player.label;
    title.textContent = player.title;
    openLink.href = player.href;
    frame.src = player.embed;
    frame.height = player.height;
    dock.hidden = false;
    dock.dataset.playerState = "open";
    dock.dataset.playerKind = kind;
    frameWrap.hidden = false;

    playerButtons.forEach((button) => {
      const selected = button.dataset.playerOpen === kind;
      button.classList.toggle("is-active", selected);
      if (button.tagName === "BUTTON") button.setAttribute("aria-pressed", String(selected));
    });
  }

  function closePlayer() {
    frameWrap.hidden = true;
    dock.hidden = true;
    frame.removeAttribute("src");
    frame.removeAttribute("height");
    dock.dataset.playerState = "hidden";
    delete dock.dataset.playerKind;
    label.textContent = "Listen";
    title.textContent = "KTRH 740 AM and The Michael Berry Show";

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

  if (closeButton) {
    closeButton.addEventListener("click", closePlayer);
  }
})();
