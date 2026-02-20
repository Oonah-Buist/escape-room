const room = document.getElementById("room");
const arrows = document.querySelectorAll(".arrow");

const viewAngles = {
  left: -90,
  front: 0,
  right: 90,
};

function setView(view) {
  const angle = viewAngles[view];
  if (typeof angle !== "number") return;

  room.style.transform = `translate3d(-50%, -50%, 0) translateZ(var(--camera-z)) rotateY(${angle}deg)`;
  arrows.forEach((arrow) => {
    arrow.classList.toggle("is-active", arrow.dataset.view === view);
  });
}

arrows.forEach((arrow) => {
  arrow.addEventListener("click", () => setView(arrow.dataset.view));
});
