const progressContainer = document.getElementById('progress');
const progressText = document.getElementById('progress-text');
const rangeInput = document.getElementById('progress-range');

rangeInput.addEventListener('input', () => {
    const value = rangeInput.value;
    progressText.textContent = `${value}%`;
    progressContainer.style.background = `conic-gradient(#00ff80 ${value * 3.6}deg, #444 0deg)`;
});
