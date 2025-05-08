document.addEventListener('DOMContentLoaded', () => {
    // DOM 요소
    const timerElement = document.getElementById('timer');
    const statusElement = document.getElementById('status');
    const taskInput = document.getElementById('task-input');
    const mode25Button = document.getElementById('mode-25-5');
    const mode50Button = document.getElementById('mode-50-10');
    const soundOnButton = document.getElementById('sound-on');
    const soundOffButton = document.getElementById('sound-off');
    const startButton = document.getElementById('start-btn');
    const pauseButton = document.getElementById('pause-btn');
    const resetButton = document.getElementById('reset-btn');
    
// 타이머 상태 부분 수정
let timerMode = {
  focusTime: 25,
  breakTime: 5,
  soundEnabled: true,
};
    
    // 타이머 상태 초기화 및 불러오기
    function initializeTimerState() {
      chrome.storage.local.get(['timerState', 'timerMode', 'taskName'], (result) => {
        if (result.timerMode) {
          timerMode = result.timerMode;
          updateModeButtons();
          updateSoundButtons();
        }
        
        if (result.taskName) {
          taskInput.value = result.taskName;
        }
        
        if (result.timerState) {
          const timerState = result.timerState;
          updateTimerDisplay(timerState.timeLeft, timerState.isRunning, timerState.isFocus);
          
          if (timerState.isRunning) {
            startButton.disabled = true;
            pauseButton.disabled = false;
          } else {
            startButton.disabled = false;
            pauseButton.disabled = true;
          }
        } else {
          updateTimerDisplay(timerMode.focusTime * 60, false, true);
        }
      });
    }
    
    // 타이머 표시 업데이트
    function updateTimerDisplay(timeInSeconds, isRunning, isFocus) {
      const minutes = Math.floor(timeInSeconds / 60);
      const seconds = timeInSeconds % 60;
      timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      
      if (isRunning) {
        statusElement.textContent = isFocus ? '집중 시간' : '휴식 시간';
        timerElement.style.color = isFocus ? '#e74c3c' : '#2ecc71';
      } else {
        statusElement.textContent = '시작 준비됨';
        timerElement.style.color = '#e74c3c';
      }
    }
    
    // 모드 버튼 업데이트
    function updateModeButtons() {
      if (timerMode.focusTime === 25) {
        mode25Button.classList.add('active');
        mode50Button.classList.remove('active');
      } else {
        mode25Button.classList.remove('active');
        mode50Button.classList.add('active');
      }
    }
    
    // 소리 버튼 업데이트
    function updateSoundButtons() {
      if (timerMode.soundEnabled) {
        soundOnButton.classList.add('active');
        soundOffButton.classList.remove('active');
      } else {
        soundOnButton.classList.remove('active');
        soundOffButton.classList.add('active');
      }
    }
    
    // 타이머 시작
    function startTimer() {
      const taskName = taskInput.value.trim() || '포모도로 세션';
      
      // 타이머 설정 저장
      chrome.storage.local.set({
        timerMode: timerMode,
        taskName: taskName
      });
      
      // 백그라운드 스크립트에 시작 메시지 전송
      chrome.runtime.sendMessage({
        action: 'startTimer',
        focusTime: timerMode.focusTime,
        breakTime: timerMode.breakTime,
        taskName: taskName,
        soundEnabled: timerMode.soundEnabled
      });
      
      startButton.disabled = true;
      pauseButton.disabled = false;
    }
    
    // 타이머 일시정지
    function pauseTimer() {
      chrome.runtime.sendMessage({ action: 'pauseTimer' });
      startButton.disabled = false;
      pauseButton.disabled = true;
    }
    
    // 타이머 초기화
    function resetTimer() {
      chrome.runtime.sendMessage({ action: 'resetTimer' });
      startButton.disabled = false;
      pauseButton.disabled = true;
      updateTimerDisplay(timerMode.focusTime * 60, false, true);
    }
    
    // 이벤트 리스너
    startButton.addEventListener('click', startTimer);
    pauseButton.addEventListener('click', pauseTimer);
    resetButton.addEventListener('click', resetTimer);
    
    // 모드 변경 이벤트
    mode25Button.addEventListener('click', () => {
      timerMode.focusTime = 10/60; // 10초
      timerMode.breakTime = 5/60;  // 5초
      updateModeButtons();
      resetTimer();
    });
    
    mode50Button.addEventListener('click', () => {
      timerMode.focusTime = 50;
      timerMode.breakTime = 10;
      updateModeButtons();
      resetTimer();
    });
    
    // 소리 설정 이벤트
    soundOnButton.addEventListener('click', () => {
      timerMode.soundEnabled = true;
      updateSoundButtons();
    });
    
    soundOffButton.addEventListener('click', () => {
      timerMode.soundEnabled = false;
      updateSoundButtons();
    });
    
    // 타이머 업데이트 리스너
    chrome.runtime.onMessage.addListener((message) => {
      if (message.action === 'timerUpdated') {
        updateTimerDisplay(message.timeLeft, message.isRunning, message.isFocus);
      }
    });
    
    // 초기화
    initializeTimerState();
  });