const room = document.getElementById("room");
const scene = document.querySelector(".scene");
const controls = document.querySelectorAll(".arrow");
const doorHotspot = document.querySelector(".hotspot-door");
const switchHotspot = document.querySelector(".hotspot-switch");
const bookHotspot = document.querySelector(".hotspot-book");
const bottleHotspot = document.querySelector(".hotspot-bottle");
const doorBubble = document.getElementById("doorBubble");
const frontWall = document.querySelector(".wall-front");
const leftWallHotspots = document.querySelectorAll(".hotspot-word");
const leftWallBubble = document.getElementById("leftWallBubble");
const leftWall = document.querySelector(".wall-left");
const backWall = document.querySelector(".wall-back");
const windowHotspot = document.querySelector(".hotspot-window");
const windowModal = document.getElementById("windowModal");
const curtainHotspot = document.querySelector(".hotspot-curtain");
const curtainModal = document.getElementById("curtainModal");
const switchModal = document.getElementById("switchModal");
const bookModal = document.getElementById("bookModal");
const bottleModal = document.getElementById("bottleModal");
const rightWallHotspots = document.querySelectorAll(".hotspot-cancer");
const rightWallBubble = document.getElementById("rightWallBubble");
const rightWall = document.querySelector(".wall-right");
const backgroundMusic = document.getElementById("bgMusic");
const soundToggle = document.getElementById("soundToggle");
const soundVolume = document.getElementById("soundVolume");
const modalCloseButtons = document.querySelectorAll(".modal-close");
const modalActionButtons = document.querySelectorAll(".modal-action");
const mobilePopup = document.getElementById("mobilePopup");
const mobilePopupTitle = document.getElementById("mobilePopupTitle");
const mobilePopupMessage = document.getElementById("mobilePopupMessage");
const mobilePopupClose = document.getElementById("mobilePopupClose");
const mobilePopupReturn = document.getElementById("mobilePopupReturn");
const mobileOpenPdf = document.getElementById("mobileOpenPdf");
const mobileModeQuery = window.matchMedia("(max-width: 900px) and (hover: none) and (pointer: coarse)");

const userAgent = navigator.userAgent || "";
const isSafariBrowser =
  /Safari/i.test(userAgent) &&
  !/Chrome|CriOS|Chromium|Edg|OPR|FxiOS/i.test(userAgent);
const isIOSWebKit =
  /AppleWebKit/i.test(userAgent) &&
  (/iPad|iPhone|iPod/i.test(userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
if (isSafariBrowser) {
  document.documentElement.classList.add("is-safari");
}
if (isIOSWebKit) {
  document.documentElement.classList.add("is-ios-webkit");
}

const views = ["left", "front", "right", "back"];
const mobileViewSequence = ["front", "front", "right", "right", "back", "back", "left", "left"];
const mobileHalfStepOffsetDeg = 18;
const viewAngles = {
  left: -90,
  front: 0,
  right: 90,
  back: 180,
};

let currentViewIndex = 1;
let currentRotationDeg = viewAngles.front;
let mobileStepIndex = 0;
let bubbleTimerId = null;
let leftBubbleTimerId = null;
let rightBubbleTimerId = null;
let audioContext = null;
let windowOpenedAt = 0;
let curtainOpenedAt = 0;
let switchOpenedAt = 0;
let bookOpenedAt = 0;
let bottleOpenedAt = 0;
let soundEnabled = true;
let soundVolumeLevel = 0.7;
const baseMusicVolume = 0.08;
let isMobileMode = mobileModeQuery.matches;
let mobilePopupOpenedAt = 0;
let touchStartX = 0;
let touchStartY = 0;
let touchTracking = false;

function normalizeAngle(angle) {
  return ((angle % 360) + 360) % 360;
}

function getShortestDelta(currentNormalized, targetNormalized) {
  let delta = ((targetNormalized - currentNormalized + 540) % 360) - 180;
  if (delta === -180) delta = 180;
  return delta;
}

function getViewCenterAngleNormalized(viewName) {
  return normalizeAngle(viewAngles[viewName] || 0);
}

function getCurrentViewName() {
  if (isMobileMode) {
    return mobileViewSequence[mobileStepIndex];
  }
  return views[currentViewIndex];
}

function getMobileWallStartStep(viewName) {
  return mobileViewSequence.indexOf(viewName);
}

function getMobileStepAngleNormalized(stepIndex) {
  const normalizedStep = ((stepIndex % 8) + 8) % 8;
  const stepView = mobileViewSequence[normalizedStep];
  const center = getViewCenterAngleNormalized(stepView);
  const offset = normalizedStep % 2 === 0 ? -mobileHalfStepOffsetDeg : mobileHalfStepOffsetDeg;
  return normalizeAngle(center + offset);
}

function getClosestMobileTargetForView(viewName, currentAngle) {
  const currentNormalized = normalizeAngle(currentAngle);
  const wallStart = getMobileWallStartStep(viewName);
  if (wallStart === -1) {
    return { stepIndex: mobileStepIndex, angle: getMobileStepAngleNormalized(mobileStepIndex), delta: 0 };
  }
  const candidates = [
    { stepIndex: wallStart, angle: getMobileStepAngleNormalized(wallStart) },
    { stepIndex: wallStart + 1, angle: getMobileStepAngleNormalized(wallStart + 1) },
  ];

  let best = null;
  candidates.forEach((candidate) => {
    const delta = getShortestDelta(currentNormalized, candidate.angle);
    if (!best || Math.abs(delta) < Math.abs(best.delta)) {
      best = { ...candidate, delta };
    }
  });

  return best;
}

function tryPlayBackgroundMusic() {
  if (!backgroundMusic || !soundEnabled) return;
  const playPromise = backgroundMusic.play();
  if (playPromise && typeof playPromise.catch === "function") {
    playPromise.catch(() => {});
  }
}

function updateVolumeSliderVisual() {
  if (!soundVolume) return;
  const sliderPercent = Math.max(0, Math.min(100, Math.round(soundVolumeLevel * 100)));
  soundVolume.style.setProperty("--volume-percent", `${sliderPercent}%`);
}

function applySoundState() {
  if (soundToggle) {
    soundToggle.classList.toggle("is-muted", !soundEnabled);
    soundToggle.setAttribute("aria-pressed", String(!soundEnabled));
    soundToggle.setAttribute("aria-label", soundEnabled ? "Turn sound off" : "Turn sound on");
    soundToggle.title = soundEnabled ? "Sound on" : "Sound off";
  }

  if (soundVolume) {
    soundVolume.value = String(Math.round(soundVolumeLevel * 100));
  }
  updateVolumeSliderVisual();

  if (!backgroundMusic) return;
  backgroundMusic.volume = baseMusicVolume * soundVolumeLevel;
  if (soundEnabled) {
    backgroundMusic.muted = false;
    tryPlayBackgroundMusic();
  } else {
    backgroundMusic.muted = true;
    backgroundMusic.pause();
  }
}

function closeMobilePopup() {
  if (!mobilePopup) return;
  mobilePopup.classList.remove("is-open");
  mobilePopup.setAttribute("aria-hidden", "true");
}

function openMobilePopup({ title, message, pdfPath = "" }) {
  if (!mobilePopup || !mobilePopupTitle || !mobilePopupMessage || !mobileOpenPdf) return;
  mobilePopupOpenedAt = Date.now();
  mobilePopupTitle.textContent = title || "Information";
  mobilePopupMessage.textContent = message || "";
  const hasPdf = Boolean(pdfPath);
  mobileOpenPdf.classList.toggle("is-visible", hasPdf);
  mobileOpenPdf.setAttribute("aria-hidden", String(!hasPdf));
  mobileOpenPdf.href = hasPdf ? pdfPath : "#";
  mobilePopup.classList.add("is-open");
  mobilePopup.setAttribute("aria-hidden", "false");
}

function openMobilePdfPrompt(title, pdfPath) {
  openMobilePopup({
    title,
    message: "Tap Open PDF to view in a new tab.\nThen tap Return to room to continue.",
    pdfPath,
  });
}

function isAnyPopupOpen() {
  return Boolean(
    windowModal?.classList.contains("is-open") ||
      curtainModal?.classList.contains("is-open") ||
      switchModal?.classList.contains("is-open") ||
      bookModal?.classList.contains("is-open") ||
      bottleModal?.classList.contains("is-open") ||
      mobilePopup?.classList.contains("is-open")
  );
}

function applyTapTargetSizing() {
  const hotspotGroups = [
    { wall: leftWall, hotspots: leftWallHotspots },
    { wall: rightWall, hotspots: rightWallHotspots },
  ];

  hotspotGroups.forEach(({ wall, hotspots }) => {
    const wallImage = wall?.querySelector("img");
    const wallWidth = wallImage?.naturalWidth || 1000;
    const wallHeight = wallImage?.naturalHeight || 912;
    const minW = (44 / wallWidth) * 100;
    const minH = (44 / wallHeight) * 100;

    hotspots.forEach((hotspot) => {
      if (!isMobileMode) {
        hotspot.style.removeProperty("--tap-x");
        hotspot.style.removeProperty("--tap-y");
        hotspot.style.removeProperty("--tap-w");
        hotspot.style.removeProperty("--tap-h");
        return;
      }

      const { x, y, w, h } = getHotspotBounds(hotspot);
      const paddedW = Math.max(w, minW);
      const paddedH = Math.max(h, minH);
      const paddedX = Math.max(0, Math.min(100 - paddedW, x - (paddedW - w) / 2));
      const paddedY = Math.max(0, Math.min(100 - paddedH, y - (paddedH - h) / 2));

      hotspot.style.setProperty("--tap-x", `${paddedX}%`);
      hotspot.style.setProperty("--tap-y", `${paddedY}%`);
      hotspot.style.setProperty("--tap-w", `${paddedW}%`);
      hotspot.style.setProperty("--tap-h", `${paddedH}%`);
    });
  });
}

function syncMobileMode() {
  const wasMobile = isMobileMode;
  isMobileMode = mobileModeQuery.matches;
  document.body.classList.toggle("is-mobile-mode", isMobileMode);
  const activeView = wasMobile ? mobileViewSequence[mobileStepIndex] : views[currentViewIndex];

  if (isMobileMode) {
    const target = getClosestMobileTargetForView(activeView, currentRotationDeg);
    mobileStepIndex = target.stepIndex;
    currentRotationDeg += target.delta;
    currentViewIndex = views.indexOf(mobileViewSequence[mobileStepIndex]);
  } else {
    currentViewIndex = views.indexOf(activeView);
    const normalizedCurrent = normalizeAngle(currentRotationDeg);
    const normalizedTarget = getViewCenterAngleNormalized(activeView);
    currentRotationDeg += getShortestDelta(normalizedCurrent, normalizedTarget);
  }

  renderView();
  applyTapTargetSizing();
}

function showLeftWallInfo(hotspot) {
  if (!hotspot) return;
  if (isMobileMode) {
    openMobilePopup({
      title: hotspot.getAttribute("aria-label") || "Condition",
      message: "This condition has\nPPARy involvement",
    });
    return;
  }
  showLeftWallMessage(hotspot);
}

function showRightWallInfo(hotspot) {
  if (!hotspot) return;
  if (isMobileMode) {
    openMobilePopup({
      title: hotspot.getAttribute("aria-label") || "Cancer",
      message: "This cancer\nhas PPARy involvement",
    });
    return;
  }
  showRightWallMessage(hotspot);
}

function renderView() {
  room.style.transform = `translate3d(-50%, -50%, 0) translateZ(var(--camera-z)) rotateY(${currentRotationDeg}deg)`;
}

function turn(direction) {
  if (isMobileMode) {
    const stepDelta = direction === "right" ? 1 : -1;
    mobileStepIndex = ((mobileStepIndex + stepDelta) % 8 + 8) % 8;
    const targetAngle = getMobileStepAngleNormalized(mobileStepIndex);
    const normalizedCurrent = normalizeAngle(currentRotationDeg);
    currentRotationDeg += getShortestDelta(normalizedCurrent, targetAngle);
    currentViewIndex = views.indexOf(mobileViewSequence[mobileStepIndex]);
    renderView();
    return;
  }

  const delta = direction === "right" ? 1 : -1;
  currentViewIndex = (currentViewIndex + delta + views.length) % views.length;
  currentRotationDeg += direction === "right" ? 90 : -90;
  renderView();
}

function goToView(viewName) {
  const nextIndex = views.indexOf(viewName);
  if (nextIndex === -1) return;
  const normalizedCurrent = normalizeAngle(currentRotationDeg);

  if (isMobileMode) {
    const target = getClosestMobileTargetForView(viewName, currentRotationDeg);
    mobileStepIndex = target.stepIndex;
    currentRotationDeg += target.delta;
    currentViewIndex = views.indexOf(mobileViewSequence[mobileStepIndex]);
    renderView();
    return;
  }

  const normalizedTarget = getViewCenterAngleNormalized(viewName);
  currentRotationDeg += getShortestDelta(normalizedCurrent, normalizedTarget);
  currentViewIndex = nextIndex;
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
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === "suspended") {
    ctx.resume();
  }

  const now = ctx.currentTime;
  const notes = [
    { start: 0, freq: 1318.5, duration: 0.12, level: 0.05 },
    { start: 0.09, freq: 1568, duration: 0.12, level: 0.045 },
    { start: 0.18, freq: 1975.5, duration: 0.2, level: 0.04 },
  ];

  notes.forEach((note) => {
    const noteLevel = note.level * soundVolumeLevel;
    if (noteLevel <= 0) return;
    const t0 = now + note.start;
    const t1 = t0 + note.duration;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(noteLevel, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t1);
    gain.connect(ctx.destination);

    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(note.freq, t0);
    osc.connect(gain);
    osc.start(t0);
    osc.stop(t1 + 0.01);

    const shimmer = ctx.createOscillator();
    shimmer.type = "sine";
    shimmer.frequency.setValueAtTime(note.freq * 2, t0);
    const shimmerGain = ctx.createGain();
    shimmerGain.gain.setValueAtTime(0.0001, t0);
    shimmerGain.gain.exponentialRampToValueAtTime(noteLevel * 0.32, t0 + 0.01);
    shimmerGain.gain.exponentialRampToValueAtTime(0.0001, t1);
    shimmer.connect(shimmerGain);
    shimmerGain.connect(ctx.destination);
    shimmer.start(t0);
    shimmer.stop(t1 + 0.01);
  });
}

function playSparkle() {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === "suspended") {
    ctx.resume();
  }

  const now = ctx.currentTime;
  const notes = [
    { start: 0, freq: 1200, duration: 0.12, level: 0.06 },
    { start: 0.08, freq: 1580, duration: 0.1, level: 0.05 },
    { start: 0.16, freq: 1880, duration: 0.14, level: 0.045 },
  ];

  notes.forEach((note) => {
    const noteLevel = note.level * soundVolumeLevel;
    if (noteLevel <= 0) return;
    const t0 = now + note.start;
    const t1 = t0 + note.duration;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(noteLevel, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t1);
    gain.connect(ctx.destination);

    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(note.freq, t0);
    osc.frequency.exponentialRampToValueAtTime(note.freq * 1.08, t1);
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
  if (isMobileMode) {
    openMobilePdfPrompt("Window document", "Assets/Window.pdf");
    return;
  }
  windowOpenedAt = Date.now();
  windowModal.classList.add("is-open");
  windowModal.setAttribute("aria-hidden", "false");
}

function closeWindowModal() {
  if (isMobileMode) {
    closeMobilePopup();
    return;
  }
  if (!windowModal) return;
  windowModal.classList.remove("is-open");
  windowModal.setAttribute("aria-hidden", "true");
}

function openCurtainModal() {
  if (!curtainModal) return;
  if (isMobileMode) {
    openMobilePdfPrompt("Curtain document", "Assets/Curtain.pdf");
    return;
  }
  curtainOpenedAt = Date.now();
  curtainModal.classList.add("is-open");
  curtainModal.setAttribute("aria-hidden", "false");
}

function closeCurtainModal() {
  if (isMobileMode) {
    closeMobilePopup();
    return;
  }
  if (!curtainModal) return;
  curtainModal.classList.remove("is-open");
  curtainModal.setAttribute("aria-hidden", "true");
}

function openSwitchModal() {
  if (!switchModal) return;
  if (isMobileMode) {
    openMobilePdfPrompt("Light switch document", "Assets/Light%20switch.pdf");
    return;
  }
  switchOpenedAt = Date.now();
  switchModal.classList.add("is-open");
  switchModal.setAttribute("aria-hidden", "false");
}

function closeSwitchModal() {
  if (isMobileMode) {
    closeMobilePopup();
    return;
  }
  if (!switchModal) return;
  switchModal.classList.remove("is-open");
  switchModal.setAttribute("aria-hidden", "true");
}

function openBookModal() {
  if (!bookModal) return;
  if (isMobileMode) {
    openMobilePdfPrompt("Book document", "Assets/Book.pdf");
    return;
  }
  bookOpenedAt = Date.now();
  bookModal.classList.add("is-open");
  bookModal.setAttribute("aria-hidden", "false");
}

function closeBookModal() {
  if (isMobileMode) {
    closeMobilePopup();
    return;
  }
  if (!bookModal) return;
  bookModal.classList.remove("is-open");
  bookModal.setAttribute("aria-hidden", "true");
}

function openBottleModal() {
  if (!bottleModal) return;
  if (isMobileMode) {
    openMobilePdfPrompt("Bottle document", "Assets/Bottle.pdf");
    return;
  }
  bottleOpenedAt = Date.now();
  bottleModal.classList.add("is-open");
  bottleModal.setAttribute("aria-hidden", "false");
}

function closeBottleModal() {
  if (isMobileMode) {
    closeMobilePopup();
    return;
  }
  if (!bottleModal) return;
  bottleModal.classList.remove("is-open");
  bottleModal.setAttribute("aria-hidden", "true");
}

function closeModalByElement(modalElement) {
  if (!modalElement) return;
  if (modalElement === windowModal) {
    closeWindowModal();
    return;
  }
  if (modalElement === curtainModal) {
    closeCurtainModal();
    return;
  }
  if (modalElement === switchModal) {
    closeSwitchModal();
    return;
  }
  if (modalElement === bookModal) {
    closeBookModal();
    return;
  }
  if (modalElement === bottleModal) {
    closeBottleModal();
  }
}

function savePdf(pdfPath) {
  if (!pdfPath) return;
  const link = document.createElement("a");
  link.href = pdfPath;
  const fileName = pdfPath.split("/").pop() || "document.pdf";
  link.download = decodeURIComponent(fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function printPdf(pdfPath) {
  if (!pdfPath) return;
  const printUrl = `${pdfPath}#toolbar=0&navpanes=0&scrollbar=1`;
  const printWindow = window.open(printUrl, "_blank");
  if (!printWindow) return;

  const tryPrint = () => {
    try {
      printWindow.focus();
      printWindow.print();
    } catch (_) {
      // Ignore print failures from browser restrictions.
    }
  };

  setTimeout(tryPrint, 1100);
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

function pointInCurtainRegion(clientX, clientY) {
  if (!rightWall) return false;
  const rect = rightWall.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
    return false;
  }

  const xPct = ((clientX - rect.left) / rect.width) * 100;
  const yPct = ((clientY - rect.top) / rect.height) * 100;

  const curtainX = 74;
  const curtainY = 0;
  const curtainW = 26;
  const curtainH = 100;
  return (
    xPct >= curtainX &&
    xPct <= curtainX + curtainW &&
    yPct >= curtainY &&
    yPct <= curtainY + curtainH
  );
}

function pointInSwitchRegion(clientX, clientY) {
  if (!frontWall) return false;
  const rect = frontWall.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
    return false;
  }

  const xPct = ((clientX - rect.left) / rect.width) * 100;
  const yPct = ((clientY - rect.top) / rect.height) * 100;

  const switchX = 72.5;
  const switchY = 42.5;
  const switchW = 12.5;
  const switchH = 12;
  return (
    xPct >= switchX &&
    xPct <= switchX + switchW &&
    yPct >= switchY &&
    yPct <= switchY + switchH
  );
}

function pointInBookRegion(clientX, clientY) {
  if (!frontWall) return false;
  const rect = frontWall.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
    return false;
  }

  const xPct = ((clientX - rect.left) / rect.width) * 100;
  const yPct = ((clientY - rect.top) / rect.height) * 100;

  const bookX = 70.5;
  const bookY = 62.5;
  const bookW = 15;
  const bookH = 19;
  return (
    xPct >= bookX &&
    xPct <= bookX + bookW &&
    yPct >= bookY &&
    yPct <= bookY + bookH
  );
}

function pointInBottleRegion(clientX, clientY) {
  if (!frontWall) return false;
  const rect = frontWall.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
    return false;
  }

  const xPct = ((clientX - rect.left) / rect.width) * 100;
  const yPct = ((clientY - rect.top) / rect.height) * 100;

  const bottleX = 14.5;
  const bottleY = 62;
  const bottleW = 15;
  const bottleH = 19.5;
  return (
    xPct >= bottleX &&
    xPct <= bottleX + bottleW &&
    yPct >= bottleY &&
    yPct <= bottleY + bottleH
  );
}

function pointInElementRect(element, clientX, clientY) {
  if (!element) return false;
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
}

function pointInFrontSliverFromLeftView(clientX, clientY) {
  if (pointInElementRect(frontWall, clientX, clientY)) return true;
  if (!scene) return false;
  const rect = scene.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return false;
  const xPct = ((clientX - rect.left) / rect.width) * 100;
  return xPct >= 82;
}

function pointInFrontSliverFromRightView(clientX, clientY) {
  if (pointInElementRect(frontWall, clientX, clientY)) return true;
  if (!scene) return false;
  const rect = scene.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return false;
  const xPct = ((clientX - rect.left) / rect.width) * 100;
  return xPct <= 18;
}

function pointInBackSliverFromLeftView(clientX, clientY) {
  if (pointInElementRect(backWall, clientX, clientY)) return true;
  if (!scene) return false;
  const rect = scene.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return false;
  const xPct = ((clientX - rect.left) / rect.width) * 100;
  return xPct <= 18;
}

function pointInBackSliverFromRightView(clientX, clientY) {
  if (pointInElementRect(backWall, clientX, clientY)) return true;
  if (!scene) return false;
  const rect = scene.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return false;
  const xPct = ((clientX - rect.left) / rect.width) * 100;
  return xPct >= 82;
}

function pointInLeftSliverFromBackView(clientX, clientY) {
  return pointInElementRect(leftWall, clientX, clientY);
}

function pointInRightSliverFromBackView(clientX, clientY) {
  return pointInElementRect(rightWall, clientX, clientY);
}

controls.forEach((control) => {
  control.addEventListener("click", () => turn(control.dataset.turn));
});

if (scene) {
  scene.addEventListener(
    "touchstart",
    (event) => {
      if (isAnyPopupOpen()) {
        touchTracking = false;
        return;
      }
      const target = event.target;
      if (
        target.closest(".arrow-controls") ||
        target.closest(".sound-controls") ||
        target.closest(".window-modal") ||
        target.closest(".mobile-popup") ||
        target.closest(".hotspot-donate")
      ) {
        touchTracking = false;
        return;
      }
      const [touch] = event.touches;
      if (!touch) return;
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      touchTracking = true;
    },
    { passive: true }
  );

  scene.addEventListener(
    "touchend",
    (event) => {
      if (!touchTracking || isAnyPopupOpen()) return;
      touchTracking = false;
      const [touch] = event.changedTouches;
      if (!touch) return;

      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;
      if (Math.abs(dx) < 56) return;
      if (Math.abs(dx) < Math.abs(dy) * 1.2) return;
      if (dx < 0) {
        turn("right");
      } else {
        turn("left");
      }
    },
    { passive: true }
  );
}

if (soundToggle) {
  soundToggle.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    soundEnabled = !soundEnabled;
    applySoundState();
  });
}

if (soundVolume) {
  soundVolume.addEventListener("input", (event) => {
    event.stopPropagation();
    const rawValue = Number(event.target.value);
    if (!Number.isFinite(rawValue)) return;
    soundVolumeLevel = Math.max(0, Math.min(1, rawValue / 100));
    updateVolumeSliderVisual();
    if (backgroundMusic) {
      backgroundMusic.volume = baseMusicVolume * soundVolumeLevel;
    }
  });
}

modalCloseButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    closeModalByElement(button.closest(".window-modal"));
  });
});

modalActionButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const action = button.dataset.action;
    const pdfPath = button.dataset.pdf;
    if (action === "save") {
      savePdf(pdfPath);
      return;
    }
    if (action === "print") {
      printPdf(pdfPath);
    }
  });
});

if (mobilePopupClose) {
  mobilePopupClose.addEventListener("click", (event) => {
    event.preventDefault();
    closeMobilePopup();
  });
}

if (mobilePopupReturn) {
  mobilePopupReturn.addEventListener("click", (event) => {
    event.preventDefault();
    closeMobilePopup();
  });
}

if (mobileOpenPdf) {
  mobileOpenPdf.addEventListener("click", (event) => {
    if (!mobileOpenPdf.classList.contains("is-visible")) {
      event.preventDefault();
      return;
    }
    setTimeout(() => {
      closeMobilePopup();
    }, 120);
  });
}

if (backgroundMusic) {
  if (soundVolume) {
    const rawValue = Number(soundVolume.value);
    if (Number.isFinite(rawValue)) {
      soundVolumeLevel = Math.max(0, Math.min(1, rawValue / 100));
    }
  }
  applySoundState();

  const onFirstInteraction = () => {
    tryPlayBackgroundMusic();
  };

  document.addEventListener("pointerdown", onFirstInteraction, { once: true });
  document.addEventListener("keydown", onFirstInteraction, { once: true });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && backgroundMusic.paused) {
      tryPlayBackgroundMusic();
    }
  });
}

if (windowHotspot) {
  const onWindowActivate = (event) => {
    event.preventDefault();
    event.stopPropagation();
    openWindowModal();
  };
  windowHotspot.addEventListener("click", onWindowActivate);
}

if (curtainHotspot) {
  const onCurtainActivate = (event) => {
    event.preventDefault();
    event.stopPropagation();
    openCurtainModal();
  };
  curtainHotspot.addEventListener("click", onCurtainActivate);
}

if (switchHotspot) {
  const onSwitchActivate = (event) => {
    event.preventDefault();
    event.stopPropagation();
    openSwitchModal();
  };
  switchHotspot.addEventListener("pointerup", onSwitchActivate);
  switchHotspot.addEventListener("click", onSwitchActivate);
}

if (bookHotspot) {
  const onBookActivate = (event) => {
    event.preventDefault();
    event.stopPropagation();
    openBookModal();
  };
  bookHotspot.addEventListener("pointerup", onBookActivate);
  bookHotspot.addEventListener("click", onBookActivate);
}

if (bottleHotspot) {
  const onBottleActivate = (event) => {
    event.preventDefault();
    event.stopPropagation();
    openBottleModal();
  };
  bottleHotspot.addEventListener("pointerup", onBottleActivate);
  bottleHotspot.addEventListener("click", onBottleActivate);
}

if (windowModal) {
  windowModal.addEventListener("click", (event) => {
    if (Date.now() - windowOpenedAt < 250) return;
    if (event.target === windowModal) {
      closeWindowModal();
    }
  });
}

if (curtainModal) {
  curtainModal.addEventListener("click", (event) => {
    if (Date.now() - curtainOpenedAt < 250) return;
    if (event.target === curtainModal) {
      closeCurtainModal();
    }
  });
}

if (switchModal) {
  switchModal.addEventListener("click", (event) => {
    if (Date.now() - switchOpenedAt < 250) return;
    if (event.target === switchModal) {
      closeSwitchModal();
    }
  });
}

if (bookModal) {
  bookModal.addEventListener("click", (event) => {
    if (Date.now() - bookOpenedAt < 250) return;
    if (event.target === bookModal) {
      closeBookModal();
    }
  });
}

if (bottleModal) {
  bottleModal.addEventListener("click", (event) => {
    if (Date.now() - bottleOpenedAt < 250) return;
    if (event.target === bottleModal) {
      closeBottleModal();
    }
  });
}

if (mobilePopup) {
  mobilePopup.addEventListener("click", (event) => {
    if (Date.now() - mobilePopupOpenedAt < 180) return;
    if (event.target === mobilePopup) {
      closeMobilePopup();
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeWindowModal();
    closeCurtainModal();
    closeSwitchModal();
    closeBookModal();
    closeBottleModal();
    closeMobilePopup();
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
    event.stopPropagation();
    showLeftWallInfo(hotspot);
  });
  hotspot.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    showLeftWallInfo(hotspot);
  });
});

rightWallHotspots.forEach((hotspot) => {
  hotspot.addEventListener("pointerup", (event) => {
    event.preventDefault();
    event.stopPropagation();
    showRightWallInfo(hotspot);
  });
  hotspot.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    showRightWallInfo(hotspot);
  });
});

if (scene) {
  scene.addEventListener("click", (event) => {
    if (isAnyPopupOpen()) return;
    const activeView = getCurrentViewName();
    if (activeView === "front") {
      if (pointInSwitchRegion(event.clientX, event.clientY)) {
        openSwitchModal();
        return;
      }
      if (pointInBookRegion(event.clientX, event.clientY)) {
        openBookModal();
        return;
      }
      if (pointInBottleRegion(event.clientX, event.clientY)) {
        openBottleModal();
        return;
      }
      if (event.target.closest(".wall-left")) {
        turn("left");
        return;
      }
      if (event.target.closest(".wall-right")) {
        turn("right");
        return;
      }
    }
    if (event.target.closest(".arrow-controls")) return;
    if (event.target.closest(".hotspot-door")) return;
    if (event.target.closest(".hotspot-window")) return;
    if (event.target.closest(".hotspot-curtain")) return;
    if (event.target.closest(".hotspot-switch")) return;
    if (event.target.closest(".hotspot-book")) return;
    if (event.target.closest(".hotspot-bottle")) return;
    if (event.target.closest(".hotspot-word")) return;
    if (event.target.closest(".hotspot-cancer")) return;
    if (event.target.closest(".sound-controls")) return;
    if (event.target.closest(".sound-toggle")) return;
    if (activeView === "left" && pointInFrontSliverFromLeftView(event.clientX, event.clientY)) {
      goToView("front");
      return;
    }
    if (activeView === "left" && pointInBackSliverFromLeftView(event.clientX, event.clientY)) {
      goToView("back");
      return;
    }
    if (activeView === "right" && pointInFrontSliverFromRightView(event.clientX, event.clientY)) {
      goToView("front");
      return;
    }
    if (activeView === "right" && pointInBackSliverFromRightView(event.clientX, event.clientY)) {
      goToView("back");
      return;
    }
    if (activeView === "back" && pointInLeftSliverFromBackView(event.clientX, event.clientY)) {
      goToView("left");
      return;
    }
    if (activeView === "back" && pointInRightSliverFromBackView(event.clientX, event.clientY)) {
      goToView("right");
      return;
    }
    if (activeView === "left") {
      const leftHotspot = findWordHotspotAtPoint(leftWall, leftWallHotspots, event.clientX, event.clientY);
      if (leftHotspot) {
        showLeftWallInfo(leftHotspot);
        return;
      }
      if (pointInWindowRegion(event.clientX, event.clientY)) {
        openWindowModal();
        return;
      }
      return;
    }
    if (activeView === "right") {
      if (pointInCurtainRegion(event.clientX, event.clientY)) {
        openCurtainModal();
        return;
      }
      const rightHotspot = findWordHotspotAtPoint(rightWall, rightWallHotspots, event.clientX, event.clientY);
      if (rightHotspot) {
        showRightWallInfo(rightHotspot);
      }
    }
  });
}

if (typeof mobileModeQuery.addEventListener === "function") {
  mobileModeQuery.addEventListener("change", syncMobileMode);
} else if (typeof mobileModeQuery.addListener === "function") {
  mobileModeQuery.addListener(syncMobileMode);
}

window.addEventListener("resize", applyTapTargetSizing);
window.addEventListener("load", applyTapTargetSizing);
syncMobileMode();
renderView();
