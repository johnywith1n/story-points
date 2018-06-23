const crypto = require('crypto');

class StoryPoints {
  constructor(roomName) {
    this.roomName = roomName;
    this.state = {
      users: {},
      visibility: false,
    };
    this.socketIdsToUsers = {};
    this.usersToSocketIds = {};

    this.sessionKeys = {};
  }

  users() {
    return Object.keys(this.state.users);
  }

  getState(reset) {
    let result = this.state;
    if (reset) {
      result = {
        ...this.state,
        reset: true
      };
    }
    return result;
  }

  hasUser(user) {
    return user in this.state.users;
  }

  addUser(user, token, socketId, isQA) {
    if (user in this.state.users && !(this.sessionKeys[user] === token)) {
      return null;
    }
    this.state.users[user] = {
      isQA
    };
    this.socketIdsToUsers[socketId] = user;
    this.usersToSocketIds[user] = socketId;

    const sessionToken = crypto.randomBytes(256).toString('hex');
    this.sessionKeys[user] = sessionToken;
    return sessionToken;
  }

  removeUser(user) {
    delete this.state.users[user];
    const socketId = this.usersToSocketIds[user];
    delete this.usersToSocketIds[user];
    delete this.socketIdsToUsers[socketId];
  }

  removeUserBySocketId(socketId) {
    const user = this.socketIdsToUsers[socketId];
    if (user) {
      delete this.socketIdsToUsers[socketId];
      delete this.usersToSocketIds[user];
      delete this.state.users[user];
      return true;
    } else {
      return false;
    }
  }

  setQAStatusForUser(user, isQA) {
    if (this.state.users[user]) {
      this.state.users[user].isQA = isQA;
    }
  }

  setPointsForUser(user, points) {
    if (this.state.users[user]) {
      this.state.users[user].value = points;
    }
  }

  setVisibility(visibility) {
    this.state.visibility = visibility;
  }

  resetPoints() {
    for (let u in this.state.users) {
      this.state.users[u].value = null;
    }
  }
}

module.exports = StoryPoints;
