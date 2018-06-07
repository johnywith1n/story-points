const events = require('../events');

const state = {
  time: 0,
  paused: false,
  showTimer: false,
};

let io;
let interval = null;

const broadcastState = () => {
  io.sockets.emit(events.TIMER_UPDATE, state);
};

module.exports = {
  setIO: (_io) => {
    io = _io;
  },
  getState: () => {
    return state;
  },
  startTimer: (time) => {
    if (state.paused || state.showTimer) {
      return;
    }
    clearInterval(interval);
    state.time = time;
    state.showTimer = true;
    state.paused = false;
    interval = setInterval(() => {
      state.time = state.time - 1;
      if (state.time === 0) {
        clearInterval(interval);
      }
      broadcastState();
    }, 1000);
  },
  resetTimer: () => {
    if (!state.showTimer) {
      return;
    }

    this.hardResetTimer();
  },
  hardResetTimer: () => {
    clearInterval(interval);
    state.time = 0;
    state.paused = false;
    state.showTimer = false;
    broadcastState();
  },
  continueTimer: () => {
    if (!state.paused || !state.showTimer) {
      return;
    }
    clearInterval(interval);
    state.showTimer = true;
    state.paused = false;
    interval = setInterval(() => {
      state.time = state.time - 1;
      if (state.time === 0) {
        clearInterval(interval);
      }
      broadcastState();
    }, 1000);
  },
  pauseTimer: () => {
    if (state.paused || !state.showTimer) {
      return;
    }
    clearInterval(interval);
    state.paused = true;
    broadcastState();
  }
};
