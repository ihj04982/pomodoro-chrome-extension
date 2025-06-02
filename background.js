class TimerState {
  constructor() {
    this.timeLeft = 0;
    this.isRunning = false;
    this.isFocus = true;
    this.taskName = '포모도로 세션';
    this.soundEnabled = true;
    this.focusTime = 25;
    this.breakTime = 5;
    this.mode = '25-5';
    this.lastUpdateTime = Date.now(); // Add timestamp for accuracy
  }

  validate() {
    // Ensure timeLeft is never negative
    this.timeLeft = Math.max(0, this.timeLeft);
    
    // Ensure focus and break times are positive
    this.focusTime = Math.max(1, this.focusTime);
    this.breakTime = Math.max(1, this.breakTime);
    
    // Ensure taskName is never empty
    this.taskName = this.taskName.trim() || '포모도로 세션';
    
    // Validate mode
    if (this.mode === '25-5') {
      this.focusTime = 25;
      this.breakTime = 5;
    } else if (this.mode === '50-10') {
      this.focusTime = 50;
      this.breakTime = 10;
    }

    // Update timestamp
    this.lastUpdateTime = Date.now();
  }

  toJSON() {
    return {
      timeLeft: this.timeLeft,
      isRunning: this.isRunning,
      isFocus: this.isFocus,
      taskName: this.taskName,
      soundEnabled: this.soundEnabled,
      focusTime: this.focusTime,
      breakTime: this.breakTime,
      mode: this.mode,
      lastUpdateTime: this.lastUpdateTime
    };
  }

  static fromJSON(data) {
    const state = new TimerState();
    Object.assign(state, data);
    state.validate();
    return state;
  }
}

class PomodoroTimer {
  constructor() {
    this.timerState = new TimerState();
    this.timerInterval = null;
    this.initialize();
    this.setupAlarms();
  }

  setupAlarms() {
    // Clear any existing alarms
    chrome.alarms.clearAll();
    
    // Set up alarm for timer completion
    chrome.alarms.create('timerComplete', {
      delayInMinutes: 25, // Default to 25 minutes
      periodInMinutes: 25
    });
  }

  setupTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    // Calculate time drift
    const now = Date.now();
    const timeDrift = Math.floor((now - this.timerState.lastUpdateTime) / 1000);
    if (timeDrift > 0 && this.timerState.isRunning) {
      this.timerState.timeLeft = Math.max(0, this.timerState.timeLeft - timeDrift);
    }

    this.timerInterval = setInterval(() => {
      if (this.timerState.isRunning && this.timerState.timeLeft > 0) {
        this.timerState.timeLeft--;
        this.timerState.lastUpdateTime = Date.now();
        this.updateBadge();
        this.saveTimerState();
        this.notifyStateChange();
        if (this.timerState.timeLeft <= 0) {
          this.handleTimerComplete();
        }
      }
    }, 1000);
  }

  notifyStateChange() {
    try {
      chrome.runtime.sendMessage({
        action: 'timerUpdated',
        state: this.timerState.toJSON()
      }).catch(() => {
        // Ignore errors from disconnected clients
      });
    } catch (error) {
      console.error('Error sending state update:', error);
    }
  }

  startTimer(options = {}) {
    try {
      if (options.mode) {
        this.timerState.mode = options.mode;
      }
      if (options.taskName) {
        this.timerState.taskName = options.taskName;
      }
      if (options.soundEnabled !== undefined) {
        this.timerState.soundEnabled = options.soundEnabled;
      }
      
      this.timerState.validate();
      
      if (this.timerState.timeLeft <= 0) {
        this.timerState.timeLeft = this.timerState.isFocus ? 
          this.timerState.focusTime * 60 : 
          this.timerState.breakTime * 60;
      }
      
      this.timerState.isRunning = true;
      this.saveTimerState();
      this.updateBadge();
      this.setupTimer();
      this.notifyStateChange();

      // Update alarm for timer completion
      chrome.alarms.create('timerComplete', {
        delayInMinutes: this.timerState.timeLeft / 60,
        periodInMinutes: this.timerState.timeLeft / 60
      });
    } catch (error) {
      console.error('Error starting timer:', error);
    }
  }

  pauseTimer() {
    try {
      this.timerState.isRunning = false;
      this.saveTimerState();
      this.updateBadge();
      this.notifyStateChange();
      chrome.alarms.clear('timerComplete');
    } catch (error) {
      console.error('Error pausing timer:', error);
    }
  }

  resetTimer() {
    try {
      clearInterval(this.timerInterval);
      this.timerState.isRunning = false;
      this.timerState.isFocus = true;
      this.timerState.timeLeft = this.timerState.focusTime * 60;
      this.saveTimerState();
      this.updateBadge();
      this.notifyStateChange();
      chrome.alarms.clear('timerComplete');
    } catch (error) {
      console.error('Error resetting timer:', error);
    }
  }

  handleTimerComplete() {
    try {
      const justFinishedFocus = this.timerState.isFocus;
      this.showNotification(justFinishedFocus);
      this.timerState.isFocus = !this.timerState.isFocus;
      this.timerState.timeLeft = this.timerState.isFocus ? 
        this.timerState.focusTime * 60 : 
        this.timerState.breakTime * 60;
      this.timerState.isRunning = true;
      this.saveTimerState();
      this.updateBadge();
      this.notifyStateChange();
    } catch (error) {
      console.error('Error handling timer completion:', error);
    }
  }

  showNotification(justFinishedFocus = this.timerState.isFocus) {
    try {
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
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  updateBadge() {
    try {
      const minutes = Math.ceil(this.timerState.timeLeft / 60);
      const badgeText = this.timerState.isRunning ? minutes.toString() : '';
      chrome.action.setBadgeText({ text: badgeText });
      const badgeColor = this.timerState.isFocus ? '#e74c3c' : '#2ecc71';
      chrome.action.setBadgeBackgroundColor({ color: badgeColor });
      const iconPath = this.timerState.isFocus ? 'images/icon-focus.png' : 'images/icon-break.png';
      chrome.action.setIcon({ path: iconPath });
    } catch (error) {
      console.error('Error updating badge:', error);
    }
  }

  saveTimerState() {
    try {
      chrome.storage.local.set({ timerState: this.timerState.toJSON() });
    } catch (error) {
      console.error('Error saving timer state:', error);
    }
  }

  initialize() {
    try {
      chrome.storage.local.get(['timerState'], (result) => {
        if (result.timerState) {
          this.timerState = TimerState.fromJSON(result.timerState);
          if (this.timerState.isRunning) {
            this.setupTimer();
          } else {
            this.updateBadge();
          }
        } else {
          this.resetTimer();
        }
      });
    } catch (error) {
      console.error('Error initializing timer:', error);
      this.resetTimer();
    }
  }
}

const pomodoroTimer = new PomodoroTimer();

// Handle alarms
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'timerComplete') {
    pomodoroTimer.handleTimerComplete();
  }
});

// Handle messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    switch (message.action) {
      case 'startTimer':
        pomodoroTimer.startTimer(message);
        break;
      case 'pauseTimer':
        pomodoroTimer.pauseTimer();
        break;
      case 'resetTimer':
        pomodoroTimer.resetTimer();
        break;
      case 'getTimerState':
        sendResponse(pomodoroTimer.timerState.toJSON());
        break;
      case 'updateTaskName':
        pomodoroTimer.timerState.taskName = message.taskName;
        pomodoroTimer.saveTimerState();
        pomodoroTimer.notifyStateChange();
        break;
      case 'updateMode':
        pomodoroTimer.timerState.mode = message.mode;
        pomodoroTimer.timerState.validate();
        pomodoroTimer.timerState.timeLeft = pomodoroTimer.timerState.focusTime * 60;
        pomodoroTimer.timerState.isRunning = false;
        pomodoroTimer.saveTimerState();
        pomodoroTimer.notifyStateChange();
        break;
    }
  } catch (error) {
    console.error('Error handling message:', error);
  }
  return true;
});

// Handle installation
chrome.runtime.onInstalled.addListener(() => {
  pomodoroTimer.initialize();
});