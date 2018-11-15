var menu = document.getElementById('gameMenu');
var canvas  = document.getElementById('canvas');
var ctx = canvas.getContext("2d");

//Connecting to the WebSocket in the server.
var socket = io.connect();


var LifeCounter = 0; //To count the time a player is alive.

var mouseClick = 0, //will be 1 for left mouse key event, 2 for right mouse key event.
    lMousePress = false, //true when left mouse key is pressed.
    rMousePress = false; //true when right mouse key is pressed. 

var PlayersInScreen = [],
    PointsInScreen  = [],
    NeedlesInScreen = [],
    EnergyInScreen = [],
    Health = 0,
    Grid = 0,
    Ammo = 0, //Only used for line character.
    PlayerInfo = [];

//Request animation frame from the browser.
window.requestAnimationFrame = window.requestAnimationFrame
    || window.mozRequestAnimationFrame
    || window.webkitRequestAnimationFrame
    || window.msRequestAnimationFrame
    || function(f){return setTimeout(f, 10)}


//Load menu when the web page is first loaded. 
window.onload = loadPage();

//Loading menu page.
function loadPage(){
    //Display the menu and hide the canvas
    menu.style.display = 'block';
    canvas.style.display = 'none';

    var startBtn = document.getElementById('start');

    //Display lifeCounter info for the last game if a player just finished a game.
    if(LifeCounter != 0){
        let message = "You survived " + LifeCounter + " seconds in the last game. That's impressive!"
        document.getElementById("lifespan").innerHTML = message;
    } else{
        document.getElementById("lifespan").innerHTML = "";
    }

    //Initialize life counter.
    LifeCounter = 0;

    //Start button onclick event.
    startBtn.onclick = function(){
        let type = "",
            teamNum = -1;

        //Getting user preferred type of player.
        if(document.getElementById('rectangle').checked) type = document.getElementById('rectangle').value;
        else if(document.getElementById('circle').checked) type = document.getElementById('circle').value;
        else if(document.getElementById('line').checked) type = document.getElementById('line').value;
        else type = randomType();//Getting random type if not specified.
        

        //Getting user preferred team.
        if(document.getElementById('zero').checked) teamNum = 0;
        else if(document.getElementById('one').checked) teamNum = 1;
        else if(document.getElementById('two').checked) teamNum = 2;
        else if(document.getElementById('three').checked) teamNum = 3;
        else teamNum = -1; //Will be assigned by server if not specified.

        ctx.canvas.width  = window.innerWidth;
        ctx.canvas.height = window.innerHeight;
        //Emit event to ask for team balance checking first before starting.
        socket.emit('checkTeam', teamNum);
        startGame(type);
    }

}

//Starting the game after user presses start button.
function startGame(type){
    //Hide the menu and show the game canvas.
    menu.style.display = 'none';
    canvas.style.display = 'block';

    //Handle reassignTeam event from server.
    socket.on('reassignTeam', function(desiredT, actualT){
        //TODO: display change team message on the canvas.
        console.log("Change team...", desiredT, "to ", actualT);
    });
    
    //Tell server to add new player.
    socket.emit('newPlayer', type, window.innerWidth, window.innerHeight, Date.now());

    //Sending current time for life counter to work.
    socket.emit('lifeCounter', Date.now());


    //Register mouse move event and emit mouse position to server.
    canvas.addEventListener('mousemove', function(e) {
        socket.emit('mouseMove', e.clientX, e.clientY);
    });
    
    //Register mouse click event and emit which mouse key is pressed to server.
    canvas.addEventListener('mousedown', function(e) {
        if(e.button == 0){
            lMousePress = true;
            mouseClick  = 1;
        }
        else if(e.button == 2){
            rMousePress = true;
            mouseClick  = 2;
        }
        socket.emit('mouseClick', mouseClick);
    });

    //Register mouse release event and emit which mouse key is released to server.
    canvas.addEventListener('mouseup', function(e){
        //Change the state of mousePress variable when mouse up.
        if(e.button == 0) lMousePress = false;
        else if(e.button == 2) rMousePress = false;
        
        //Check if there is still mouse button being pressed.
        if(lMousePress) mouseClick = 1;
        else if(rMousePress) mouseClick = 2;
        else mouseClick = 0;
        socket.emit('mouseClick', mouseClick);
    });

    checkLatency();
    socketHandle();
    requestAnimationFrame(drawCanvas);
}


//Function that keeps track of the latency of the current user.
function checkLatency(){
    //Emit the first current time every 2 seconds. 
    //After server emits this time back we subtract it by the second current time to get the latency.
    setInterval(function() {
        socket.emit('latency', Date.now(), function(startTime){
            var latency = Date.now() - startTime;
            console.log("Latency: " + latency);
        });
      }, 2000);
}

//Function that handles the drawing for all kinds of objects/infos
function drawCanvas(){
    //Clearing the current canvas for redraw.
    ctx.clearRect(0,0, canvas.width , canvas.height);
    ctx.fillStyle = "black";
    ctx.fillRect(0,0, canvas.width , canvas.height);

    drawBackground(Grid);

    // Draw visible objects.
    if(PointsInScreen.length > 0){
        drawPoint(PointsInScreen);
    }
    if(EnergyInScreen.length > 0){
        drawPoint(EnergyInScreen);
    }
    if(PlayersInScreen.length > 0){
        drawPlayer(PlayersInScreen);
    }
    if(NeedlesInScreen.length > 0){
        drawNeedle(NeedlesInScreen);
    }
    displayInfo(PlayerInfo, Health);
    requestAnimationFrame(drawCanvas);
}


//Handle socket responses from server.
function socketHandle(){
    //Health amount update from the server
    socket.on('healthUpdate', function(length){
        Health = length;
    });

    //Ammo amount update for Line player object from the server.
    //Not used at the moment.
    socket.on('ammoUpdate', function(ammo){
        Ammo = ammo;
    });

    //Server indicates that player has died.
    //Reconnect the user and reload the page.
    socket.on('dead', function(startTime){
        LifeCounter = ((Date.now() - startTime) / 1000).toFixed(2);
        //Reconnect user and reload page.
        socket.disconnect();
        socket.connect();
        loadPage();
    });

    //Update sent from server to show the new game state.
    socket.on('gameUpdate', function(playersInScreen, pointsInScreen, needlesInScreen, energyInScreen, playerInfo, grid){
        //console.log("New update!");
        PlayersInScreen = playersInScreen;
        PointsInScreen = pointsInScreen;
        NeedlesInScreen = needlesInScreen;
        EnergyInScreen = energyInScreen;
        PlayerInfo = playerInfo;
        Grid = grid;
    });
}

/**
 * Function that draws each element of the array of point objects.
 * @param pointArray: Array that contains all the visible public point objects. 
 */
function drawPoint(pointArray){
    pointArray.forEach(point =>{
        ctx.beginPath();
        ctx.fillStyle = point.color;
        //Subtract screen top left to get coordinate in screen perspective.
        ctx.arc(point.x, point.y, point.radius, 0, 2*Math.PI, false);
        ctx.fill();
        ctx.closePath();
    });
}

/**
 * Function that draws each element of the array of needle objects.
 * @param needleArray: Array that contains all the visible needle objects. 
 */
function drawNeedle(needleArray){
    needleArray.forEach(needle =>{
        ctx.lineWidth=5;
        ctx.strokeStyle = "white";
        ctx.beginPath();
        //Draw a line from the head to the tail to represent a needle.
        ctx.moveTo(needle.x, needle.y);
        ctx.lineTo(needle.endPointX, needle.endPointY);
        ctx.stroke();
        ctx.closePath();
    })
}

/**
 * Function that draws each element of the array of players objects.
 * @param playerArray: Array that contains all the visible player objects. 
 */
function drawPlayer(playerArray){
    playerArray.forEach(player => {
        if(player.type == "Circle"){
            drawCirclePlayer(player);
        } else if(player.type == "Rectangle"){
            drawRectPlayer(player);
        } else if(player.type == "Line"){
            drawLinePlayer(player);
        }
    });
}


/**
 * Function that draws a rectangle player.
 * @param player: A rectangle player object to be drawn on screen.
 */
function drawRectPlayer(player){
    ctx.save();
    //Translate to the centre of rect, rotate with player current angle, draw the rect, and restore.
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    ctx.fillStyle = player.color;
    //Draw the rectangle bigger to make a more realistic collision.
    ctx.fillRect((player.width ) / -2, (player.height ) / -2, player.width, player.height);
    ctx.restore();
}

/**
 * Function that draws a line player.
 * @param player: A line player object to be drawn on screen.
 */
function drawLinePlayer(player){
    ctx.lineWidth=5;
    ctx.strokeStyle = player.color;
    ctx.beginPath();
    //Draw from head to tail.
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(player.endPointX, player.endPointY);
    ctx.stroke();
    ctx.closePath();
}


/**
 * Function that draws a circle player.
 * @param player: A circle player object to be drawn on screen.
 */
function drawCirclePlayer(player){
    ctx.beginPath();
    ctx.globalAlpha = player.alpha; //To check if player is in invisible.
    ctx.fillStyle = player.color;

    //Draw the circle bigger than its radius to make more realistic collision.
    ctx.arc(player.x, player.y, player.radius + 5, 0, 2*Math.PI, false);

    ctx.fill();
    ctx.closePath();
    ctx.globalAlpha = 1;
}

/**
 * Function that draws the background grid.
 * @param grid: An array that contains the information for the grid. 
 * grid[0] is the grid gap, grid[1] is first vertical line to be drawn, grid[2] is first parallel line.
 */
function drawBackground(grid){
    ctx.lineWidth=1;
    ctx.strokeStyle = "#00ff00";    //Green line
    ctx.globalAlpha=0.5;
    ctx.beginPath();

    //Drawing vertical lines.
    for(var i=grid[1] - grid[0]; i<window.innerWidth; i+=grid[0]){
        ctx.moveTo(i, 0); 
        ctx.lineTo(i, window.innerHeight);
    }

    //Drawing parallel lines.
    for(var i=grid[2] - grid[0]; i<window.innerHeight; i+=grid[0]){
        ctx.moveTo(0, i);
        ctx.lineTo(window.innerWidth, i);
    }
    ctx.stroke();
    ctx.globalAlpha=1;
    ctx.closePath();
}

//Function that draws the player info at the bottom of the screen.
function displayInfo(playerInfo, healthAmount){
    ctx.font = "20px Comic Sans MS";
    ctx.fillStyle = "#00FF00";

    if(healthAmount > 0){
        ctx.fillText("Health Amount: " + playerInfo[0], window.innerWidth / 2 - 75,  window.innerHeight*0.95);
    } else {
        ctx.fillText("Dead", window.innerWidth / 2 - 75,  window.innerHeight -50);
    }

    //Draw info for a particular type of player.
    if(playerInfo[1] == 'C'){
        ctx.fillText("Invisible  Mode: " + playerInfo[2] ,window.innerWidth * 0.8, window.innerHeight * 0.95);
    } else if(playerInfo[1] == 'L'){
        ctx.fillText("Ammo: " + playerInfo[2], window.innerWidth * 0.8, window.innerHeight * 0.95);
        if(playerInfo[3]){
            ctx.fillText("Ammo Mode ",window.innerWidth * 0.1, window.innerHeight * 0.95);
        } else {
            ctx.fillText("Health Mode ",window.innerWidth * 0.1, window.innerHeight * 0.95);
        }
    } else if(playerInfo[1] == 'R'){
        ctx.fillText("Brick: Haven't done", window.innerWidth * 0.1, window.innerHeight * 0.95);
    }

}

//Assign a random type for user.
function randomType(){
    var random = Math.floor(Math.random() * 3) + 1;
    if(random == 1) return "Rectangle"; 
    if(random == 2) return "Line";
    return "Circle";
}