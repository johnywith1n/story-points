const crypto = require('crypto');

const state = {
  users: {},
  visibility: false,
};

const sessionKeys = {};

module.exports = {
  getState: (reset) => {
    let result = state;
    if (reset) {
      result = {
        ...state,
        reset: true
      };
    }
    return result;
  },
  hasUser: (user) => {
    return user in state.users;
  },
  addUser: (user, token) => {
    if (user in state.users && !(sessionKeys[user] === token)) {
      return null;
    }
    state.users[user] = {};

    const sessionToken = crypto.randomBytes(256).toString('hex');
    sessionKeys[user] = sessionToken;
    return sessionToken;
  },
  removeUser: (user) => {
    delete state.users[user];
  },
  setPointsForUser: (user, points) => {
    if (state.users[user]) {
      state.users[user].value = points;
    }
  },
  setVisibility: (visibility) => {
    state.visibility = visibility;
  },
  resetPoints: () => {
    for (let u in state.users) {
      state.users[u].value = null;
    }
  }
};