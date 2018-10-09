var express = require('express');
var http = require('http');
var path = require('path');

var app = express();
var server = http.Server(app);
var io = require('socket.io')(server);


var Vector2d = require('./Library/Vector.js');
var Global = require('./Library/Global.js');
var GameObject = require('./Library/GameObject.js');

var Vector2d = require('./Library/Vector.js');
var Global = require('./Library/Global.js');
var GameObject = require('./Library/GameObject.js');


app.set('port', 8888);  
app.use('/Client', express.static(__dirname + '/Client'));

// Routing
app.get('/', function(request, response) {
    response.sendFile(path.join(__dirname, '/Index.html'));
  });

  //Starts the server.
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
var PlayerLifeCounters = [];
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

    socket.on('newPlayer', function(type, screenWidth, screenHeight, startTime){
        //Assign initial position and team color to the new player.
        let position = initPosition(actualTeam);
        let color = teamColor(actualTeam);

        //Assigned new player
        if(type == "Circle"){
            currentPlayer = new GameObject.playerCir(socket.id, position.x, position.y, color, screenWidth, screenHeight, 50, actualTeam);
        } else if(type == "Rectangle"){
            currentPlayer = new GameObject.playerRect(socket.id, position.x, position.y, color, screenWidth, screenHeight, 40, 120, actualTeam);
        } else if(type == "Line"){
            currentPlayer = new GameObject.playerLine(socket.id, position.x, position.y, color, screenWidth, screenHeight, 100, actualTeam);
        }
        if(currentPlayer != {}){
            Players.push(currentPlayer);
            //Store socket info for sending game update to individual player.
            sockets.push(socket);
            PlayerLifeCounters.push(startTime);
            playerNumInTeam[actualTeam]++;
            socket.emit('healthUpdate', currentPlayer.lifeBar.life);
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

            PlayerLifeCounters.splice(index,1);
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
            else if(click == 2) player.ammoMode = !player.ammoMode;
            else player.emit = false;
        }
        if(player instanceof GameObject.playerCir){
            //Left mouse key: Invisible mode.
            if(click == 1) player.unseen();
            //Enable energy emit.
            if(click == 2) player.emit();
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

    socket.on('lifeCounter', function(startTime){

    })
});

//gameLoop(): Update game state.
function gameLoop(){
    Players.forEach(player =>{
        player.newPos();
        if(player instanceof GameObject.playerCir){
            player.energyArray.forEach(energy =>{
                energy.newPos();
            });
            PointArray.forEach(point=>{
                if(point.inScreen(player.screenTL, player.screenBR)){
                    // Skip collision detection if circle player is invisible.
                    if(player.invisible){
                        //Check if circle player covers the point under its area.
                        if(player.eatPoint(new Vector2d(point.x, point.y))){
                            // Gain mass/lifeBar when a point is shrinking.
                            if(point.shrink()){
                                //TODO: BUG: Circle gets stuck when stretching around the boundary.
                                //Update code for stretch function: 1 = lifeBar update, 2 = size update, 3 = update fail(Maximum reached).
                                let updateCode = player.stretch();
                                if(updateCode == 1){
                                    sockets[Players.indexOf(player)].emit('healthUpdate', player.lifeBar.life);
                                }
                            }
                        }
                    } else {
                        point.newSpeed(player);
                    }
                }
            });
        } else if(player instanceof GameObject.playerRect){
            PointArray.forEach(point=>{
                if(point.inScreen(player.screenTL, player.screenBR)){
                    //If a point is crushed by rectangle, gain liny mass to rectangle.
                    if(!point.newSpeed(player)){
                        for(let i=0; i<5;i++){
                            player.stretch(0.3);
                        }
                    }
                }
            });
        } else if(player instanceof GameObject.playerLine){
            //Update each needle being emitted for each player.
            if(player.emit){
                sockets[Players.indexOf(player)].emit('ammoUpdate', player.ammo);
            }
            player.needleArray.forEach(needle =>{
                needle.newPos();
            });
            PointArray.forEach(point=>{
                if(point.inScreen(player.screenTL, player.screenBR)){
                    if(player.eatPoint(new Vector2d(point.x, point.y), point.radius)){
                        if(point.shrink()){
                            //Stretch line without bonus.
                            player.stretch(1);
                        }
                    }
                }
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
                inScreenEnergy = [],
                grid = [],
                playerInfo = [];

                //Check players interaction within the current screen.
                Players.forEach(player1=>{

                    //Check if other players are in the current player's screen.
                    if(player1.inScreen(player.screenTL, player.screenBR)){

                        //Action if other players are type Circle.
                        if(player1 instanceof GameObject.playerCir){
                            //Collision detection only with enemy.
                            if(player1.team != player.team){
                                //CIRCLE vs CIRCLE
                                if(player instanceof GameObject.playerCir){
                                    if(!(player1.invisible == true || player.invisible == true)){
                                        if(player1.collisionCircle(new Vector2d(player.x, player.y), player.radius)){
                                            shrinkPlayer('C', player1, 0.5);
                                            shrinkPlayer('C', player, 0.5);
                                        }
                                    }
                                }
                                //CIRCLE vs RECTANGLE
                                if(player instanceof GameObject.playerRect){
                                    if(!player1.invisible){
                                        if(player.collisionCircle(new Vector2d(player1.x, player1.y), player1.radius)){
                                            shrinkPlayer('C', player1, 1);
                                        }
                                    }
                                }
                                //CIRCLE vs LINE
                                if(player instanceof GameObject.playerLine){
                                    if(!player1.invisible){
                                        if(player.touchOthers(player1)){
                                            shrinkPlayer('C', player1, 1);
                                        }
                                    }
                                }
                            }
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

                        //Action if other players are type rectangle
                        if(player1 instanceof GameObject.playerRect){
                            if(player1.team != player.team){
                                //RECTANGLE vs RECTANGLE
                                if(player instanceof GameObject.playerRect){
                                    if(player1.collisionRectangle(player)){
                                        shrinkPlayer('R', player1, 0.5);
                                        shrinkPlayer('R', player, 0.5);
                                    }
                                }
                                //RECTANGLE vs LINE
                                if(player instanceof GameObject.playerLine){
                                    if(player1.withLineIntersect(player)){
                                        shrinkPlayer('L', player, 1);
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
                        //Action if other players are type line.
                        if(player1 instanceof GameObject.playerLine){
                            if(player1.team != player.team){
                                //LINE vs LINE
                                if(player instanceof GameObject.playerLine){
                                    if(player1.touchLine(player)){
                                        shrinkPlayer('L', player1, 0.5);
                                        shrinkPlayer('L', player, 0.5);
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
                    }
                    //Check if any needle exists in current player's screen. 
                    if(player1 instanceof GameObject.playerLine){
                        let needleToClean = [];
                        player1.needleArray.forEach(needle =>{
                            if(needle.inScreen(player.screenTL, player.screenBR)){
                                if(player1.team != player.team){
                                    //NEEDLE vs LINE
                                    if(player instanceof GameObject.playerLine){
                                        if(needle.touchOthers(player)){
                                            shrinkPlayer('L', player, 1);
                                        }
                                    }
                                    //NEEDLE vs CIRCLE
                                    else if(player instanceof GameObject.playerCir){
                                        if(!player.invisible){
                                            if(needle.touchOthers(player)){
                                                shrinkPlayer('C', player, 1);
                                            }
                                        }
                                    }
                                    //NEEDLE vs RECTANGLE
                                    else if(player instanceof GameObject.playerRect){
                                        if(needle.touchOthers(player)){
                                            shrinkPlayer('R', player1, 1);
                                        }
                                    }
                                }
                                inScreenNeedle.push({
                                    x: needle.x - player.screenTL.x,
                                    y: needle.y - player.screenTL.y,
                                    endPointX: needle.endPoint.x - player.screenTL.x,
                                    endPointY: needle.endPoint.y - player.screenTL.y
                                });
                                return;
                            }
                            // Delete needle from player array that is far out of game area.
                            else if(!needle.inScreen(new Vector2d(-300,-300), new Vector2d(Global.canvasWidth+300, Global.canvasHeight+300))){
                                let indexToDelete = player1.needleArray.indexOf(needle);
                                needleToClean.push(indexToDelete);
                            }
                        });
                        player1.cleanNeedle(needleToClean); 
                        //DEBUG: console.log(player1.needleArray.length);
                    }

                    //Check if any energy exists in current player's screen. 
                    if(player1 instanceof GameObject.playerCir){
                        let energyToClean = [];
                        player1.energyArray.forEach(energy=>{
                            // Delete needle that is far out of game area.
                            if(energy.radius < 0){
                                let indexToDelete = player1.energyArray.indexOf(energy);
                                    energyToClean.push(indexToDelete);
                                }

                            //Check if energy is in the player screen.
                            else if(energy.inScreen(player.screenTL, player.screenBR)){

                                //Energy becomes toxic to enemy.
                                if(player1.team != player.team){
                                    energy.absorb(player);
                                    if(player instanceof GameObject.playerCir){
                                        shrinkPlayer('C', player, 1);
                                    }
                                    if(player instanceof GameObject.playerRect){
                                        shrinkPlayer('R', player, 1);
                                    }
                                    if(player instanceof GameObject.playerLine){
                                        shrinkPlayer('L', player, 1);
                                    }
                                }
                                else{
                                    if(player1 != player){
                                        //Check collision with player. If true, absorbed will be set true;
                                        energy.absorb(player);
    
                                        if(energy.absorbed){
                                            if(energy.shrink()){
                                                //Enable bonus stretch mode for rect and line.
                                                if(!(player instanceof GameObject.playerCir)){
                                                    player.stretch(Global.energyBonusRate);
                                                    return;
                                                }
                                                player.stretch();
                                            }
                                        }
                                    }
                                }
                                if(energy.radius > 0){
                                    inScreenEnergy.push({
                                        x: energy.x - player.screenTL.x,
                                        y: energy.y - player.screenTL.y,
                                        color: energy.color,
                                        radius: energy.radius
                                    });
                                }
                            }
                        });
                        player1.cleanEnergy(energyToClean); 
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
            
            //TODO: gridGap could be sent in a non-repeated emittion.
            grid.push(Global.gridGap);

            // grid.push(player.grid.x - player.screenTL.x);
            // grid.push(player.grid.y - player.screenTL.y);
            // console.log(player.screenTL.x);
            grid.push(Global.gridGap - player.screenTL.x % Global.gridGap);
            grid.push(Global.gridGap - player.screenTL.y % Global.gridGap);

            playerInfo.push(player.lifeBar.life); //[0]
            if(player instanceof GameObject.playerCir){
                playerInfo.push('C'); //[1] 
                playerInfo.push(player.invisibleTimer.toFixed(2)); //[2]
            } else if(player instanceof GameObject.playerLine){
                playerInfo.push('L'); //[1]
                //TODO: Ammo amount could be sent only when update.
                playerInfo.push(player.ammo); //[2]
                
                playerInfo.push(player.ammoMode); //[3]
            } else if(player instanceof GameObject.playerRect){
                playerInfo.push('R'); //[1]
                //playerInfo.push(player.brick);
            }
            //playerInfo[0]: health amount, [1]: type code, [2].. special info for this type.
            //Emit update info to a specific player.
            //Compress function added to compress reduce network transfer workload. 
            sockets[Players.indexOf(player)].compress(true).emit(
                'gameUpdate', inScreenPlayer, inScreenPoint, inScreenNeedle, inScreenEnergy, playerInfo, grid
            );
        });
    }
}

//Update repeatedly.
setInterval(gameLoop, (1/ Global.fps) * 1000);
setInterval(sendUpdate, (1 / Global.fps)*1000);


//Initial board state.
function initGameBoard(){
    var x, y, color, radius = Global.pointRadius;
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

function shrinkPlayer(playerType, player, amount){
    if(!player.shrink(amount)){
        if(player.bleeding()){
            sockets[Players.indexOf(player)].emit('healthUpdate', player.lifeBar.life);
        } else {
            let index = Players.indexOf(player);
            if(playerType == 'C') player.radius = 0;
            else if(playerType == 'L') player.length = 0;
            else if(playerType == 'R') player.width = 0;
            sockets[index].emit('dead', PlayerLifeCounters[index]);
        }
    }
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

function teamColor(teamNum){
    if(teamNum == 0){
        return "red";
    }
    //Team 1: random position in top right corner.
    else if(teamNum == 1){
        return "yellow";
    }
    //Team 3: random position in bottom left corner.
    else if(teamNum == 2){
        return "lime";

    }
    //Team 4: random position in bottom right corner.
    else if(teamNum == 3){
        return "cyan";
    }
}

