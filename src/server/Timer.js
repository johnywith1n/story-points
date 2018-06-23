const events = require('../events');

class Timer {
  constructor(roomName, io) {
    this.roomName = roomName;
    this.io = io;
    this.state = {
      time: 0,
      paused: false,
      showTimer: false,
    };
    this.interval = null;
  }

  clearInterval() {
    clearInterval(this.interval);
  }

  broadcastState() {
    this.io.sockets.to(this.roomName).emit(events.TIMER_UPDATE, this.state);
  }

  hardResetTimer() {
    clearInterval(this.interval);
    this.state.time = 0;
    this.state.paused = false;
    this.state.showTimer = false;
    this.broadcastState();
  }

  getState() {
    return this.state;
  }

  startTimer(time) {
    if (this.state.paused || this.state.showTimer) {
      return;
    }
    clearInterval(this.interval);
    this.state.time = time;
    this.state.showTimer = true;
    this.state.paused = false;
    this.broadcastState();
    this.interval = setInterval(() => {
      this.state.time = this.state.time - 1;
      if (this.state.time <= 0) {
        clearInterval(this.interval);
      }
      if (this.state.time >= 0) {
        this.broadcastState();
      }
    }, 1000);
  }

  resetTimer() {
    if (!this.state.showTimer) {
      return;
    }

    this.hardResetTimer();
  }

  continueTimer() {
    if (!this.state.paused || !this.state.showTimer) {
      return;
    }
    clearInterval(this.interval);
    this.state.showTimer = true;
    this.state.paused = false;
    this.interval = setInterval(() => {
      this.state.time = this.state.time - 1;
      if (this.state.time <= 0) {
        clearInterval(this.interval);
      }
      if (this.state.time >= 0) {
        this.broadcastState();
      }
    }, 1000);
  }

  pauseTimer() {
    if (this.state.paused || !this.state.showTimer) {
      return;
    }
    clearInterval(this.interval);
    this.state.paused = true;
    this.broadcastState();
  }
}

module.exports = Timer;
