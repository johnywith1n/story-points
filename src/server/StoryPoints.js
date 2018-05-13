const state = {
  users: {},
  visibility: false,
};

module.exports = {
  getState: () => {
    return state;
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
    state.users[user].value = points;
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