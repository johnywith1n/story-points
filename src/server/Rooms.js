const StoryPoints = require('./StoryPoints');
const Timer = require('./Timer');

class Room {
  constructor(roomName, io) {
    this.roomName = roomName;
    this.storyPoints = new StoryPoints(roomName);
    this.timer = new Timer(roomName, io);
  }
}

class Rooms {
  constructor(io) {
    this.io = io;
    this.rooms = {};
    this.socketIdToRooms = {};
  }

  /**
   * @param {string} socketId
   * @returns {Room}
   * @memberof Rooms
   */
  getRoomForSocketId(socketId) {
    return this.socketIdToRooms[socketId];
  }
  
  addSocketId(socketId, room) {
    this.socketIdToRooms[socketId] = room;
  }

  removeSocketid(socketId) {
    delete this.socketIdToRooms[socketId];
  }

  /**
   * @param {string} roomName
   * @returns {Room}
   */
  getRoom(roomName) {
    if (roomName in this.rooms) {
      return this.rooms[roomName];
    } else {
      const room = new Room(roomName, this.io);
      this.rooms[roomName] = room;
      return room;
    }
  }

  hasRoom(roomName) {
    return roomName in this.rooms;
  }

  cleanupIfEmpty(roomName) {
    const room = this.getRoom(roomName);
    if (room.storyPoints.users().length == 0) {
      room.timer.clearInterval();
      this.removeRoom(roomName);
    }
  }

  removeRoom(roomName) {
    delete this.rooms[roomName];
  }
}

module.exports = Rooms;