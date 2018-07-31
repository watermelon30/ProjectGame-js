
var player1;

function startGame(){
    player1 = new player(200,25,"red", 500,500);
    gameArea.start();
}

var gameArea = {
    Canvas : document.getElementById('canvas'),
    Bounds : document.getElementById('canvas').getBoundingClientRect(),
    targetX : screen.width/2,
    targetY : screen.height/2,
    lMousePress : 0, //1 when left mouse key pressed
    rMousePress : 0, //1 when right mouse key pressed
    mouseMove : 0, //1 for left rotate, 2 for right rotate, 0 for no rotate.
    start: function() {

        //setCanvasSize(this.bounds);
        document.getElementById('canvas').setAttribute('width', this.Bounds.width);
        document.getElementById('canvas').setAttribute('height', this.Bounds.height);
        this.ctx = this.Canvas.getContext("2d");
        this.interval = setInterval(updateGameArea, 15);
        canvas.addEventListener('mousemove', function(e) {
            var bounds = document.getElementById('canvas').getBoundingClientRect();
            gameArea.targetX = e.clientX - bounds.x;
            gameArea.targetY = e.clientY - bounds.y;
        });
        canvas.addEventListener('mousedown', function(e){
            //e.button =  0 when left click, 2 when right click.
            if(e.button == 0){
                gameArea.lMousePress = 1;
                gameArea.mouseMove  = 1;
            }
            else if(e.button == 2){
                gameArea.rMousePress = 1;
                gameArea.mouseMove = 2;
            }
        });
        canvas.addEventListener('mouseup', function(e){
            console.log(e.button);
            if(e.button == 0) gameArea.lMousePress = 0;
            else if(e.button == 2) gameArea.rMousePress = 0;
            
            if(!gameArea.lMousePress && !gameArea.rMousePress) {
                gameArea.mouseMove = 0;
            }
        });

    },
    clear: function(){
        this.ctx.clearRect(0,0, canvas.width , canvas.height);
    }
};

function player(width, height, color, x, y, type){ 
    this.type = type;
    this.width = width;
    this.height = height;
    this.color = color;
    this.x = x;
    this.y = y;
    this.angle = 0;
    this.moveAngle = 0;
    this.force = 5;
    this.update = function(){
        var ctx = gameArea.ctx;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.fillStyle = this.color;
        ctx.fillRect(this.width / -2, this.height / -2, this.width, this.height);
        ctx.restore();
    };
    this.newPos = function(){
        this.angle += this.moveAngle * Math.PI / 180;
        var position = velocity(this.x, this.y, gameArea.targetX, gameArea.targetY, this.force);
        this.x = this.x + position.velX;
        this.y = this.y + position.velY;    
    };
}

function velocity(x, y, targetX, targetY, force)
{
    var dx = targetX - x,
        dy = targetY - y,
        dist = Math.sqrt(dx*dx+dy*dy),
        force = 5;
    if(dist < 3){
        force = 0;
    }
    var velX = (dx/dist)*force;
    var velY = (dy/dist)*force;
    return {velX: velX, velY: velY};  
}

function updateGameArea(){
    gameArea.clear();
    //Left click
    if(gameArea.mouseMove == 1) player1.moveAngle = 2;
    //Right click
    else if(gameArea.mouseMove == 2) player1.moveAngle = -2;

    else player1.moveAngle = 0;
    player1.newPos();
    player1.update();
}
/*
function setCanvasSize(bounds){
    document.getElementById('canvas').setAttribute('width', bounds.width);
    document.getElementById('canvas').setAttribute('height', bounds.height);
}
*/

startGame();
