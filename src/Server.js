var express = require('express');
var http = require('http');
var path = require('path');

var app = express();
var server = http.Server(app);
var io = require('socket.io')(server);


var Vector2d = require('./Library/Vector.js');
var Global = require('./Library/Global.js');
var GameObject = require('./Library/GameObject.js');


app.set('port', 8888);  
app.use('/Client', express.static(__dirname + '/Client'));

// Routing
app.get('/', function(request, response) {
    response.sendFile(path.join(__dirname, '/Index.html'));
  });

  // Starts the server.
  //To play with your friends in the same network(wi-fi), 
  //add another string param after 8888 with your ip address (Can be found with ipconfig in cmd).
  //URL will be "yourIP:8888"
server.listen(8888, function() {
    console.log('Server running..');
  });


var Players = [];
var PointArray = [];
var sockets = [];
initGameBoard();

// Add the Web socket handlers. This section will be called when a user connects to the server.
io.on('connection', function(socket){
    //Called when new player being connected.
    //Create new player.
    var currentPlayer = {};
    socket.on('newPlayer', function(type, screenWidth, screenHeight){
        let x = Math.floor(Math.random() * (Global.canvasWidth-1000));
        let y = Math.floor(Math.random() * (Global.canvasHeight-1000));
        //Assigned new player
        if(type == "Circle"){
            currentPlayer = new GameObject.playerCir(socket.id, x, y, "red", screenWidth, screenHeight, 50);
            // Players[socket.id] = new GameObject.playerRect(500, 500,"red", screenWidth, screenHeight, 20, 100);
        } else if(type == "Rectangle"){
            // Players[socket.id] = new GameObject.playerRect(500, 500,"red", screenWidth, screenHeight, 20, 100);
            currentPlayer = new GameObject.playerRect(socket.id, x, y, "red", screenWidth, screenHeight, 40, 120);
        } else if(type == "Line"){
            // Players[socket.id] = new GameObject.playerLine(500,500,"red", screenWidth, screenHeight, 40);
            currentPlayer = new GameObject.playerLine(socket.id, x, y, "red", screenWidth, screenHeight, 100);
        }
        if(currentPlayer != {}){
            Players.push(currentPlayer);
            //Store socket info for sending game update to individual player.
            sockets.push(socket);
            console.log("new player !");
        }

    });

    socket.on('disconnect', function () {
        //Set player to the current user. 
        //Empty object is to prevent from no existing player in connection.
        var index = Players.indexOf(currentPlayer);
        if (index != -1){
            Players.splice(index, 1);
            sockets.splice(socket, 1);
        }
        console.log("Player disconnected !")
    });

    socket.on('mouseClick', function(click){

        //let index = socketIndex[socket.id];

        //Set player to the current user. 
        //Empty object is to prevent from no existing player in connection.
        var player = currentPlayer;

        //Call different functions based on characters.
        if(player instanceof GameObject.playerRect){
            //Left mouse key: Clockwise rotation.
            if(click == 1) player.moveAngle = 2;
            //Right mouse key: Anti-clockwise rotation
            else if(click == 2) player.moveAngle = -2;
            else player.moveAngle = 0;
        } 
        else if (player instanceof GameObject.playerLine){
            //Left mouse key: Needle emission.

            // if(click == 1) player.emit();
            if(click == 1) player.emit = true;
            else player.emit = false;

        }
        if(player instanceof GameObject.playerCir){
            //Left mouse key: Invisible mode.
            if(click == 1) player.unseen();
        }
    });

    //Handle player movement.
    socket.on('mouseMove', function(clientX, clientY){
        var player = currentPlayer;
        player.target = new Vector2d(clientX, clientY);       
    });
});

//gameLoop(): Update game state.
function gameLoop(){
    Players.forEach(player =>{
        player.newPos();
        if(player instanceof GameObject.playerCir){
            // Skip collision detection if circle player is invisible.
            if(!player.invisible){
                PointArray.forEach(point=>{
                    if(point.inScreen(player.screenTL, player.screenBR)){
                        point.newSpeed(player);
                    }
                });
            }
        } else if(player instanceof GameObject.playerRect){
            PointArray.forEach(point=>{
                if(point.inScreen(player.screenTL, player.screenBR)){
                    point.newSpeed(player);
                }
            });
        } else if(player instanceof GameObject.playerLine){
            //Update each needle being emitted for each player.
            player.needleArray.forEach(needle =>{
                needle.newPos();
            });
        }
    });
    //Update new position for point array.
    PointArray.forEach(point =>{
        point.newPos();
    });
}

//Send updated state to each player.
function sendUpdate(){
    if(Players.length > 0){
        Players.forEach(player=>{
            var inScreenPlayer = [],
                inScreenPoint = [],
                inScreenNeedle = [],
                grid = [],
                playerInfo = [];

            //Comparing each player with other players.
            Players.forEach(player1=>{
                //Check if other players are in the current player's screen.
                if(player1.inScreen(player.screenTL, player.screenBR)){
                    if(player1 instanceof GameObject.playerCir){
                        if(player1 != player){
                            if(!(player1.invisible == true || player.invisible == true)){
                                if(player1.collisionFunc(player)){
                                    player1.shrink();
                                    player1.color = "white";
                                } else player1.color = player1.tempColor;
                            }
                        }
                        inScreenPlayer.push({
                            x: player1.x - player.screenTL.x,
                            y: player1.y - player.screenTL.y,
                            color: player1.color,
                            radius: player1.radius,
                            alpha: player1.alpha,
                            type: "Circle"
                        });
                    } else if(player1 instanceof GameObject.playerLine){
                        inScreenPlayer.push({
                            x: player1.x - player.screenTL.x,
                            y: player1.y - player.screenTL.y,
                            color: player1.color,
                            endPointX: player1.endPoint.x,
                            endPointY: player1.endPoint.y,
                            type: "Line"
                        });
                    } else if(player1 instanceof GameObject.playerRect){
                        inScreenPlayer.push({
                            x: player1.x - player.screenTL.x,
                            y: player1.y - player.screenTL.y,
                            color: player1.color,
                            width: player1.width,
                            height: player1.height,
                            angle: player1.angle,
                            type: "Rectangle"
                        });
                    }
                }
                //Check if any needle exists in current player's screen. 
                if(player1 instanceof GameObject.playerLine){
                    player1.needleArray.forEach(needle =>{
                        if(needle.inScreen(player.screenTL, player.screenBR)){
                            inScreenNeedle.push({
                                x: needle.x - player.screenTL.x,
                                y: needle.y - player.screenTL.y,
                                endPointX: needle.endPoint.x,
                                endPointY: needle.endPoint.y
                            });
                        }
                    });
                }
            });
            //Check any points existing in current player's screen.
            PointArray.forEach(point =>{
                if(point.inScreen(player.screenTL, player.screenBR)){
                    inScreenPoint.push({
                        x: point.x - player.screenTL.x,
                        y: point.y - player.screenTL.y,
                        color: point.color,
                        radius: point.radius
                    });
                }
            });
            
            grid.push(Global.gridGap);
            // grid.push(player.grid.x - player.screenTL.x);
            // grid.push(player.grid.y - player.screenTL.y);
            // console.log(player.screenTL.x);
            grid.push(Global.gridGap - player.screenTL.x % Global.gridGap);
            grid.push(Global.gridGap - player.screenTL.y % Global.gridGap);
            if(player instanceof GameObject.playerCir){
                playerInfo.push(player.timer.toFixed(2));
            } else if(player instanceof GameObject.playerLine){
                // playerInfo.push(player.ammo);
            } else if(player instanceof GameObject.playerRect){
                // playerInfo.push(player.brick);
            }
            //Emit update info to a specific player.
            sockets[Players.indexOf(player)].emit(
                'gameUpdate', inScreenPlayer, inScreenPoint, inScreenNeedle, playerInfo, grid
            );
        });
    }
}

//Update repeatedly.
setInterval(gameLoop, 10);
setInterval(sendUpdate, 10);


//Initial board state.
function initGameBoard(){
    var x, y, radius = 10, color;
    for(let i=0; i< Global.maxPoint; i++){
        color = randomColor();
        x = Math.random() * (Global.canvasWidth - radius);
        y = Math.random() * (Global.canvasHeight - radius);
        if(i != 0){
            //Check for overlapping points
            //Note: This does not actually prevent all overlapping, but enough.
            for(let j=0; j< PointArray.length; j++){
                if(new Vector2d(x,y).distance(new Vector2d(PointArray[j].x, PointArray[j].y)) < radius * 2) {
                    x = Math.random() * (Global.canvasWidth - radius);
                    y = Math.random() * (Global.canvasHeight - radius);
                    //j-- to recheck overlapping.
                    j--;
                }
                //TODO: Check overlapping with player object.
            }
        }
        PointArray.push(new GameObject.gamePoint(x, y, color, radius));
    }
}

function randomColor() {
    //Generate a random hex color code.
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

