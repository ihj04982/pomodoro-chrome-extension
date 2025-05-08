// 타이머 상태 관리
let timerState = {
    timeLeft: 0,
    isRunning: false,
    isFocus: true,
    taskName: '포모도로 세션',
    soundEnabled: true,
    focusTime: 25,
    breakTime: 10, 
  };
  
  // 알람 설정
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'pomodoroTimer') {
      if (timerState.timeLeft <= 0) {
        // 타이머 완료
        handleTimerComplete();
      } else {
        // 타이머 업데이트
        timerState.timeLeft--;
        updateBadge();
        saveTimerState();
        
        // 팝업에 업데이트 메시지 전송
        chrome.runtime.sendMessage({
          action: 'timerUpdated',
          timeLeft: timerState.timeLeft,
          isRunning: timerState.isRunning,
          isFocus: timerState.isFocus
        });
      }
    }
  });
  
  // 메시지 수신 처리
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
      case 'startTimer':
        startTimer(message);
        break;
      case 'pauseTimer':
        pauseTimer();
        break;
      case 'resetTimer':
        resetTimer();
        break;
    }
    return true;
  });
  
  // 타이머 시작
  function startTimer(options = {}) {
    if (options.focusTime) {
      timerState.focusTime = options.focusTime;
    }
    
    if (options.breakTime) {
      timerState.breakTime = options.breakTime;
    }
    
    if (options.taskName) {
      timerState.taskName = options.taskName;
    }
    
    if (options.soundEnabled !== undefined) {
      timerState.soundEnabled = options.soundEnabled;
    }
    
    // 이미 실행 중이면 중지
    if (timerState.isRunning) {
      chrome.alarms.clear('pomodoroTimer');
    }
    
    // 시간이 설정되지 않았으면 초기화
    if (timerState.timeLeft <= 0) {
      timerState.timeLeft = timerState.isFocus ? timerState.focusTime * 60 : timerState.breakTime * 60;
    }
    
    timerState.isRunning = true;
    saveTimerState();
    updateBadge();
    
    // 알람 설정
    chrome.alarms.create('pomodoroTimer', { periodInMinutes: 1/60 }); // 1초마다 실행
  }
  
  // 타이머 일시정지
  function pauseTimer() {
    timerState.isRunning = false;
    chrome.alarms.clear('pomodoroTimer');
    saveTimerState();
    updateBadge();
  }
  
  // 타이머 초기화
  function resetTimer() {
    chrome.alarms.clear('pomodoroTimer');
    timerState.isRunning = false;
    timerState.timeLeft = timerState.isFocus ? timerState.focusTime * 60 : timerState.breakTime * 60;
    saveTimerState();
    updateBadge();
  }
  
  // 타이머 완료 처리
  function handleTimerComplete() {
    // 알림 표시
    showNotification();
    
    // 모드 전환 (집중 <-> 휴식)
    timerState.isFocus = !timerState.isFocus;
    timerState.timeLeft = timerState.isFocus ? timerState.focusTime * 60 : timerState.breakTime * 60;
    
    // 타이머는 계속 실행
    saveTimerState();
    updateBadge();
  }
  
  // 알림 표시
  function showNotification() {
    const message = timerState.isFocus 
      ? `휴식 시간이 끝났습니다. ${timerState.taskName}에 집중할 시간입니다!`
      : `${timerState.taskName} 작업이 완료되었습니다. 휴식 시간입니다!`;
    
    chrome.notifications.create({
      type: 'basic',
      iconUrl: timerState.isFocus ? 'images/icon-break.png' : 'images/icon-focus.png',
      title: timerState.isFocus ? '집중 시간' : '휴식 시간',
      message: message,
      priority: 2,
      silent: !timerState.soundEnabled
    });
    
    // 소리 재생 (소리 설정이 켜져있는 경우)
    // if (timerState.soundEnabled) {
    //   const audio = new Audio(timerState.isFocus ? 'sounds/focus.mp3' : 'sounds/break.mp3');
    //   audio.play();
    // }
  }
  
  // 배지 업데이트
  function updateBadge() {
    const minutes = Math.ceil(timerState.timeLeft / 60);
    const badgeText = timerState.isRunning ? minutes.toString() : '';
    
    chrome.action.setBadgeText({ text: badgeText });
    
    // 집중/휴식 모드에 따라 배지 색상 변경
    const badgeColor = timerState.isFocus ? '#e74c3c' : '#2ecc71';
    chrome.action.setBadgeBackgroundColor({ color: badgeColor });
    
    // 아이콘 변경
    const iconPath = timerState.isFocus ? 'images/icon-focus.png' : 'images/icon-break.png';
    chrome.action.setIcon({ path: iconPath });
  }
  
  // 상태 저장
  function saveTimerState() {
    chrome.storage.local.set({ timerState });
  }
  
  // 초기화 (확장 프로그램이 로드될 때)
  chrome.runtime.onInstalled.addListener(() => {
    resetTimer();
  });
  
  // 이전 상태 복원
  chrome.storage.local.get(['timerState'], (result) => {
    if (result.timerState) {
      timerState = result.timerState;
      
      // 실행 중이었다면 타이머 재시작
      if (timerState.isRunning) {
        startTimer();
      } else {
        updateBadge();
      }
    }
  });