const state = {
  users: {},
  visibility: false,
};

module.exports = {
  getState: (reset) => {
    let result = state;
    if (reset) {
      result = {
        ...state,
        reset: true
      }
    }
    return result;
  },
  hasUser: (user) => {
    return user in state.users;
  },
  addUser: (user) => {
    if (user in state.users) {
      return false;
    }

    state.users[user] = {};
    return true;
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