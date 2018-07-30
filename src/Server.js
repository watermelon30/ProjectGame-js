var express = require('express');
var http = require('http');
var path = require('path');
var socketIO = require('socket.io');

var app = express();
var server = http.Server(app);
var io = socketIO(server);

app.set('port', 8888);
app.use('/Client', express.static(__dirname + '/Client'));

// Routing
app.get('/', function(request, response) {
    response.sendFile(path.join(__dirname, 'Index.html'));
  });

  // Starts the server.
server.listen(8888, function() {
    console.log('Server running..');
  });

// Add the WebSocket handlers
io.on('connection', function(socket) {
});

    