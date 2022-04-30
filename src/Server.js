
import express from 'express';
import Http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';

import { Vector2d } from './Library/Vector.js';
import { GamePoint, PlayerLine, PlayerRect, PlayerCir } from './Library/GameObject.js';
import { CONFIG, PLAYERTYPE } from './/Library/Global.js';

var app = express(); // express functions that will handle events server gets.
var httpServer = Http.Server(app);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// An io object that waits for the new client of this server to connect to.
var io = new Server(httpServer);

// Setup the port. Allow to define environment variable PORT to set the port for web server.
var port = process.env.PORT || 8081;

// Send Index.html back to the new client when server gets a request from them.
app.get('/', function (request, response)
{
    response.sendFile(path.join(__dirname, '/Index.html'));
});

// Configuring middleware layer between client and server.
// File in Client(App.js) will be run first when a message is sent from server to client or the other way round.
app.use('/Client', express.static(__dirname + '/Client'));
app.use('/Library', express.static(__dirname + '/Library'));

// Starts the server with port == 8081|environment port.
httpServer.listen(port, function ()
{
    console.log('Server running..');
});

/**
 * To play with your friends within the same network, comment out the server.listen(..) code above and
 * run the one below instead. Change 'your_ip_address' string to the ip address of your machine.
 * (Ip can be found by 'ipconfig' in cmd). Url to the game will be 'your_ip_address:8081'.
 */

//   server.listen('8081', 'your_ip_address', function() {
//     console.log('Server running on your network..');
//   });

var playersList = []; // Storing each player info.
var playersListForClient = {};
var playerNumInTeam = [0, 0, 0, 0]; // Keep track of number of player in each team.
var pointsArray = [];
var sockets = []; // Storing each player socket.
var playerLifeCounters = []; // Keep track of the time of a player in the game.

initGameBoard();

// Add the web socket handlers. This section will be called when a user connects to the server successfully.
io.on('connection', function (socket)
{
    // Inform server
    console.log("Player connected!");

    // Create new player.
    var currentPlayer = {},
        actualTeam = -1;

    // Check the availability of the player desired team.
    socket.on('checkTeam', function (desiredTeam)
    {
        // Randomly assign one team if not specified.
        if (desiredTeam == -1) actualTeam = Math.floor(Math.random() * 3);
        else actualTeam = desiredTeam;

        // Check balance of player in each team.
        actualTeam = balancePlayer(actualTeam, playerNumInTeam);

        // Inform user if desired team not available.
        if (desiredTeam != -1 && desiredTeam != actualTeam)
        {
            socket.emit('reassignTeam', desiredTeam, actualTeam);
        }
    });

    // Handling new player event.
    socket.on('newPlayer', function (type, screenWidth, screenHeight, startTime)
    {
        // Assign initial position and team color to the new player.
        let position = initPosition(actualTeam);
        let color = getTeamColor(actualTeam);

        // Assign new player
        if (type == PLAYERTYPE.circle)
        {
            currentPlayer = new PlayerCir(socket.id, position.x, position.y, color, screenWidth, screenHeight, CONFIG.circleDefaultR, actualTeam);
            playersListForClient[socket.id] = {
                x: position.x,
                y: position.y,
                color: color,
                radius: CONFIG.circleDefaultR,
                alpha: currentPlayer.alpha,
                type: type
            };

        }
        else if (type == PLAYERTYPE.rectangle)
        {
            currentPlayer = new PlayerRect(socket.id, position.x, position.y, color, screenWidth, screenHeight, CONFIG.rectDefaultW, CONFIG.rectDefaultH, actualTeam);
            playersListForClient[socket.id] = {
                x: position.x,
                y: position.y,
                color: color,
                width: CONFIG.rectDefaultW,
                height: CONFIG.rectDefaultH,
                angle: currentPlayer.angle,
                type: type
            };
        }
        else if (type == PLAYERTYPE.line)
        {
            currentPlayer = new PlayerLine(socket.id, position.x, position.y, color, screenWidth, screenHeight, CONFIG.lineDefaultL, actualTeam);
            playersListForClient[socket.id] = {
                x: position.x,
                y: position.y,
                color: color,
                endPointX: currentPlayer.endPoint.x,
                endPointY: currentPlayer.endPoint.y,
                type: type
            };

        }
        if (currentPlayer != {})
        {
            console.log("socket Id: ", socket.id);
            // Storing player and socket info.
            playersList.push(currentPlayer);
            sockets.push(socket);
            playerLifeCounters.push(startTime);


            // Keeping track of each team player num.
            playerNumInTeam[actualTeam]++;
            socket.emit('healthUpdate', currentPlayer.lifeBar.life);
            socket.emit('screenTL', currentPlayer.screenTL);
            socket.emit('gridGap', CONFIG.gridGap);
            socket.emit('playersList', playersListForClient);
            console.log("new player !");
            console.log(playerNumInTeam);
        }
    });


    // Handling disconnect event
    socket.on('disconnect', function ()
    {
        // Set player to the current user. 
        // Empty object is to prevent from no existing player in connection.
        let index = playersList.indexOf(currentPlayer);
        if (index != -1)
        {
            playerNumInTeam[currentPlayer.team]--;
            playersList.splice(index, 1);
            sockets.splice(index, 1);
            playerLifeCounters.splice(index, 1);

            socket.disconnect();
        }
        console.log("Player disconnected !");
    });


    // Handling mouse click event.
    socket.on('mouseClick', function (click)
    {
        // let index = socketIndex[socket.id];

        // Set player to the current user. 
        // Empty object is to prevent from no existing player in connection.
        let player = currentPlayer;

        // Call different functions based on type of player.
        if (player instanceof PlayerRect)
        {
            // Left mouse key: Clockwise rotation.
            if (click == 1) player.moveAngle = 2;
            // Right mouse key: Anti-clockwise rotation
            else if (click == 2) player.moveAngle = -2;
            else player.moveAngle = 0;
        }
        else if (player instanceof PlayerLine)
        {
            // Left mouse key: Needle emission.
            if (click == 1) player.emit = true;
            // Right mouse key: Switching mode
            else if (click == 2) player.ammoMode = !player.ammoMode;
            else player.emit = false;
        }
        else if (player instanceof PlayerCir)
        {
            // Left mouse key: Invisible mode.
            if (click == 1) player.unseen();
            // Enable energy emission.
            if (click == 2) player.emit();
        }
    });

    // Handle player movement.
    socket.on('mouseMove', function (clientX, clientY)
    {
        let player = currentPlayer;
        player.target = new Vector2d(clientX, clientY);
    });

    // Check the latency of the network.
    // Here the startTime is the time client emitted the event, we pass this back to client
    // So we know how long it needs from travelling through server and back to client.
    socket.on('latency', function (startTime, callback)
    {
        // console.log(callback.toString());
        // console.log(Date.now() - startTime);
        callback(startTime);
    });

});

// gameLoop(): Updating game state.
function gameLoop()
{
    // Update new position for point objects.
    pointsArray.forEach(point =>
    {
        point.newPos();
        // Console.log(point.x, point.y); // DEBUG
    });

    // Handling player and public objects interaction.
    playersList.forEach(player =>
    {
        var inScreenPoint = [];
        // Update player position.
        player.newPos();

        sockets[playersList.indexOf(player)].emit('screenTL', player.screenTL);

        if (player instanceof PlayerCir)
        {
            // Update energy object position for circle.
            player.energyArray.forEach(energy =>
            {
                energy.newPos();
            });
            // Check objects collision.
            pointsArray.forEach(point =>
            {
                if (!point.inScreen(player.screenTL, player.screenBR))
                {
                    return;
                }
                // Allow absorption when circle is in invisible mode.
                if (player.invisible)
                {
                    // Check if circle player covers the point under its area.
                    if (player.eatPoint(new Vector2d(point.x, point.y)))
                    {
                        // Gain mass/lifeBar when a point is shrinking.
                        if (point.shrink())
                        {
                            // TODO: Circle gets stuck when stretching around the boundary.

                            // Update code for stretch function: 1 = lifeBar update, 2 = size update, 3 = update fail(Maximum reached).
                            let updateCode = player.stretch();
                            if (updateCode == 1)
                            {
                                sockets[playersList.indexOf(player)].emit('healthUpdate', player.lifeBar.life);
                            }
                        }
                    }
                }
                // Assign new speed to the point objects. 
                else
                {
                    point.newSpeed(player);
                }
                inScreenPoint.push({
                    x: point.x,
                    y: point.y,
                    color: point.color,
                    radius: point.radius
                });
            });
        }
        else if (player instanceof PlayerRect)
        {
            pointsArray.forEach(point =>
            {
                if (!point.inScreen(player.screenTL, player.screenBR))
                {
                    return;
                }
                // If a point is crushed by rectangle, gain tiny mass to rectangle.
                if (!point.newSpeed(player))
                {
                    for (let i = 0; i < 5; i++)
                    {
                        player.stretch(0.3);
                    }
                }
                else
                {
                    inScreenPoint.push({
                        x: point.x,
                        y: point.y,
                        color: point.color,
                        radius: point.radius
                    });
                }
            });
        }
        else if (player instanceof PlayerLine)
        {
            // Update emit amount when emission.
            // if(player.emit){
            //     sockets[Players.indexOf(player)].emit('ammoUpdate', player.ammo);
            // }
            // Update needle objects position.
            player.needleArray.forEach(needle =>
            {
                needle.newPos();
            });

            pointsArray.forEach(point =>
            {
                if (!point.inScreen(player.screenTL, player.screenBR))
                {
                    return;
                }
                if (player.eatPoint(new Vector2d(point.x, point.y), point.radius))
                {
                    // Shrink point object and stretch line player when collision.
                    if (point.shrink())
                    {
                        // Stretch line without bonus.
                        player.stretch(1);
                    }
                }
                inScreenPoint.push({
                    x: point.x,
                    y: point.y,
                    color: point.color,
                    radius: point.radius
                });
            });
        }
        sockets[playersList.indexOf(player)].emit('pointsUpdate', inScreenPoint);
    });

    sendUpdate();
}

// Send updated state to each player.
function sendUpdate()
{
    playersList.forEach(player =>
    {
        var inScreenPlayer = [],
            inScreenNeedle = [],
            inScreenEnergy = [],
            playerInfo = [];

        // sockets[Players.indexOf(player)].emit('self', inScreenPlayer, inScreenNeedle, inScreenEnergy, playerInfo);

        // Check interaction between players within the current screen.
        playersList.forEach(player1 =>
        {
            // Check if other players are in the current player's screen.
            if (player1.inScreen(player.screenTL, player.screenBR))
            {
                // Action if other players are type Circle.
                if (player1 instanceof PlayerCir)
                {
                    // Collision detection only with enemy.
                    if (player1.team != player.team)
                    {
                        // Only check player interaction if circle is visible.
                        if (!player1.invisible)
                        {
                            // CIRCLE vs CIRCLE
                            if (player instanceof PlayerCir)
                            {
                                // Interaction only if both are not invisible.
                                if (!player.invisible)
                                {
                                    if (player1.collisionCircle(new Vector2d(player.x, player.y), player.radius))
                                    {
                                        // Shrinking both circles.
                                        shrinkPlayer('C', player1, 0.5);
                                        shrinkPlayer('C', player, 0.5);
                                    }
                                }
                            }
                            // CIRCLE vs RECTANGLE
                            if (player instanceof PlayerRect)
                            {
                                if (player.collisionCircle(new Vector2d(player1.x, player1.y), player1.radius))
                                {
                                    shrinkPlayer('C', player1, 1);
                                }
                            }
                            // CIRCLE vs LINE
                            if (player instanceof PlayerLine)
                            {
                                if (player.touchOthers(player1))
                                {
                                    shrinkPlayer('C', player1, 1);
                                }
                            }
                        }
                    }
                    // Add all circle players visible to current player into the array.
                    inScreenPlayer.push({
                        x: player1.x,
                        y: player1.y,
                        color: player1.color,
                        radius: player1.radius,
                        alpha: player1.alpha,
                        type: player1.type
                    });
                }
                // Action if other players are type Rectangle
                else if (player1 instanceof PlayerRect)
                {
                    if (player1.team != player.team)
                    {
                        // RECTANGLE vs RECTANGLE
                        if (player instanceof PlayerRect)
                        {
                            if (player1.collisionRectangle(player))
                            {
                                // Shrink both rectangle players.
                                shrinkPlayer('R', player1, 0.5);
                                shrinkPlayer('R', player, 0.5);
                            }
                        }
                        // RECTANGLE vs LINE
                        if (player instanceof PlayerLine)
                        {
                            // Shrink line player.
                            if (player1.withLineIntersect(player))
                            {
                                shrinkPlayer('L', player, 1);
                            }
                        }
                    }
                    // Add all rectangle players visible to current player into the array.
                    inScreenPlayer.push({
                        x: player1.x,
                        y: player1.y,
                        color: player1.color,
                        width: player1.width,
                        height: player1.height,
                        angle: player1.angle,
                        type: player1.type
                    });
                }
                // Action if other players are type Line.
                else if (player1 instanceof PlayerLine)
                {
                    if (player1.team != player.team)
                    {
                        // LINE vs LINE
                        if (player instanceof PlayerLine)
                        {
                            if (player1.touchLine(player))
                            {
                                // Shrink both line.
                                shrinkPlayer('L', player1, 0.5);
                                shrinkPlayer('L', player, 0.5);
                            }
                        }
                    }
                    // Add all line player visible to current player into the array. 
                    inScreenPlayer.push({
                        x: player1.x,
                        y: player1.y,
                        color: player1.color,
                        endPointX: player1.endPoint.x,
                        endPointY: player1.endPoint.y,
                        type: player1.type
                    });
                }
            }
            // Check if any needle exists in current player's screen.
            if (player1 instanceof PlayerLine)
            {
                let needlesToClean = [];

                // Check needles interaction with enemy players.
                player1.needleArray.forEach(needle =>
                {
                    if (!needle.inScreen(player.screenTL, player.screenBR))
                    {
                        return;
                    }
                    if (player1.team != player.team)
                    {
                        // NEEDLE vs LINE
                        if (player instanceof PlayerLine)
                        {
                            if (needle.touchOthers(player))
                            {
                                shrinkPlayer('L', player, 1);
                            }
                        }
                        // NEEDLE vs CIRCLE
                        else if (player instanceof PlayerCir)
                        {
                            if (!player.invisible)
                            {
                                if (needle.touchOthers(player))
                                {
                                    shrinkPlayer('C', player, 1);
                                }
                            }
                        }
                        // NEEDLE vs RECTANGLE
                        else if (player instanceof PlayerRect)
                        {
                            if (needle.touchOthers(player))
                            {
                                shrinkPlayer('R', player, 1);
                            }
                        }
                        // Add needle objects visible to current player into the array.
                        inScreenNeedle.push({
                            x: needle.x,
                            y: needle.y,
                            endPointX: needle.endPoint.x,
                            endPointY: needle.endPoint.y
                        });
                    }
                    // Add needles from line player that are far out of game area to the array waiting to be cleaned.
                    else if (!needle.inScreen(new Vector2d(-300, -300), new Vector2d(CONFIG.canvasWidth + 300, CONFIG.canvasHeight + 300)))
                    {
                        let indexToDelete = player1.needleArray.indexOf(needle);
                        needlesToClean.push(indexToDelete);
                    }
                });
                // Cleaning out of bound needles.
                player1.cleanNeedles(needlesToClean);
                // DEBUG: console.log(player1.needleArray.length);
            }
            // Check if any energy exists in current player's screen. 
            else if (player1 instanceof PlayerCir)
            {
                let energiesToClean = [];

                // Check energy objects interaction with players.
                player1.energyArray.forEach(energy =>
                {
                    // Add energy objects that are too small to the array waiting to be cleaned.
                    if (energy.radius <= 0)
                    {
                        let indexToDelete = player1.energyArray.indexOf(energy);
                        energiesToClean.push(indexToDelete);
                        return;
                    }
                    // Check if energy is in the player screen.
                    if (!energy.inScreen(player.screenTL, player.screenBR))
                    {
                        return;
                    }
                    // Energy will become toxic to the enemy.
                    if (player1.team != player.team)
                    {
                        energy.absorb(player);
                        if (energy.absorbed)
                        {
                            if (energy.shrink())
                            {
                                if (player instanceof PlayerCir)
                                {
                                    shrinkPlayer('C', player, 1);
                                }
                                if (player instanceof PlayerRect)
                                {
                                    shrinkPlayer('R', player, 1);
                                }
                                if (player instanceof PlayerLine)
                                {
                                    shrinkPlayer('L', player, 1);
                                }
                            }
                        }
                    }
                    // Energy being absorbed by teammate.
                    else
                    {
                        if (player1 != player)
                        {
                            // Check collision with player. If true, absorbed will be set true;
                            energy.absorb(player);

                            if (energy.absorbed)
                            {
                                if (energy.shrink())
                                {
                                    // Enable bonus stretch mode for rect and line.
                                    if (!(player instanceof PlayerCir))
                                    {
                                        player.stretch(CONFIG.energyBonusRate);
                                        return;
                                    }
                                    player.stretch();
                                }
                            }
                        }
                    }
                    // Adding visible energy objects to the array.
                    if (energy.radius > 0)
                    {
                        inScreenEnergy.push({
                            x: energy.x,
                            y: energy.y,
                            color: energy.color,
                            radius: energy.radius
                        });
                    }
                });
                // Cleaning energy objects.
                player1.cleanEnergies(energiesToClean);
            }
        });

        // Check any point objects existing in current player's screen.
        // PointArray.forEach(point =>{
        //     if(point.inScreen(player.screenTL, player.screenBR)){
        //         inScreenPoint.push({
        //             x: point.x - player.screenTL.x,
        //             y: point.y - player.screenTL.y,
        //             color: point.color,
        //             radius: point.radius
        //         });
        //     }
        // });

        // grid.push(player.grid.x - player.screenTL.x);
        // grid.push(player.grid.y - player.screenTL.y);
        // console.log(player.screenTL.x);

        // Finding the first line of grip to be drawn on player screen.
        // grid.push(CONFIG.gridGap - player.screenTL.x % CONFIG.gridGap);
        // grid.push(CONFIG.gridGap - player.screenTL.y % CONFIG.gridGap);


        playerInfo.push(player.lifeBar.life); //[0]
        if (player instanceof PlayerCir)
        {
            playerInfo.push('C'); //[1] 
            playerInfo.push(player.invisibleTimer.toFixed(2)); //[2]
        }
        else if (player instanceof PlayerLine)
        {
            playerInfo.push('L'); //[1]
            // TODO: Ammo amount could be sent only when changed.
            playerInfo.push(player.ammo); //[2]

            playerInfo.push(player.ammoMode); //[3]
        }
        else if (player instanceof PlayerRect)
        {
            playerInfo.push('R'); //[1]
            // TODO: Adding brick mode.
        }
        // playerInfo[0]: health amount, [1]: player type code, [2][3] special info for that type.

        // Emit update info to a specific player.
        // Compress function added to reduce network transfer workload. 
        // Volatile flag to allow the lost of the data, as it will be sent again soon.
        // TODO: Reduce the data sent between server and client
        sockets[playersList.indexOf(player)].compress(true).emit(
            'gameUpdate', inScreenPlayer, inScreenNeedle, inScreenEnergy, playerInfo
        );
    });
}

// Update gameLoop repeatedly.
setInterval(gameLoop, (1000 / CONFIG.fps));
// setInterval(sendUpdate, (1 / CONFIG.fps)*1000);

// Initialize point objects with a random position.
function initGameBoard()
{
    let x, y, color, radius = CONFIG.pointRadius;
    for (let i = 0; i < CONFIG.maxPoint; i++)
    {
        color = getRandomColor();
        // Assign a random position within valid range.
        x = Math.random() * (CONFIG.canvasWidth - radius);
        y = Math.random() * (CONFIG.canvasHeight - radius);

        // Check for overlapping points. (Not really necessary)
        // if(i != 0){
        //     // Note: This does not actually prevent all overlapping, but enough.
        //     for(let j=0; j< PointArray.length; j++){
        //         if(new Vector2d(x,y).distance(new Vector2d(PointArray[j].x, PointArray[j].y)) < radius * 2) {
        //             x = Math.random() * (CONFIG.canvasWidth - radius);
        //             y = Math.random() * (CONFIG.canvasHeight - radius);
        //             // j-- to recheck overlapping.
        //             j--;
        //         }
        //     }
        // }

        pointsArray.push(new GamePoint(x, y, color, radius));
        // PointArray.push(new gamePoint(100, 100, color, radius)); // Debugging
    }
}

// Random colour generator.
function getRandomColor()
{
    // Possible hax value.
    let letters = '0123456789ABCDEF',
        color = '#';

    // Generate a random hex color code.
    for (let i = 0; i < 6; i++)
    {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// Function to get all indexes of elements holding a certain value in the array.
function getAllIndexes(arr, val)
{
    let index = [],
        i = arr.indexOf(val); // first instance that has the value of val.
    while (i != -1)
    {
        index.push(i);
        // Search for the next index with the value==val
        // Second argument stated which index to start.
        i = arr.indexOf(val, i + 1);
    }
    return index;
}

// Check if a player assigned to a team will break the balance in player number across each team.
//  restrict the difference in player within 3 for each team. 
function balancePlayer(desireTeam, playerEachTeam)
{
    let min = Math.min.apply(Math, playerEachTeam),
        max = Math.max.apply(Math, playerEachTeam),
        index = [];

    // Assign player to the team with minimum players regardless the player desired team.
    if (max - min >= 3 || min == 0)
    {
        // Get all the team indexes with minimum number of players.
        //(Need this to check if there are more than one team with minimum)
        index = getAllIndexes(playerEachTeam, min);
        // Return the desired team if the it is one of the fewest-player teams.
        if (index.indexOf(desireTeam) != -1)
        {
            return desireTeam;
        }
        else
        {
            // If desired team not having minimum player, randomly assign to a team with fewest players.
            return index[Math.floor(Math.random() * index.length)];
        }
    }
    else
    {
        // Still balanced.
        return desireTeam;
    }
}

// Shrink player depends on player type.
function shrinkPlayer(playerType, player, amount)
{
    // If player cannot be shrunk, need to reduce the health amount.
    if (player.shrink(amount))
    {
        return;
    }

    // Reducing health amount.
    if (player.bleeding())
    {
        sockets[playersList.indexOf(player)].emit('healthUpdate', player.lifeBar.life);
    }
    // Player is dead. 
    else
    {
        let index = playersList.indexOf(player);
        if (playerType == 'C') player.radius = 0;
        else if (playerType == 'L') player.length = 0;
        else if (playerType == 'R') player.width = 0;
        sockets[index].emit('dead', playerLifeCounters[index]);
    }
}


// Initial a new random position depends on the team.
function initPosition(teamNum)
{
    var x, y, boundDist = 500, range = 3000, xRange, yRange;
    // BoundDist defines the minimum distance from a player to the canvas boundary.
    // Range defines the width of a rectangular area a player can be assigned to.

    // We assign a new player to a rectangular area in a corner depends on the team num.
    // First argument of xRange/yRange is the minimum possible position and second is the maximum.

    // Team 0: random position in top left corner.
    if (teamNum == 0)
    {
        xRange = new Vector2d(boundDist, boundDist + range);
        yRange = new Vector2d(boundDist, boundDist + range);
    }
    // Team 1: random position in top right corner.
    else if (teamNum == 1)
    {
        xRange = new Vector2d(CONFIG.canvasWidth - (boundDist + range), CONFIG.canvasWidth - boundDist);
        yRange = new Vector2d(boundDist, boundDist + range);
    }
    // Team 3: random position in bottom left corner.
    else if (teamNum == 2)
    {
        xRange = new Vector2d(boundDist, boundDist + range);
        yRange = new Vector2d(CONFIG.canvasHeight - (boundDist + range), CONFIG.canvasHeight - boundDist);
    }
    // Team 4: random position in bottom right corner.
    else if (teamNum == 3)
    {
        xRange = new Vector2d(CONFIG.canvasWidth - (boundDist + range), CONFIG.canvasWidth - boundDist);
        yRange = new Vector2d(CONFIG.canvasHeight - (boundDist + range), CONFIG.canvasHeight - boundDist);
    }

    // Assign random x and y values within a rectangular area on the canvas.
    x = Math.floor(Math.random() * (xRange.y - xRange.x)) + xRange.x;
    y = Math.floor(Math.random() * (yRange.y - yRange.x)) + yRange.x;
    return new Vector2d(x, y);
}

// Return team colour.
function getTeamColor(teamNum)
{
    if (teamNum == 0)
    {
        return "red";
    }
    // Team 1: random position in top right corner.
    else if (teamNum == 1)
    {
        return "yellow";
    }
    // Team 3: random position in bottom left corner.
    else if (teamNum == 2)
    {
        return "lime";

    }
    // Team 4: random position in bottom right corner.
    else if (teamNum == 3)
    {
        return "cyan";
    }
}
