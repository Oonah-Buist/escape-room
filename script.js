const room = document.getElementById("room");
const scene = document.querySelector(".scene");
const controls = document.querySelectorAll(".arrow");
const doorHotspot = document.querySelector(".hotspot-door");
const doorBubble = document.getElementById("doorBubble");
const leftWallHotspots = document.querySelectorAll(".hotspot-word");
const leftWallBubble = document.getElementById("leftWallBubble");
const leftWall = document.querySelector(".wall-left");

const views = ["left", "front", "right"];
const viewAngles = {
  left: -90,
  front: 0,
  right: 90,
};

let currentViewIndex = 1;
let bubbleTimerId = null;
let leftBubbleTimerId = null;
let audioContext = null;

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

function getHotspotBounds(hotspot) {
  const x = parseFloat(hotspot.style.getPropertyValue("--x"));
  const y = parseFloat(hotspot.style.getPropertyValue("--y"));
  const w = parseFloat(hotspot.style.getPropertyValue("--w"));
  const h = parseFloat(hotspot.style.getPropertyValue("--h"));
  return { x, y, w, h };
}

function positionLeftWallBubble(hotspot) {
  if (!leftWallBubble || !hotspot) return;
  const { x, y, w, h } = getHotspotBounds(hotspot);
  const centerX = x + w / 2;
  const clampedX = Math.min(76, Math.max(24, centerX));
  const top = y < 16 ? y + h + 1.8 : y - 9.2;
  const clampedTop = Math.min(86, Math.max(4, top));
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

function findLeftHotspotAtPoint(clientX, clientY) {
  if (!leftWall || !leftWallHotspots.length) return null;
  const rect = leftWall.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
    return null;
  }

  const xPct = ((clientX - rect.left) / rect.width) * 100;
  const yPct = ((clientY - rect.top) / rect.height) * 100;

  return Array.from(leftWallHotspots).find((hotspot) => {
    const { x, y, w, h } = getHotspotBounds(hotspot);
    return xPct >= x && xPct <= x + w && yPct >= y && yPct <= y + h;
  }) || null;
}

controls.forEach((control) => {
  const onTurn = (event) => {
    event.preventDefault();
    event.stopPropagation();
    turn(control.dataset.turn);
  };
  control.addEventListener("pointerup", onTurn);
  control.addEventListener("click", onTurn);
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
}

if (scene) {
  scene.addEventListener("click", (event) => {
    if (views[currentViewIndex] !== "left") return;
    if (event.target.closest(".hotspot-door")) return;
    const hotspot = findLeftHotspotAtPoint(event.clientX, event.clientY);
    if (hotspot) {
      showLeftWallMessage(hotspot);
    }
  });
}

renderView();
