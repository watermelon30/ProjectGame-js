var menu = document.getElementById('gameMenu');
var canvas  = document.getElementById('canvas');
var ctx = canvas.getContext("2d");


var socket = io();
var PointArray = [];


var mouseClick = 0, //1 for left mouse key event, 2 for right mouse key event.
    lMousePress = 0, //1 when left mouse key being pressed.
    rMousePress = 0; //1 when right mouse key being pressed.

var PlayersInScreen = [],
    PointsInScreen  = [],
    NeedlesInScreen = [],
    Grid = 0,
    PlayerInfo = [];
    
window.requestAnimationFrame = window.requestAnimationFrame
    || window.mozRequestAnimationFrame
    || window.webkitRequestAnimationFrame
    || window.msRequestAnimationFrame
    || function(f){return setTimeout(f, 10)} // simulate calling code 60


 
window.onload = function(){
    canvas.style.display = 'none';
    var startBtn = document.getElementById('start');
    startBtn.onclick = function(){
        let type = "";
        if(document.getElementById('rectangle').checked){
            type = document.getElementById('rectangle').value;
        } else if(document.getElementById('circle').checked){
            type = document.getElementById('circle').value;
        } else if(document.getElementById('line').checked){
            type = document.getElementById('line').value;
        } else{
            type = randomType();
        }
        ctx.canvas.width  = window.innerWidth;
        ctx.canvas.height = window.innerHeight;
        startGame(type);
    }
}

function startGame(type){
    menu.style.display = 'none';
    canvas.style.display = 'block';
    
    //Tell server to add new player.
    socket.emit('newPlayer', type, window.innerWidth, window.innerHeight);

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
    socketHandle();
    requestAnimationFrame(drawCanvas);

}


function drawCanvas(){
    ctx.clearRect(0,0, canvas.width , canvas.height);
    ctx.fillStyle = "black";
    ctx.fillRect(0,0, canvas.width , canvas.height);
    drawBackground(Grid);

    if(PointsInScreen.length > 0){
        drawPoint(PointsInScreen);
    }
    if(PlayersInScreen.length > 0){
        drawPlayer(PlayersInScreen);
    }
    if(NeedlesInScreen.length > 0){
        drawNeedle(NeedlesInScreen);
    }
    displayInfo(PlayerInfo,  window.innerWidth, window.innerHeight);

    requestAnimationFrame(drawCanvas);
}


//Handle socket response from server.
function socketHandle(){
    socket.on('gameUpdate', function(playersInScreen, pointsInScreen, needlesInScreen, playerInfo, grid){
        //console.log("New update!");
        PlayersInScreen = playersInScreen;
        PointsInScreen = pointsInScreen;
        NeedlesInScreen = needlesInScreen;
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
        ctx.lineTo(needle.x - needle.endPointX, needle.y - needle.endPointY);
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
    ctx.lineTo(player.x - player.endPointX, player.y - player.endPointY);
    ctx.stroke();
    ctx.closePath();
}

function drawCirclePlayer(player){
    ctx.beginPath();
    // ctx.globalAlpha=0.6;
    ctx.globalAlpha = player.alpha;
    ctx.fillStyle = player.color;
    //Draw the circle bigger than its radius to make more realistic collision.
    ctx.arc(player.x, player.y, player.radius+5, 0, 2*Math.PI, false);
    ctx.fill();
    ctx.closePath();
    ctx.globalAlpha = 1;
}

function drawBackground(grid){
    //In grid param, grid[0] is grid_gap, grid[1] is first vertical line to draw, grid[2] is first parallel line.
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

function displayInfo(playerInfo,  screenBRx, screenBRy){
    ctx.font = "20px Comic Sans MS";
    ctx.fillStyle = "#00FF00";
    ctx.fillText("Invisible  Mode: " + playerInfo[0] ,screenBRx * 0.8, screenBRy * 0.92);
}

function randomType(){
    var random = Math.floor(Math.random() * 3) + 1;
    if(random == 1) return "Rectangle"; 
    else if(random == 2) return "Line";
    else return "Circle";
}