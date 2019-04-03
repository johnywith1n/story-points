const path = require('path');
const express = require('express');
const handlebars  = require('express-handlebars');
const Rooms = require('./src/server/Rooms');
const events = require('./src/events');

const env = process.env.NODE_ENV || 'development';
const port = process.env.PORT || 3010;
const app = express();

app.engine('html', handlebars({
  layoutsDir: '/src/browser/html',
  extname: '.html',
  defaultLayout: false
}));
app.set('view engine', 'html');
app.set('views', './src/browser/html');
app.use('/dist', express.static(path.join(__dirname, 'src/browser/dist')));

const getSecret = () => {
  return process.env.SECRET;
};

const getAdminSecret = () => {
  return process.env.ADMIN_SECRET;
};

const verifyPayload = (data, requireRoom=true) => {
  const secret = getSecret();
  if (secret == null) {
    return false;
  }

  if (requireRoom && data.room == null) {
    return false;
  }

  return data.secret === secret;
};

const verifyAdminPayload = (data) =>{
  const secret = getAdminSecret();
  if (secret == null) {
    return false;
  }

  return data.secret === secret;
};

app.get('/', (req, res) => {
  const secret = req.query.secret;
  if (!verifyPayload({secret}, false)) {
    return res.send('Hello World');
  }

  return res.render('index.html', {
    isProduction: env === 'production'
  });
});

app.get('/admin/serverState', (req, res) => {
  const secret = req.query.secret;
  if (!verifyAdminPayload({secret})) {
    return res.send('to be implemented');
  }

  const state = {};
  Object.entries(rooms.rooms).forEach(([roomName, room]) => {
    const roomState = {};
    state[roomName] = roomState;
    roomState.storyPoints = room.storyPoints.state;
    roomState.timer = room.timer.state;
  });
  return res.json(state);
});

const http = require('http').Server(app);
const io = require('socket.io')(http, {
  pingTimeout: 300000 // chrome will timeout in under a minute if tab is left in background
});

const rooms = new Rooms(io);

const broadcastState = ({room='', reset=false} = {}) => {
  if (!room) {
    // eslint-disable-next-line no-console
    console.error('broadcasting state without room');
    return;
  }
  io.sockets.to(room).emit(events.STATE_UPDATE, rooms.getRoom(room).storyPoints.getState(reset));
};

io.on('connection', (socket) => {
  socket.on(events.ADD_USER, (data, fn) => {
    if (!verifyPayload(data)) return;
    const room = rooms.getRoom(data.room);
    const sessionToken = room.storyPoints.addUser(data.name, data.token, socket.id, data.isQA);
    if (sessionToken) {
      socket.join(data.room, () => {
        rooms.addSocketId(socket.id, room);
        broadcastState({room: data.room});
        fn({
          event: events.USER_JOINED,
          token: sessionToken
        });
      });
    } else {
      rooms.cleanupIfEmpty(data.room);
      fn({
        event: events.FAILED_JOIN,
      });
    }
  });

  socket.on('disconnect', () => {
    const room = rooms.getRoomForSocketId(socket.id);
    if (room && room.storyPoints.removeUserBySocketId(socket.id)) {
      rooms.removeSocketid(socket.id);
      broadcastState({room:room.roomName});
      rooms.cleanupIfEmpty(room.roomName);
    }
  });

  socket.on(events.REMOVE_USER, (data) => {
    if (!verifyPayload(data)) return;
    socket.leave(data.room);
    rooms.getRoom(data.room).storyPoints.removeUser(data.name);
    broadcastState({room:data.room});
    rooms.cleanupIfEmpty(data.room);
  });

  socket.on(events.SET_QA_STATUS, (data) => {
    if (!verifyPayload(data)) return;
    rooms.getRoom(data.room).storyPoints.setQAStatusForUser(data.name, data.isQA);
    broadcastState({room:data.room});
  });

  socket.on(events.SET_POINT_VALUE, (data, fn) => {
    if (!verifyPayload(data)) return;
    const room = rooms.getRoom(data.room);
    if (!room.storyPoints.hasUser(data.name)) {
      return fn(events.DISCONNECTED);
    }
    
    room.storyPoints.setPointsForUser(data.name, data.value);
    broadcastState({room:data.room});
  });

  socket.on(events.SET_VISIBILITY, (data) => {
    if (!verifyPayload(data)) return;
    const room = rooms.getRoom(data.room);
    room.storyPoints.setVisibility(data.visibility);
    broadcastState({room:data.room});
  });

  socket.on(events.RESET_POINTS, (data) => {
    if (!verifyPayload(data)) return;
    const room = rooms.getRoom(data.room);
    room.storyPoints.resetPoints();
    broadcastState({room:data.room, reset:true});
  });

  socket.on(events.NEXT_STORY, (data) => {
    if (!verifyPayload(data)) return;
    const room = rooms.getRoom(data.room);
    room.storyPoints.resetPoints();
    room.storyPoints.setVisibility(false);
    broadcastState({room:data.room, reset:true});
  });

  socket.on(events.START_TIMER, (data) => {
    if (!verifyPayload(data) || !Number.isInteger(data.time)) return;
    const room = rooms.getRoom(data.room);
    room.timer.startTimer(data.time);
  });

  socket.on(events.RESET_TIMER, (data) => {
    if (!verifyPayload(data)) return;
    const room = rooms.getRoom(data.room);
    room.timer.resetTimer();
  });

  socket.on(events.PAUSE_TIMER, (data) => {
    if (!verifyPayload(data)) return;
    const room = rooms.getRoom(data.room);
    room.timer.pauseTimer();
  });

  socket.on(events.CONTINUE_TIMER, (data) => {
    if (!verifyPayload(data)) return;
    const room = rooms.getRoom(data.room);
    room.timer.continueTimer();
  });

  socket.on(events.GET_TIMER_STATE, (data, fn) => {
    if (!verifyPayload(data)) return;
    const room = rooms.getRoom(data.room);
    fn(room.timer.getState());
  });

  socket.on(events.HARD_RESET_TIMER, (data) => {
    if (!verifyPayload(data)) return;
    const room = rooms.getRoom(data.room);
    room.timer.hardResetTimer();
  });

});

http.listen(port, () =>
  // eslint-disable-next-line no-console
  console.log(`Example app listening on port ${port}!`)
);
