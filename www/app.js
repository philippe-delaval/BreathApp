const circle = document.getElementById("circle");
const instruction = document.getElementById("instruction");
const startBtn = document.getElementById("start-btn");
const playIcon = document.getElementById("play-icon");
const stopIcon = document.getElementById("stop-icon");

let isRunning = false;
let breatheInTimeout, breatheOutTimeout;
let countdownInterval;
const totalTime = 300;
let remainingTime = totalTime;

function updateProgressBar() {
  const elapsedPercentage = ((totalTime - remainingTime) / totalTime) * 100;
  const progressCircle = document.querySelector("#progress-circle circle:last-child");
  const circleLength = 2 * Math.PI * 45;
  const progressOffset = circleLength * (1 - elapsedPercentage / 100);
  progressCircle.setAttribute("stroke-dashoffset", progressOffset.toString());
}

function breatheIn() {
  instruction.textContent = "Inspirer";
  circle.style.animation = "breathe-in 5s linear infinite both";
}

function breatheOut() {
  instruction.textContent = "Expirer";
  circle.style.animation = "breathe-out 5s linear infinite both";
}

function startBreathing() {
  isRunning = true;
  playIcon.style.display = "none";
  stopIcon.style.display = "inline-block";
    breatheIn();
    breatheInTimeout = setTimeout(() => {
      breatheOut();
      breatheOutTimeout = setTimeout(() => {
        startBreathing();
      }, 5000);
    }, 5000);


  clearInterval(countdownInterval);
  countdownInterval = setInterval(() => {
    if (remainingTime <= 0) {
      clearInterval(countdownInterval);
      stopBreathing();
      return;
    }
    remainingTime--;
    updateProgressBar();
  }, 1000);
}


function stopBreathing() {
  isRunning = false;
  playIcon.style.display = "inline-block";
  stopIcon.style.display = "none";
  clearTimeout(breatheInTimeout);
  clearTimeout(breatheOutTimeout);
  clearInterval(countdownInterval);
  remainingTime = totalTime;
  updateProgressBar();
  circle.style.animation = "";
  instruction.textContent = "Terminé";
}

startBtn.addEventListener("click", () => {
  if (!isRunning) {
    startBreathing();
  } else {
    stopBreathing();
  }
});

updateProgressBar();
