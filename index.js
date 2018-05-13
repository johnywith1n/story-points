const express = require('express');
const handlebars  = require('express-handlebars');
const StoryPoints = require('./src/server/StoryPoints');
const events = require('./src/events');

const env = process.env.NODE_ENV || 'development';
const port = 3010;
const app = express();

app.engine('html', handlebars({
  layoutsDir: '/src/browser/html',
  extname: '.html',
  defaultLayout: false
}));
app.set('view engine', 'html');
app.set('views', './src/browser/html');
app.use(express.static('src/browser'));

app.get('/', (req, res) => 
  res.render('index.html', {
    isProduction: env === 'production'
  })
);

const http = require('http').Server(app);
const io = require('socket.io')(http);

const broadcastState = () => {
  io.sockets.emit(events.STATE_UPDATE, StoryPoints.getState());
};

io.on('connection', (socket) => {
  socket.on(events.ADD_USER, (data, fn) => {
    if (StoryPoints.addUser(data.name)) {
      broadcastState();
      fn(events.USER_JOINED);
    } else {
      fn(events.FAILED_JOIN);
    }
  });

  socket.on(events.REMOVE_USER, (data) => {
    StoryPoints.removeUser(data.name);
    broadcastState();
  });

  socket.on(events.SET_POINT_VALUE, (data) => {
    StoryPoints.setPointsForUser(data.name, data.value);
    broadcastState();
  });

  socket.on(events.SET_VISIBILITY, (data) => {
    StoryPoints.setVisibility(data.visibility);
    broadcastState();
  });

  socket.on(events.RESET_POINTS, () => {
    StoryPoints.resetPoints();
    broadcastState();
  });
});

http.listen(port, () => 
  // eslint-disable-next-line no-console
  console.log(`Example app listening on port ${port}!`)
);
