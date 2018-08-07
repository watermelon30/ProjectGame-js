var player1;
var pointArray = [];

var gameArea = {
    Canvas : document.getElementById('canvas'),
    Bounds : document.getElementById('canvas').getBoundingClientRect(),
    targetX : innerWidth/2,
    targetY : innerHeight/2,
    lMousePress : 0, //1 when left mouse key pressed
    rMousePress : 0, //1 when right mouse key pressed
    mouseClick : 0, //1 for left rotate, 2 for right rotate, 0 for no rotate.
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
                gameArea.mouseClick  = 1;
            }
            else if(e.button == 2){
                gameArea.rMousePress = 1;
                gameArea.mouseClick = 2;
            }
        });
        canvas.addEventListener('mouseup', function(e){
            //Change the state of mousePress variable when mouse up.
            if(e.button == 0) gameArea.lMousePress = 0;
            else if(e.button == 2) gameArea.rMousePress = 0;
            
            //Check if there is still mosue button being pressed.
            if(gameArea.lMousePress) gameArea.mouseClick = 1;
            else if(gameArea.rMousePress) gameArea.mouseClick = 2;
            else gameArea.mouseClick = 0;
        });

    },
    clear: function(){
        this.ctx.clearRect(0,0, canvas.width , canvas.height);
    }
};

function init(){
    //player1 = new playerRect(200,50,"red", 500,500);
    player1 = new playerCir(50,"red", 500,500);
        
    var x, y, radius = 10, color;
    for(let i=0; i< 100; i++){
        color = randomColor();
        x = Math.random() * innerWidth,
        y = Math.random() * innerHeight;
        if(i != 0){
            //Check for overlapping points
            for(let j=0; j< pointArray.length; j++){
                if(distance(x,y, pointArray[j].x, pointArray[j].y) < radius * 2) {
                    x = Math.random() * innerWidth;
                    y = Math.random() * innerHeight;
                    //j-- to recheck overlapping.
                    j--;
                }
            }
        }
        pointArray.push(new gameCircle(radius, color, x, y));
    }
}

function startGame(){
    init();
    gameArea.start();
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

function gameObject(x, y, color){
    this.color = color;
    this.x = x;
    this.y = y;
}

function gameCircle(radius, color, x, y){
    gameObject.call(this, x, y, color);
    this.radius = radius;
    this.tempColor = this.color;
    this.update = function(){
        var ctx = gameArea.ctx;
        ctx.beginPath();
        if(rect_Cir_collision(player1, this)){this.color = "black";}
        else if(circle_Collision(player1, this)){this.color = "black";}
        else {this.color = this.tempColor;}
        
        ctx.fillStyle = this.color;
        ctx.arc(this.x, this.y, this.radius, 0, 2*Math.PI, false);
        ctx.fill();
        ctx.closePath();
    }
//TODO: Calculate the force from collision with player and apply friction to make it stop.
    this.newPos = function(){ }
}

function playerRect(width, height, color, x, y){ 
    gameObject.call(this, x, y, color);
    this.width = width;
    this.height = height;
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

function playerCir(radius, color, x, y){ 
    gameObject.call(this, x, y, color);
    gameObject.call(this, x, y, color);
    this.radius = radius;
    this.force = 5;
    
    this.update = function(){
        var ctx = gameArea.ctx;
        ctx.beginPath();
        ctx.fillStyle = this.color;
        ctx.arc(this.x, this.y, this.radius, 0, 2*Math.PI, false);
        ctx.fill();
        ctx.closePath();
    };
    this.newPos = function(){
        var position = velocity(this.x, this.y, gameArea.targetX, gameArea.targetY, this.force);
        this.x = this.x + position.velX;
        this.y = this.y + position.velY;
    };
}


function rect_Cir_collision(rect, circle){

    //Rotate the circle coordinate in negetive angle of the rectangle
    //to make rectangle axis parallel to the x axis to perform collision detection.
    unrotatedCircleX = Math.cos(-rect.angle) * (circle.x-rect.x) - Math.sin(-rect.angle) * (circle.y-rect.y) + rect.x;
    unrotatedCircleY = Math.sin(-rect.angle) * (circle.x-rect.x) + Math.cos(-rect.angle) * (circle.y-rect.y) + rect.y;
    

    //Calculate the x and y coordinate which is the closest point on rectangle from the centre of the circle.
    var closestX, closestY;
    //console.log(circle.x);
    //console.log(unrotatedCircleX);
    if(unrotatedCircleX < (rect.x - rect.width/2)){
        closestX = rect.x - rect.width/2;
    } else if(unrotatedCircleX > (rect.x + rect.width/2)){
        closestX = rect.x + rect.width/2;
    } else{
        closestX = unrotatedCircleX;
    }

    if(unrotatedCircleY < (rect.y - rect.height/2)){
        closestY = rect.y - rect.height/2;
    } else if(unrotatedCircleY > (rect.y + rect.height/2)){
        closestY = rect.y + rect.height/2;
    } else{
        closestY = unrotatedCircleY;
    }

    var dist = distance(unrotatedCircleX, unrotatedCircleY, closestX, closestY);
    if(dist < circle.radius) return true; else return false;
}

function circle_Collision(cir1, cir2){

    //Collision == true if the distance from the centre of one circle 
    //to the centre of another circle is smaller than the sum of two circles' radius.
    if(distance(cir1.x, cir1.y, cir2.x, cir2.y) < cir1.radius + cir2.radius){
        return true;
    }
    return false;
}

function velocity(x, y, targetX, targetY, force)
{
    //Calculate the velocity (next position) from one point to another with constant speed.
    let dx = targetX - x,
        dy = targetY - y,
        dist = distance(targetX, targetY, x, y);
        force = 5;
    if(dist < 3){
        force = 0;
    }
    let velX = (dx/dist)*force,
        velY = (dy/dist)*force;
    return {velX: velX, velY: velY};  
}

function distance(x1, y1, x2, y2){
    let dx = x2 - x1,
        dy = y2 - y1;
    return Math.sqrt(dx*dx + dy*dy);  
}

function updateGameArea(){
    gameArea.clear();
    if(player1 instanceof playerRect){
        //Left click
        if(gameArea.mouseClick == 1) player1.moveAngle = 2;
        //Right click
        else if(gameArea.mouseClick == 2) player1.moveAngle = -2;

        else player1.moveAngle = 0;
    }
    player1.newPos();
    player1.update();
    //pointArray.forEach(point => {point.update();})
    pointArray.forEach(point => {point.update();});
}
/*
function setCanvasSize(bounds){
    document.getElementById('canvas').setAttribute('width', bounds.width);
    document.getElementById('canvas').setAttribute('height', bounds.height);
}
*/
startGame();
