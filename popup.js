class TimerMode {
  constructor(focusTime = 25, breakTime = 5, soundEnabled = true) {
    this.focusTime = focusTime;
    this.breakTime = breakTime;
    this.soundEnabled = soundEnabled;
  }
}

class PomodoroUI {
  constructor() {
    // DOM Elements
    this.timerElement = document.getElementById('timer');
    this.statusElement = document.getElementById('status');
    this.taskInput = document.getElementById('task-input');
    this.mode25Button = document.getElementById('mode-25-5');
    this.mode50Button = document.getElementById('mode-50-10');
    this.soundOnButton = document.getElementById('sound-on');
    this.soundOffButton = document.getElementById('sound-off');
    this.startButton = document.getElementById('start-btn');
    this.pauseButton = document.getElementById('pause-btn');
    this.resetButton = document.getElementById('reset-btn');

    this.timerMode = new TimerMode();
    this.bindEvents();
    this.initializeTimerState();
  }

  bindEvents() {
    this.startButton.addEventListener('click', () => this.startTimer());
    this.pauseButton.addEventListener('click', () => this.pauseTimer());
    this.resetButton.addEventListener('click', () => this.resetTimer());
    this.mode25Button.addEventListener('click', () => this.setMode(25, 5));
    this.mode50Button.addEventListener('click', () => this.setMode(50, 10));
    this.soundOnButton.addEventListener('click', () => this.setSound(true));
    this.soundOffButton.addEventListener('click', () => this.setSound(false));
    chrome.runtime.onMessage.addListener((message) => {
      if (message.action === 'timerUpdated') {
        this.updateTimerDisplay(message.timeLeft, message.isRunning, message.isFocus);
      }
    });
  }

  initializeTimerState() {
    chrome.storage.local.get(['timerState', 'timerMode', 'taskName'], (result) => {
      if (result.timerMode) {
        this.timerMode = Object.assign(new TimerMode(), result.timerMode);
        this.updateModeButtons();
        this.updateSoundButtons();
      }
      if (result.taskName) {
        this.taskInput.value = result.taskName;
      }
      if (result.timerState) {
        const timerState = result.timerState;
        this.updateTimerDisplay(timerState.timeLeft, timerState.isRunning, timerState.isFocus);
        this.startButton.disabled = timerState.isRunning;
        this.pauseButton.disabled = !timerState.isRunning;
      } else {
        this.updateTimerDisplay(this.timerMode.focusTime * 60, false, true);
      }
    });
  }

  updateTimerDisplay(timeInSeconds, isRunning, isFocus) {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    this.timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    if (isRunning) {
      this.statusElement.textContent = isFocus ? '집중 시간' : '휴식 시간';
      this.timerElement.style.color = isFocus ? '#e74c3c' : '#2ecc71';
    } else {
      this.statusElement.textContent = '시작 준비됨';
      this.timerElement.style.color = '#e74c3c';
    }
  }

  updateModeButtons() {
    if (this.timerMode.focusTime === 25) {
      this.mode25Button.classList.add('active');
      this.mode50Button.classList.remove('active');
    } else {
      this.mode25Button.classList.remove('active');
      this.mode50Button.classList.add('active');
    }
  }

  updateSoundButtons() {
    if (this.timerMode.soundEnabled) {
      this.soundOnButton.classList.add('active');
      this.soundOffButton.classList.remove('active');
    } else {
      this.soundOnButton.classList.remove('active');
      this.soundOffButton.classList.add('active');
    }
  }

  setMode(focus, rest) {
    this.timerMode.focusTime = focus;
    this.timerMode.breakTime = rest;
    this.updateModeButtons();
    this.resetTimer();
  }

  setSound(enabled) {
    this.timerMode.soundEnabled = enabled;
    this.updateSoundButtons();
    chrome.runtime.sendMessage({
      action: 'startTimer',
      soundEnabled: enabled
    });
  }

  startTimer() {
    const taskName = this.taskInput.value.trim() || '포모도로 세션';
    chrome.storage.local.set({
      timerMode: this.timerMode,
      taskName: taskName
    });
    chrome.runtime.sendMessage({
      action: 'startTimer',
      focusTime: this.timerMode.focusTime,
      breakTime: this.timerMode.breakTime,
      taskName: taskName,
      soundEnabled: this.timerMode.soundEnabled
    });
    this.startButton.disabled = true;
    this.pauseButton.disabled = false;
  }

  pauseTimer() {
    chrome.runtime.sendMessage({ action: 'pauseTimer' });
    this.startButton.disabled = false;
    this.pauseButton.disabled = true;
  }

  resetTimer() {
    chrome.runtime.sendMessage({
      action: 'resetTimer',
      focusTime: this.timerMode.focusTime,
      breakTime: this.timerMode.breakTime
    });
    this.startButton.disabled = false;
    this.pauseButton.disabled = true;
    this.updateTimerDisplay(this.timerMode.focusTime * 60, false, true);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new PomodoroUI();
});