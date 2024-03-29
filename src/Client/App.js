import { PLAYERTYPE } from './../Library/Global.js';
var menu = document.getElementById('gameMenu');
var canvas = document.getElementById('canvas');
var ctx = canvas.getContext("2d");

// Connecting to the WebSocket in the server.
var socket = io.connect();

var showNotification = 0;

var aliveTimeCounter = 0; // To count the time a player is alive.

var mouseClick = 0, // Will be 1 for left mouse key event, 2 for right mouse key event.
    leftMousePress = false, // True when left mouse key is pressed.
    rightMousePress = false; // True when right mouse key is pressed. 

var playersList = [];   // Information for all player.

var inScreenPlayersList = [],
    inScreenPointsList = [],
    inScreenNeedlesList = [],
    inScreenEnergiesList = [],
    screenTLCoord = 0,
    healthPoint = 0,
    gridGap = 0,
    ammo = 0, // Only used for line character.
    playerInfo = [];

// Request animation frame from the browser.
window.requestAnimationFrame = window.requestAnimationFrame
    || window.mozRequestAnimationFrame
    || window.webkitRequestAnimationFrame
    || window.msRequestAnimationFrame
    || function (f) { return setTimeout(f, 10) }


// Load menu when the web page is first loaded. 
window.onload = loadPage();

// Loading menu page.
function loadPage()
{
    // Display the menu and hide the canvas.
    menu.style.display = 'block';
    canvas.style.display = 'none';

    var startBtn = document.getElementById('start');

    // Display lifeCounter info for the last game if a player just finished a game.
    if (aliveTimeCounter != 0)
    {
        let message = "You survived " + aliveTimeCounter + " seconds in the last game. That's impressive!"
        document.getElementById("lifespan").innerHTML = message;
    }
    else
    {
        document.getElementById("lifespan").innerHTML = "";
    }

    // Initialize life counter.
    aliveTimeCounter = 0;

    // Start button onclick event.
    startBtn.onclick = function ()
    {
        let type = "",
            teamNum = -1;

        // Getting user preferred type of player.
        if (document.getElementById('rectangle').checked) type = PLAYERTYPE.rectangle;
        else if (document.getElementById('circle').checked) type = PLAYERTYPE.circle;
        else if (document.getElementById('line').checked) type = PLAYERTYPE.line;
        else type = getRandomType(); // Getting random type if not specified.

        // Getting user preferred team.
        if (document.getElementById('zero').checked) teamNum = 0;
        else if (document.getElementById('one').checked) teamNum = 1;
        else if (document.getElementById('two').checked) teamNum = 2;
        else if (document.getElementById('three').checked) teamNum = 3;
        else teamNum = -1; // Will be assigned by server if not specified.

        ctx.canvas.width = window.innerWidth;
        ctx.canvas.height = window.innerHeight;
        // Emit event to ask for team balance checking first before starting.
        socket.emit('checkTeam', teamNum);
        startGame(type);
    }
}

// Starting the game after user presses start button.
function startGame(type)
{
    // Hide the menu and show the game canvas.
    menu.style.display = 'none';
    canvas.style.display = 'block';

    // Handle reassignTeam event from server.
    socket.on('reassignTeam', function (desiredT, actualT)
    {
        // TODO: display change team message on the canvas.
        console.log("Change team...", desiredT, "to ", actualT);
    });

    // Tell server to add new player.
    socket.emit('newPlayer', type, window.innerWidth, window.innerHeight, Date.now());

    // Sending current time for life counter to work.
    socket.emit('lifeCounter', Date.now());

    // Register mouse move event and emit mouse position to server.
    canvas.addEventListener('mousemove', function (e)
    {
        socket.emit('mouseMove', e.clientX, e.clientY);
    });

    // Register mouse click event and emit which mouse key is pressed to server.
    canvas.addEventListener('mousedown', function (e)
    {
        if (e.button == 0)
        {
            leftMousePress = true;
            mouseClick = 1;
        }
        else if (e.button == 2)
        {
            rightMousePress = true;
            mouseClick = 2;
            if (type == 'Line') showNotification = 45;
        }
        socket.emit('mouseClick', mouseClick);
    });

    // Register mouse release event and emit which mouse key is released to server.
    canvas.addEventListener('mouseup', function (e)
    {
        // Change the state of mousePress variable when mouse up.
        if (e.button == 0) leftMousePress = false;
        else if (e.button == 2) rightMousePress = false;

        // Check if there is still mouse button being pressed.
        if (leftMousePress) mouseClick = 1;
        else if (rightMousePress) mouseClick = 2;
        else mouseClick = 0;
        socket.emit('mouseClick', mouseClick);
    });

    checkLatency();
    socketHandle();
    requestAnimationFrame(drawCanvas);
}

// Function that keeps track of the latency of the current user.
function checkLatency()
{
    // Emit the first current time every 2 seconds. 
    // After server emits this time back we subtract it by the second current time to get the latency.
    setInterval(function ()
    {
        socket.emit('latency', Date.now(), function (startTime)
        {
            var latency = Date.now() - startTime;
            console.log("Latency: " + latency);
        });
    }, 2000);
}

// Function that handles the drawing for all kinds of objects/infos
function drawCanvas()
{
    // Clearing the current canvas for redraw.
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawBackground();

    // Draw visible objects.
    drawPoint(inScreenPointsList);
    drawPoint(inScreenEnergiesList);
    drawPlayer(inScreenPlayersList);
    drawNeedle(inScreenNeedlesList);
    displayInfo(playerInfo, healthPoint);

    drawNotification();

    requestAnimationFrame(drawCanvas);
}

// Handle socket responses from server.
function socketHandle()
{
    socket.on('gridGap', function (inGridGap)
    {
        gridGap = inGridGap;
        console.log(gridGap);
    });

    // Health amount update from the server
    socket.on('healthUpdate', function (length)
    {
        healthPoint = length;
    });

    // Ammo amount update for Line player object from the server.
    // Not used at the moment.
    socket.on('ammoUpdate', function (inAmmo)
    {
        ammo = inAmmo;
    });

    // Server indicates that player has died.
    // Reconnect the user and reload the page.
    socket.on('dead', function (startTime)
    {
        aliveTimeCounter = ((Date.now() - startTime) / 1000).toFixed(2);
        // Reconnect user and reload page.
        socket.disconnect();
        socket.connect();
        loadPage();
    });

    // Update sent from server to show the new game state.
    socket.on('gameUpdate', function (playersInScreen, needlesInScreen, energyInScreen, inPlayerInfo)
    {
        //console.log("New update!");
        inScreenPlayersList = playersInScreen;
        inScreenNeedlesList = needlesInScreen;
        inScreenEnergiesList = energyInScreen;
        playerInfo = inPlayerInfo;
    });

    // Update for point objects
    socket.on('pointsUpdate', function (pointsInScreen)
    {
        inScreenPointsList = pointsInScreen;
    });

    // Update for the coordinate of the user's top left screen in server view 
    // (Used to calculate relative coordinate for other objects and grid bg).
    socket.on('screenTL', function (screenCoor)
    {
        screenTLCoord = screenCoor;
    });


    //Getting all the player data for rendering.
    socket.on('playersList', function (PlayersList)
    {
        playersList = PlayersList;
        console.log(Object.keys(playersList));
    });
}

/**
 * Function that draws each element of the array of point objects.
 * @param pointArray: Array that contains all the visible public point objects. 
 */
function drawPoint(pointArray)
{
    pointArray.forEach(point =>
    {
        ctx.beginPath();
        ctx.fillStyle = point.color;
        //Subtract screen top left to get coordinate in screen perspective.
        ctx.arc(point.x - screenTLCoord.x, point.y - screenTLCoord.y, point.radius, 0, 2 * Math.PI, false);
        ctx.fill();
        ctx.closePath();
    });
}

/**
 * Function that draws each element of the array of needle objects.
 * @param needleArray: Array that contains all the visible needle objects. 
 */
function drawNeedle(needleArray)
{
    needleArray.forEach(needle =>
    {
        ctx.lineWidth = 5;
        ctx.strokeStyle = "white";
        ctx.beginPath();
        //Draw a line from the head to the tail to represent a needle.
        ctx.moveTo(needle.x - screenTLCoord.x, needle.y - screenTLCoord.y);
        ctx.lineTo(needle.endPointX - screenTLCoord.x, needle.endPointY - screenTLCoord.y);
        ctx.stroke();
        ctx.closePath();
    });
}

/**
 * Function that draws each element of the array of players objects.
 * @param playerArray: Array that contains all the visible player objects. 
 */
function drawPlayer(playerArray)
{
    playerArray.forEach(player =>
    {
        if (player.type == PLAYERTYPE.circle)
        {
            drawCirclePlayer(player);
        }
        else if (player.type == PLAYERTYPE.rectangle)
        {
            drawRectPlayer(player);
        }
        else if (player.type == PLAYERTYPE.line)
        {
            drawLinePlayer(player);
        }
    });
}


/**
 * Function that draws a rectangle player.
 * @param player: A rectangle player object to be drawn on screen.
 */
function drawRectPlayer(player)
{
    ctx.save();
    //Translate to the centre of rect, rotate with player current angle, draw the rect, and restore.
    ctx.translate(player.x - screenTLCoord.x, player.y - screenTLCoord.y);
    ctx.rotate(player.angle);
    ctx.fillStyle = player.color;
    //Draw the rectangle bigger to make a more realistic collision.
    ctx.fillRect((player.width) / -2, (player.height) / -2, player.width, player.height);
    ctx.restore();
}

/**
 * Function that draws a line player.
 * @param player: A line player object to be drawn on screen.
 */
function drawLinePlayer(player)
{
    ctx.lineWidth = 5;
    ctx.strokeStyle = player.color;
    ctx.beginPath();
    // Draw from head to tail.
    ctx.moveTo(player.x - screenTLCoord.x, player.y - screenTLCoord.y);
    ctx.lineTo(player.endPointX - screenTLCoord.x, player.endPointY - screenTLCoord.y);
    ctx.stroke();
    ctx.closePath();
}


/**
 * Function that draws a circle player.
 * @param player: A circle player object to be drawn on screen.
 */
function drawCirclePlayer(player)
{
    ctx.beginPath();
    ctx.globalAlpha = player.alpha; // To check if player is in invisible.
    ctx.fillStyle = player.color;

    // Draw the circle bigger than its radius to make more realistic collision.
    ctx.arc(player.x - screenTLCoord.x, player.y - screenTLCoord.y, player.radius + 5, 0, 2 * Math.PI, false);

    ctx.fill();
    ctx.closePath();
    ctx.globalAlpha = 1;
}

/**
 * Function that draws the background grid.
 * @param grid: An array that contains the information for the grid. 
 * grid[0] is the grid gap, grid[1] is first vertical line to be drawn, grid[2] is first parallel line.
 */
function drawBackground()
{
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#00ff00"; // Green line
    ctx.globalAlpha = 0.5;
    ctx.beginPath();


    var firstX = gridGap - screenTLCoord.x % gridGap,
        firstY = gridGap - screenTLCoord.y % gridGap;

    // Drawing vertical lines.
    for (var i = firstX - gridGap; i < window.innerWidth; i += gridGap)
    {
        ctx.moveTo(i, 0);
        ctx.lineTo(i, window.innerHeight);
    }

    // Drawing parallel lines.
    for (var i = firstY - gridGap; i < window.innerHeight; i += gridGap)
    {
        ctx.moveTo(0, i);
        ctx.lineTo(window.innerWidth, i);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.closePath();
}

function drawNotification()
{
    if (showNotification > 10)
    {
        ctx.lineWidth = 5;
        ctx.strokeStyle = "yellow";
        ctx.beginPath();
        ctx.arc(window.innerWidth * 0.1, window.innerHeight * 0.95, showNotification, 0, 2 * Math.PI, false);
        ctx.stroke();
        ctx.closePath();
        showNotification--;

    }
}

/**
 * Function that draws the player info at the bottom of the screen.
 * @param inPlayerInfo: Array that contains player information.
 * @param inHealthAmount: Contains the health amount of a player.
 */
function displayInfo(inPlayerInfo, inHealthAmount)
{
    ctx.font = "20px Comic Sans MS";
    ctx.fillStyle = "#00FF00";

    if (inHealthAmount > 0)
    {
        ctx.fillText("Health Amount: " + inPlayerInfo[0], window.innerWidth / 2 - 75, window.innerHeight * 0.95);
    }
    else
    {
        ctx.fillText("Dead", window.innerWidth / 2 - 75, window.innerHeight - 50);
    }

    // Draw info for a particular type of player.
    if (inPlayerInfo[1] == 'C')
    {
        ctx.fillText("Invisible  Mode: " + inPlayerInfo[2], window.innerWidth * 0.8, window.innerHeight * 0.95);
    }
    else if (inPlayerInfo[1] == 'L')
    {
        ctx.fillText("Ammo: " + inPlayerInfo[2], window.innerWidth * 0.8, window.innerHeight * 0.95);
        if (inPlayerInfo[3])
        {
            ctx.fillText("Ammo Mode ", window.innerWidth * 0.1, window.innerHeight * 0.95);
        }
        else
        {
            ctx.fillText("Health Mode ", window.innerWidth * 0.1, window.innerHeight * 0.95);
        }
    }
    else if (inPlayerInfo[1] == 'R')
    {
        ctx.fillText("Brick: Haven't done", window.innerWidth * 0.1, window.innerHeight * 0.95);
    }
}

//Assign a type randomly for user.
function getRandomType()
{
    var random = Math.floor(Math.random() * 3) + 1;
    if (random == 1) return PLAYERTYPE.rectangle;
    if (random == 2) return PLAYERTYPE.line;
    return PLAYERTYPE.circle;
}