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

    this.bindEvents();
    this.initializeTimerState();
  }

  bindEvents() {
    this.startButton.addEventListener('click', () => this.startTimer());
    this.pauseButton.addEventListener('click', () => this.pauseTimer());
    this.resetButton.addEventListener('click', () => this.resetTimer());
    this.mode25Button.addEventListener('click', () => this.setMode('25-5'));
    this.mode50Button.addEventListener('click', () => this.setMode('50-10'));
    this.soundOnButton.addEventListener('click', () => this.setSound(true));
    this.soundOffButton.addEventListener('click', () => this.setSound(false));
    this.taskInput.addEventListener('change', () => this.updateTaskName());
    
    chrome.runtime.onMessage.addListener((message) => {
      if (message.action === 'timerUpdated') {
        this.updateUI(message.state);
      }
    });
  }

  initializeTimerState() {
    chrome.runtime.sendMessage({ action: 'getTimerState' }, (state) => {
      this.updateUI(state);
    });
  }

  updateUI(state) {
    // Update timer display
    const minutes = Math.floor(state.timeLeft / 60);
    const seconds = state.timeLeft % 60;
    this.timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Update status
    if (state.isRunning) {
      this.statusElement.textContent = state.isFocus ? '집중 시간' : '휴식 시간';
      this.timerElement.style.color = state.isFocus ? '#e74c3c' : '#2ecc71';
    } else {
      this.statusElement.textContent = '시작 준비됨';
      this.timerElement.style.color = '#e74c3c';
    }

    // Update task input
    this.taskInput.value = state.taskName;
    this.taskInput.disabled = state.isRunning;

    // Update mode buttons
    if (state.mode === '25-5') {
      this.mode25Button.classList.add('active');
      this.mode50Button.classList.remove('active');
    } else {
      this.mode25Button.classList.remove('active');
      this.mode50Button.classList.add('active');
    }

    // Update sound buttons
    if (state.soundEnabled) {
      this.soundOnButton.classList.add('active');
      this.soundOffButton.classList.remove('active');
    } else {
      this.soundOnButton.classList.remove('active');
      this.soundOffButton.classList.add('active');
    }

    // Update control buttons
    this.startButton.disabled = state.isRunning;
    this.pauseButton.disabled = !state.isRunning;
  }

  setMode(mode) {
    chrome.runtime.sendMessage({
      action: 'updateMode',
      mode: mode
    });
  }

  setSound(enabled) {
    chrome.runtime.sendMessage({
      action: 'startTimer',
      soundEnabled: enabled
    });
  }

  startTimer() {
    const taskName = this.taskInput.value.trim() || '포모도로 세션';
    chrome.runtime.sendMessage({
      action: 'startTimer',
      taskName: taskName
    });
  }

  pauseTimer() {
    chrome.runtime.sendMessage({ action: 'pauseTimer' });
  }

  resetTimer() {
    chrome.runtime.sendMessage({ action: 'resetTimer' });
  }

  updateTaskName() {
    const taskName = this.taskInput.value.trim() || '포모도로 세션';
    chrome.runtime.sendMessage({
      action: 'updateTaskName',
      taskName: taskName
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new PomodoroUI();
});