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
var playerNumInTeam = [0,0,0,0];
var PointArray = []; //Keep track of number of player in each team.
var sockets = [];
initGameBoard();



// Add the Web socket handlers. This section will be called when a user connects to the server.
io.on('connection', function(socket){
    //Called when new player being connected.
    //Create new player.
    var currentPlayer = {},
        actualTeam = -1;

    socket.on('checkTeam', function(desiredTeam){
        //Randomly assign one team if not specified.
        if (desiredTeam == -1) actualTeam = Math.floor(Math.random()*3);
        else actualTeam = desiredTeam;

        //Check balance of player in each team.
        actualTeam = balancePlayer(actualTeam, playerNumInTeam);

        //Inform user if desired team not available.
        if(desiredTeam != -1 && desiredTeam != actualTeam){
            socket.emit('reassignTeam', desiredTeam, actualTeam);
        }
    });

    socket.on('newPlayer', function(type, screenWidth, screenHeight){
        //Random assign initial position of the player depends on team.
        let position = initPosition(actualTeam);

        //Assigned new player
        if(type == "Circle"){
            currentPlayer = new GameObject.playerCir(socket.id, position.x, position.y, "red", screenWidth, screenHeight, 50, actualTeam);
        } else if(type == "Rectangle"){
            currentPlayer = new GameObject.playerRect(socket.id, position.x, position.y, "red", screenWidth, screenHeight, 40, 120, actualTeam);
        } else if(type == "Line"){
            currentPlayer = new GameObject.playerLine(socket.id, position.x, position.y, "red", screenWidth, screenHeight, 100, actualTeam);
        }
        if(currentPlayer != {}){
            Players.push(currentPlayer);
            //Store socket info for sending game update to individual player.
            sockets.push(socket);
            playerNumInTeam[actualTeam]++;
            socket.emit('healthUpdate', currentPlayer.lifeBar.length);
            console.log("new player !");
            console.log(playerNumInTeam);
        }

    });

    socket.on('disconnect', function () {
        //Set player to the current user. 
        //Empty object is to prevent from no existing player in connection.
        let index = Players.indexOf(currentPlayer);
        if (index != -1){
            playerNumInTeam[currentPlayer.team]--;
            Players.splice(index, 1);
            // sockets.splice(socket, 1);
            sockets.splice(index, 1);
            socket.disconnect();
        }
        console.log("Player disconnected !");
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

    //Check the latency of the network.
    //Here the startTime is the time client emitted the event, we pass this back to client
    //so we know how long it needs from travelling through server and back to client.
    socket.on('latency', function(startTime, callback){
        callback(startTime);
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
        // console.log(point.x, point.y);
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

                        //Action if other players are type Circle.
                        if(player1 instanceof GameObject.playerCir){
                            //CIRCLE vs CIRCLE
                            if(player instanceof GameObject.playerCir){
                                if(player1 != player){
                                    if(!(player1.invisible == true || player.invisible == true)){
                                        if(player1.collisionCircle(new Vector2d(player.x, player.y), player.radius)){
                                            if(!player1.shrink()){
                                                if(player1.bleeding()){
                                                    sockets[Players.indexOf(player1)].emit('healthUpdate', player1.lifeBar.length);
                                                } else {/*TODO: Player dead*/}
                                            }
                                            player1.color = "white";
                                        } else player1.color = player1.originalColor;
                                    } 
                                }
                            } else player1.color = player1.originalColor;
                            //CIRCLE vs RECTANGLE
                            if(player instanceof GameObject.playerRect){
                                if(!player1.invisible){
                                    if(player.collisionCircle(new Vector2d(player1.x, player1.y), player1.radius)){
                                        if(!player1.shrink()){
                                            if(player1.bleeding()){
                                                sockets[Players.indexOf(player1)].emit('healthUpdate', player1.lifeBar.length);
                                            } else {/*TODO: Player dead*/}
                                        }
                                    }
                                }
                            }

                            //CIRCLE vs LINE
                            if(player instanceof GameObject.playerLine){
                                if(player1.invisible != true){
                                    if(player.touchOthers(player1)){
                                        if(!player1.shrink()){
                                            if(player1.bleeding()){
                                                sockets[Players.indexOf(player1)].emit('healthUpdate', player1.lifeBar.length);
                                            } else {/*TODO: Player dead*/}
                                        }
                                        player1.color = "white";
                                    } else player1.color = player1.originalColor;
                                }
                            } else player1.color = player1.originalColor;

                            //Add all visible players to current player screen.
                            inScreenPlayer.push({
                                x: player1.x - player.screenTL.x,
                                y: player1.y - player.screenTL.y,
                                color: player1.color,
                                radius: player1.radius,
                                alpha: player1.alpha,
                                type: "Circle"
                            });
                        }
                        //Action if other players are type line.
                        if(player1 instanceof GameObject.playerLine){
                            //LINE vs CIRCLE
                            if(player instanceof GameObject.playerCir){}

                            //LINE vs RECTANGLE
                            if(player instanceof GameObject.playerRect){
                            }

                            //LINE vs LINE
                            if(player instanceof GameObject.playerLine){
                                if(player1 != player){
                                    if(player1.touchLine(player)){
                                        if(!player1.shrink()){
                                            if(player1.bleeding()){
                                                sockets[Players.indexOf(player1)].emit('healthUpdate', player1.lifeBar.length);
                                            } else {/*TODO: Player dead*/}
                                        }
                                    }
                                }
                            }

                            inScreenPlayer.push({
                                x: player1.x - player.screenTL.x,
                                y: player1.y - player.screenTL.y,
                                color: player1.color,
                                endPointX: player1.endPoint.x - player.screenTL.x,
                                endPointY: player1.endPoint.y - player.screenTL.y,
                                type: "Line"
                            });
                        }
                        //Action if other players are type rectangle
                        if(player1 instanceof GameObject.playerRect){
                            //RECTANGLE vs CIRCLE
                            if(player instanceof GameObject.playerCir){}
                            
                            //RECTANGLE vs RECTANGLE
                            if(player instanceof GameObject.playerRect){
                                if(player1 != player){
                                    if(player1.collisionRectangle(player)){
                                        if(!player1.shrink()){
                                            if(player1.bleeding()){
                                                sockets[Players.indexOf(player1)].emit('healthUpdate', player1.lifeBar.length);
                                            } else {
                                                /*TODO: Player dead*/
                                            }
                                        }
                                    }
                                }
                                
                            }
                            //RECTANGLE vs LINE
                            if(player instanceof GameObject.playerLine){
                                if(player1.withLineIntersect(player)){ 
                                    if(!player1.shrink()){
                                        if(player1.bleeding()){
                                            sockets[Players.indexOf(player1)].emit('healthUpdate', player1.lifeBar.length);
                                        } else {/*TODO: Player dead*/}
                                    }
                                }
                            }


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
                                //TODO: Check line segment intersection.
                                if(player1 != player){
                                    if(player.invisible != true){
                                        if(needle.touchOthers(player)){
                                            if(player.shrink()){
                                                sockets[Players.indexOf(player)].emit('healthUpdate', player.lifeBar.length);
                                                player.color = "white";
                                            } else {
                                                sockets[Players.indexOf(player)].emit('dead');
                                            }
                                            console.log(player.lifeBar.length);
                                        } else player.color = player.originalColor;
                                    }
                                }
                                inScreenNeedle.push({
                                    x: needle.x - player.screenTL.x,
                                    y: needle.y - player.screenTL.y,
                                    endPointX: needle.endPoint.x - player.screenTL.x,
                                    endPointY: needle.endPoint.y - player.screenTL.y
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
            //Compress function added to compress reduce network transfer workload. 
            sockets[Players.indexOf(player)].compress(true).emit(
                'gameUpdate', inScreenPlayer, inScreenPoint, inScreenNeedle, playerInfo, grid
            );
        });
    }
}

//Update repeatedly.
setInterval(gameLoop, (1/ Global.fps) * 1000);
setInterval(sendUpdate, (1 / Global.fps)*1000);


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
        // PointArray.push(new GameObject.gamePoint(100, 100, color, radius));

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

//Check if a player assigned to a team will break the balance in player number across each team.
function balancePlayer(desireTeam, playerEachTeam){
    let min = Math.min.apply(Math, playerEachTeam),
        max = Math.max.apply(Math, playerEachTeam),
        index = [];
        //Assign player to the team with minimum players.
        if(max - min >= 3 || min == 0){
            //Get all the team indexes with minimum players.
            index = getAllIndexes(playerEachTeam, min);
            //Return the desired team if the it is one of the fewest-player teams.
            if(index.indexOf(desireTeam)!= -1){
                return desireTeam;
            } else{
                //if desired team not having minimum player, randomly assign to a team with fewest players.
                return index[Math.floor(Math.random()*index.length)];
            }
        } else {
            //Still balanced.
            return desireTeam;
        }
}

//Function to get all indexes of elements holding a certain value in the array.
function getAllIndexes(arr, val) {
    let index = []
        i = arr.indexOf(val);
    while (i != -1){
        index.push(i);
        //Search the next index with the value==val
        i = arr.indexOf(val, i+1);
    }
    return index;
}


function initPosition(teamNum){
    var x, y,boundDist = 500, range = 3000, xRange, yRange;    
    //Assign random x and y values in a range on the canvas for each team.
    //First argument of xRange/yRange is the minimum and second is the maximum.

    //Team 0: random position in top left corner.
    if(teamNum == 0){
        xRange = new Vector2d(boundDist, boundDist + range);
        yRange = new Vector2d(boundDist, boundDist + range);
    }
    //Team 1: random position in top right corner.
    else if(teamNum == 1){
        xRange = new Vector2d(Global.canvasWidth-(boundDist+range), Global.canvasWidth-boundDist);
        yRange = new Vector2d(boundDist, boundDist+range);
    }
    //Team 3: random position in bottom left corner.
    else if(teamNum == 2){
        xRange = new Vector2d(boundDist, boundDist + range);
        yRange = new Vector2d(Global.canvasHeight - (boundDist+range), Global.canvasHeight - boundDist);
    }
    //Team 4: random position in bottom right corner.
    else if(teamNum == 3){
        xRange = new Vector2d(Global.canvasWidth - (boundDist + range), Global.canvasWidth - boundDist);
        yRange = new Vector2d(Global.canvasHeight - (boundDist + range), Global.canvasHeight - boundDist);
    }
    x = Math.floor(Math.random() * (xRange.y - xRange.x)) + xRange.x;
    y = Math.floor(Math.random() * (yRange.y - yRange.x)) + yRange.x;
    return new Vector2d(x, y);
}

