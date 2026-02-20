const room = document.getElementById("room");
const scene = document.querySelector(".scene");
const controls = document.querySelectorAll(".arrow");
const doorHotspot = document.querySelector(".hotspot-door");
const doorBubble = document.getElementById("doorBubble");
const leftWallHotspots = document.querySelectorAll(".hotspot-word");
const leftWallBubble = document.getElementById("leftWallBubble");
const leftWall = document.querySelector(".wall-left");
const windowHotspot = document.querySelector(".hotspot-window");
const windowModal = document.getElementById("windowModal");
const rightWallHotspots = document.querySelectorAll(".hotspot-cancer");
const rightWallBubble = document.getElementById("rightWallBubble");
const rightWall = document.querySelector(".wall-right");

const views = ["left", "front", "right"];
const viewAngles = {
  left: -90,
  front: 0,
  right: 90,
};

let currentViewIndex = 1;
let bubbleTimerId = null;
let leftBubbleTimerId = null;
let rightBubbleTimerId = null;
let audioContext = null;
let windowOpenedAt = 0;

function renderView() {
  const view = views[currentViewIndex];
  room.style.transform = `translate3d(-50%, -50%, 0) translateZ(var(--camera-z)) rotateY(${viewAngles[view]}deg)`;
}

function turn(direction) {
  const delta = direction === "right" ? 1 : -1;
  currentViewIndex = (currentViewIndex + delta + views.length) % views.length;
  renderView();
}

function getAudioContext() {
  if (!audioContext) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    audioContext = new AudioCtx();
  }
  return audioContext;
}

function playBuzzer() {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === "suspended") {
    ctx.resume();
  }

  const now = ctx.currentTime;
  const notes = [
    { start: 0, from: 190, to: 158, duration: 0.16, level: 0.12 },
    { start: 0.22, from: 150, to: 120, duration: 0.19, level: 0.14 },
  ];

  notes.forEach((note) => {
    const t0 = now + note.start;
    const t1 = t0 + note.duration;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(note.level, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t1);
    gain.connect(ctx.destination);

    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(note.from, t0);
    osc.frequency.exponentialRampToValueAtTime(note.to, t1);
    osc.connect(gain);
    osc.start(t0);
    osc.stop(t1 + 0.01);
  });
}

function showDoorMessage() {
  if (!doorBubble) return;
  doorBubble.classList.add("is-visible");
  if (bubbleTimerId) {
    clearTimeout(bubbleTimerId);
  }
  bubbleTimerId = setTimeout(() => {
    doorBubble.classList.remove("is-visible");
    bubbleTimerId = null;
  }, 2600);
}

function openWindowModal() {
  if (!windowModal) return;
  windowOpenedAt = Date.now();
  windowModal.classList.add("is-open");
  windowModal.setAttribute("aria-hidden", "false");
}

function closeWindowModal() {
  if (!windowModal) return;
  windowModal.classList.remove("is-open");
  windowModal.setAttribute("aria-hidden", "true");
}

function getHotspotBounds(hotspot) {
  const x = parseFloat(hotspot.style.getPropertyValue("--x"));
  const y = parseFloat(hotspot.style.getPropertyValue("--y"));
  const w = parseFloat(hotspot.style.getPropertyValue("--w"));
  const h = parseFloat(hotspot.style.getPropertyValue("--h"));
  return { x, y, w, h };
}

function positionLeftWallBubble(hotspot) {
  if (!leftWallBubble || !hotspot) return;
  const { x, y, w } = getHotspotBounds(hotspot);
  const centerX = x + w / 2;
  const clampedX = Math.max(22, Math.min(78, centerX));
  const clampedTop = Math.max(4, y - 10);
  leftWallBubble.style.left = `${clampedX}%`;
  leftWallBubble.style.top = `${clampedTop}%`;
}

function showLeftWallMessage(hotspot) {
  if (!leftWallBubble) return;
  positionLeftWallBubble(hotspot);
  leftWallBubble.classList.add("is-visible");
  if (leftBubbleTimerId) {
    clearTimeout(leftBubbleTimerId);
  }
  leftBubbleTimerId = setTimeout(() => {
    leftWallBubble.classList.remove("is-visible");
    leftBubbleTimerId = null;
  }, 2600);
}

function positionRightWallBubble(hotspot) {
  if (!rightWallBubble || !hotspot) return;
  const { x, y, w } = getHotspotBounds(hotspot);
  const centerX = x + w / 2;
  const clampedX = Math.max(22, Math.min(78, centerX));
  const clampedTop = Math.max(4, y - 10);
  rightWallBubble.style.left = `${clampedX}%`;
  rightWallBubble.style.top = `${clampedTop}%`;
}

function showRightWallMessage(hotspot) {
  if (!rightWallBubble) return;
  positionRightWallBubble(hotspot);
  rightWallBubble.classList.add("is-visible");
  if (rightBubbleTimerId) {
    clearTimeout(rightBubbleTimerId);
  }
  rightBubbleTimerId = setTimeout(() => {
    rightWallBubble.classList.remove("is-visible");
    rightBubbleTimerId = null;
  }, 2600);
}

function findWordHotspotAtPoint(wall, hotspots, clientX, clientY) {
  if (!wall || !hotspots.length) return null;
  const rect = wall.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
    return null;
  }

  const xPct = ((clientX - rect.left) / rect.width) * 100;
  const yPct = ((clientY - rect.top) / rect.height) * 100;

  return (
    Array.from(hotspots).find((hotspot) => {
      const { x, y, w, h } = getHotspotBounds(hotspot);
      return xPct >= x && xPct <= x + w && yPct >= y && yPct <= y + h;
    }) || null
  );
}

function pointInWindowRegion(clientX, clientY) {
  if (!leftWall) return false;
  const rect = leftWall.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
    return false;
  }

  const xPct = ((clientX - rect.left) / rect.width) * 100;
  const yPct = ((clientY - rect.top) / rect.height) * 100;

  const windowX = 29;
  const windowY = 42;
  const windowW = 34;
  const windowH = 44;
  return (
    xPct >= windowX &&
    xPct <= windowX + windowW &&
    yPct >= windowY &&
    yPct <= windowY + windowH
  );
}

controls.forEach((control) => {
  control.addEventListener("click", () => turn(control.dataset.turn));
});

if (windowHotspot) {
  const onWindowActivate = (event) => {
    event.preventDefault();
    event.stopPropagation();
    openWindowModal();
  };
  windowHotspot.addEventListener("click", onWindowActivate);
}

if (windowModal) {
  windowModal.addEventListener("click", (event) => {
    if (Date.now() - windowOpenedAt < 250) return;
    if (event.target === windowModal) {
      closeWindowModal();
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeWindowModal();
  }
});

if (doorHotspot) {
  doorHotspot.addEventListener("click", () => {
    playBuzzer();
    showDoorMessage();
  });
}

leftWallHotspots.forEach((hotspot) => {
  hotspot.addEventListener("pointerup", (event) => {
    event.preventDefault();
    showLeftWallMessage(hotspot);
  });
  hotspot.addEventListener("click", (event) => {
    event.preventDefault();
    showLeftWallMessage(hotspot);
  });
});

rightWallHotspots.forEach((hotspot) => {
  hotspot.addEventListener("pointerup", (event) => {
    event.preventDefault();
    showRightWallMessage(hotspot);
  });
  hotspot.addEventListener("click", (event) => {
    event.preventDefault();
    showRightWallMessage(hotspot);
  });
});

if (scene) {
  scene.addEventListener("click", (event) => {
    if (event.target.closest(".arrow-controls")) return;
    if (event.target.closest(".hotspot-door")) return;
    if (event.target.closest(".hotspot-window")) return;
    const activeView = views[currentViewIndex];
    if (activeView === "left") {
      if (pointInWindowRegion(event.clientX, event.clientY)) {
        openWindowModal();
        return;
      }
      const leftHotspot = findWordHotspotAtPoint(leftWall, leftWallHotspots, event.clientX, event.clientY);
      if (leftHotspot) {
        showLeftWallMessage(leftHotspot);
      }
      return;
    }
    if (activeView === "right") {
      const rightHotspot = findWordHotspotAtPoint(rightWall, rightWallHotspots, event.clientX, event.clientY);
      if (rightHotspot) {
        showRightWallMessage(rightHotspot);
      }
    }
  });
}

renderView();
