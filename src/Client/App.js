var menu = document.getElementById('gameMenu');
var canvas  = document.getElementById('canvas');
var ctx = canvas.getContext("2d");

//Connects to socket.io in server.
var socket = io();


var PointArray = [];
var lifeCounter = 0;

var mouseClick = 0, //1 for left mouse key event, 2 for right mouse key event.
    lMousePress = 0, //1 when left mouse key being pressed.
    rMousePress = 0; //1 when right mouse key being pressed. 

var PlayersInScreen = [],
    PointsInScreen  = [],
    NeedlesInScreen = [],
    EnergyInScreen = [],
    Health = 0,
    Grid = 0,
    Ammo = 0, //Only used for line type.
    PlayerInfo = [];
    
window.requestAnimationFrame = window.requestAnimationFrame
    || window.mozRequestAnimationFrame
    || window.webkitRequestAnimationFrame
    || window.msRequestAnimationFrame
    || function(f){return setTimeout(f, 10)} // simulate calling code 60


 
window.onload = loadPage();

function loadPage(){
    menu.style.display = 'block';
    canvas.style.display = 'none';
    var startBtn = document.getElementById('start');
    if(lifeCounter != 0){
        let message = "You survived " + lifeCounter + " seconds in the last game. That's impressive!"
        document.getElementById("lifespan").innerHTML = message;
    } else{
        document.getElementById("lifespan").innerHTML = "";
    }
    lifeCounter = 0;
    startBtn.onclick = function(){
        let type = "",
            teamNum = -1;
        if(document.getElementById('rectangle').checked) type = document.getElementById('rectangle').value;
        else if(document.getElementById('circle').checked) type = document.getElementById('circle').value;
        else if(document.getElementById('line').checked) type = document.getElementById('line').value;
        else type = randomType();
        
        if(document.getElementById('zero').checked) teamNum = 0;
        else if(document.getElementById('one').checked) teamNum = 1;
        else if(document.getElementById('two').checked) teamNum = 2;
        else if(document.getElementById('three').checked) teamNum = 3;
        else teamNum = -1; //Will be assigned by server if not chose.

        ctx.canvas.width  = window.innerWidth;
        ctx.canvas.height = window.innerHeight;
        socket.emit('checkTeam', teamNum);
        startGame(type, teamNum);
    }

}



function startGame(type, teamNum){
    menu.style.display = 'none';
    canvas.style.display = 'block';

    socket.on('reassignTeam', function(desiredT, actualT){
        //TODO: display change team message.
        console.log("Change team...", desiredT, "to ", actualT);
    });
    
    //Tell server to add new player.
    socket.emit('newPlayer', type, window.innerWidth, window.innerHeight, Date.now());
    socket.emit('lifeCounter', Date.now());



    canvas.addEventListener('mousemove', function(e) {
        socket.emit('mouseMove', e.clientX, e.clientY);
    });
    
    canvas.addEventListener('mousedown', function(e) {
        if(e.button == 0){
            lMousePress = 1;
            mouseClick  = 1;
        }
        else if(e.button == 2){
            rMousePress = 1;
            mouseClick  = 2;
        }
        socket.emit('mouseClick', mouseClick);
    });

    canvas.addEventListener('keydown', function(e){
        console.log(e.keyCode);
    });

    canvas.addEventListener('mouseup', function(e){
        //Change the state of mousePress variable when mouse up.
        if(e.button == 0) lMousePress = 0;
        else if(e.button == 2) rMousePress = 0;
        
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

function checkLatency(){
    //Emit the current time every 2 seconds. After server emits this time back we subtract it by
    //the current time to get the latency.
    setInterval(function() {
        socket.emit('latency', Date.now(), function(startTime){
            var latency = Date.now() - startTime;
            console.log("Latency: " + latency);
        });
      }, 2000);
}


function drawCanvas(){
    ctx.clearRect(0,0, canvas.width , canvas.height);
    ctx.fillStyle = "black";
    ctx.fillRect(0,0, canvas.width , canvas.height);
    drawBackground(Grid);

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


//Handle socket response from server.
function socketHandle(){
    socket.on('healthUpdate', function(length){
        Health = length;
    });

    socket.on('ammoUpdate', function(ammo){
        Ammo = ammo;
    });

    socket.on('dead', function(startTime){
        lifeCounter = ((Date.now() - startTime) / 1000).toFixed(2);
        //Reconnect user and reload page.
        socket.disconnect();
        socket.connect();
        loadPage();
    });

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

function drawNeedle(needleArray){
    needleArray.forEach(needle =>{
        ctx.lineWidth=5;
        ctx.strokeStyle = "white";
        ctx.beginPath();
        ctx.moveTo(needle.x, needle.y);
        ctx.lineTo(needle.endPointX, needle.endPointY);
        ctx.stroke();
        ctx.closePath();
    })
}

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

function drawRectPlayer(player){
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    ctx.fillStyle = player.color;
    ctx.fillRect((player.width ) / -2, (player.height ) / -2, player.width , player.height);
    ctx.restore();
}

function drawLinePlayer(player){
    ctx.lineWidth=5;
    ctx.strokeStyle = player.color;
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(player.endPointX, player.endPointY);
    ctx.stroke();
    ctx.closePath();
}

function drawCirclePlayer(player){
    ctx.beginPath();
    // ctx.globalAlpha=0.6;
    ctx.globalAlpha = player.alpha;
    ctx.fillStyle = player.color;
    //Draw the circle bigger than its radius to make more realistic collision.
    ctx.arc(player.x, player.y, player.radius, 0, 2*Math.PI, false);
    ctx.fill();
    ctx.closePath();
    ctx.globalAlpha = 1;
}

function drawBackground(grid){
    //grid[0] is grid_gap, grid[1] is first vertical line to draw, grid[2] is first parallel line.
    ctx.lineWidth=1;
    ctx.strokeStyle = "#00ff00";
    ctx.globalAlpha=0.5;
    ctx.beginPath();
    for(var i=grid[1] - grid[0]; i<window.innerWidth; i+=grid[0]){
        ctx.moveTo(i, 0); 
        ctx.lineTo(i, window.innerHeight);
    }
    for(var i=grid[2] - grid[0]; i<window.innerHeight; i+=grid[0]){
        ctx.moveTo(0, i);
        ctx.lineTo(window.innerWidth, i);
    }
    ctx.stroke();
    ctx.globalAlpha=1;
    ctx.closePath();
}

function displayInfo(playerInfo, healthAmount){
    ctx.font = "20px Comic Sans MS";
    ctx.fillStyle = "#00FF00";

    if(healthAmount > 0){
        ctx.fillText("Health Amount: " + playerInfo[0], window.innerWidth / 2 - 75,  window.innerHeight*0.95);
    } else {
        ctx.fillText("Dead", window.innerWidth / 2 - 75,  window.innerHeight -50);
    }

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

//When user did not specify the player type.
function randomType(){
    var random = Math.floor(Math.random() * 3) + 1;
    if(random == 1) return "Rectangle"; 
    if(random == 2) return "Line";
    return "Circle";
}