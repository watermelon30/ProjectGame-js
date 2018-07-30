var player1;
var targetX = 0;
var targetY = 0;

function startGame(){
    player1 = new player(50,50,"red", 500,500);
    gameArea.start();
}


var gameArea = {
    Canvas : document.getElementById('canvas'),
    Bounds : document.getElementById('canvas').getBoundingClientRect(),
    start: function() {
        //setCanvasSize(this.bounds);
        document.getElementById('canvas').setAttribute('width', this.Bounds.width);
        document.getElementById('canvas').setAttribute('height', this.Bounds.height);
        this.ctx = this.Canvas.getContext("2d");
        this.interval = setInterval(updateGameArea, 15);
        canvas.addEventListener('mousemove', function(e) {
            var bounds = document.getElementById('canvas').getBoundingClientRect();
            targetX = e.clientX - bounds.x;
            targetY = e.clientY - bounds.y;
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
    //this.angle = 0;
    //this.moveAngle = 0;
    //this.force = 5;
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
        var position = velocity(this.x, this.y, targetX, targetY);
        this.x = this.x + position.velX;
        this.y = this.y + position.velY;    
    };
}

function velocity(x, y, targetX, targetY)
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
    player1.moveAngle = 0;
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
