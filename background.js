class PomodoroTimer {
  constructor() {
    this.timerState = {
      timeLeft: 0,
      isRunning: false,
      isFocus: true,
      taskName: '포모도로 세션',
      soundEnabled: true,
      focusTime: 25,
      breakTime: 5
    };
    this.timerInterval = null;
    this.initialize();
  }

  setupTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    this.timerInterval = setInterval(() => {
      if (this.timerState.isRunning && this.timerState.timeLeft > 0) {
        this.timerState.timeLeft--;
        this.updateBadge();
        this.saveTimerState();
        chrome.runtime.sendMessage({
          action: 'timerUpdated',
          timeLeft: this.timerState.timeLeft,
          isRunning: this.timerState.isRunning,
          isFocus: this.timerState.isFocus
        }).catch(() => {});
        if (this.timerState.timeLeft <= 0) {
          this.handleTimerComplete();
        }
      }
    }, 1000);
  }

  startTimer(options = {}) {
    if (options.focusTime) this.timerState.focusTime = options.focusTime;
    if (options.breakTime) this.timerState.breakTime = options.breakTime;
    if (options.taskName) this.timerState.taskName = options.taskName;
    if (options.soundEnabled !== undefined) this.timerState.soundEnabled = options.soundEnabled;
    if (this.timerState.timeLeft <= 0) {
      this.timerState.timeLeft = this.timerState.isFocus ? this.timerState.focusTime * 60 : this.timerState.breakTime * 60;
    }
    this.timerState.isRunning = true;
    this.saveTimerState();
    this.updateBadge();
    this.setupTimer();
  }

  pauseTimer() {
    this.timerState.isRunning = false;
    this.saveTimerState();
    this.updateBadge();
  }

  resetTimer() {
    clearInterval(this.timerInterval);
    this.timerState.isRunning = false;
    this.timerState.isFocus = true;
    this.timerState.timeLeft = this.timerState.focusTime * 60;
    this.saveTimerState();
    this.updateBadge();
  }

  handleTimerComplete() {
    const justFinishedFocus = this.timerState.isFocus;
    this.showNotification(justFinishedFocus);
    this.timerState.isFocus = !this.timerState.isFocus;
    this.timerState.timeLeft = this.timerState.isFocus ? this.timerState.focusTime * 60 : this.timerState.breakTime * 60;
    this.timerState.isRunning = true;
    this.saveTimerState();
    this.updateBadge();
  }

  showNotification(justFinishedFocus = this.timerState.isFocus) {
    const message = justFinishedFocus
      ? `${this.timerState.taskName} 작업이 완료되었습니다. 휴식 시간입니다!`
      : `휴식 시간이 끝났습니다. ${this.timerState.taskName}에 집중할 시간입니다!`;
    chrome.notifications.create({
      type: 'basic',
      iconUrl: justFinishedFocus ? 'images/icon-break.png' : 'images/icon-focus.png',
      title: justFinishedFocus ? '휴식 시간' : '집중 시간',
      message: message,
      priority: 2,
      silent: !this.timerState.soundEnabled
    });
  }

  updateBadge() {
    const minutes = Math.ceil(this.timerState.timeLeft / 60);
    const badgeText = this.timerState.isRunning ? minutes.toString() : '';
    chrome.action.setBadgeText({ text: badgeText });
    const badgeColor = this.timerState.isFocus ? '#e74c3c' : '#2ecc71';
    chrome.action.setBadgeBackgroundColor({ color: badgeColor });
    const iconPath = this.timerState.isFocus ? 'images/icon-focus.png' : 'images/icon-break.png';
    chrome.action.setIcon({ path: iconPath });
  }

  saveTimerState() {
    chrome.storage.local.set({ timerState: this.timerState });
  }

  initialize() {
    chrome.storage.local.get(['timerState'], (result) => {
      if (result.timerState) {
        this.timerState = result.timerState;
        if (this.timerState.isRunning) {
          this.setupTimer();
        } else {
          this.updateBadge();
        }
      } else {
        this.resetTimer();
      }
    });
  }
}

const pomodoroTimer = new PomodoroTimer();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'startTimer':
      pomodoroTimer.startTimer(message);
      break;
    case 'pauseTimer':
      pomodoroTimer.pauseTimer();
      break;
    case 'resetTimer':
      if (message.focusTime) pomodoroTimer.timerState.focusTime = message.focusTime;
      if (message.breakTime) pomodoroTimer.timerState.breakTime = message.breakTime;
      pomodoroTimer.resetTimer();
      break;
    case 'getTimerState':
      sendResponse(pomodoroTimer.timerState);
      break;
  }
  return true;
});

chrome.runtime.onInstalled.addListener(() => {
  pomodoroTimer.initialize();
});