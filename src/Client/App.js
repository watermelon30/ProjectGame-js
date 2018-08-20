var player1;
var pointArray = [];
var canvas  = document.getElementById('canvas');
var ctx = canvas.getContext("2d");

var gameArea = {  
    targetX : innerWidth/2,
    targetY : innerHeight/2,
    lMousePress : 0, //1 when left mouse key pressed
    rMousePress : 0, //1 when right mouse key pressed
    mouseClick : 0, //1 for left rotate, 2 for right rotate, 0 for no rotate.
    start: function() {

        //setCanvasSize(this.bounds);

        //Frame Rate
        this.interval = setInterval(updateGameArea, 10);
        
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

        background.addEventListener('load', drawBackground, false);

    },
    clear: function(){
        ctx.clearRect(0,0, canvas.width , canvas.height);
    }
};

function init(){
    ctx.canvas.width  = window.innerWidth;
    ctx.canvas.height = window.innerHeight;
    player1 = new playerRect(50,200,"red", 500,500);
    // player1 = new playerCir(50,"red", 500,500);
    // player1 = new playerLine(100,"red",500,500);

        
    var x, y, radius = 10, color;
    for(let i=0; i< 500; i++){
        color = randomColor();
        x = Math.random() * (canvas.width - radius);
        y = Math.random() * (canvas.height - radius);
        if(i != 0){
            //Check for overlapping points
            //Note: This does not actually prevent all overlapping, but enough.
            for(let j=0; j< pointArray.length; j++){
                if(distance(x,y, pointArray[j].x, pointArray[j].y) < radius * 2) {
                    x = Math.random() * (canvas.width - radius);
                    y = Math.random() * (canvas.height - radius);
                    //j-- to recheck overlapping.
                    j--;
                }
                //TODO: Check overlapping with player object.
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

//Base class of all objects in canvas.
function gameObject(x, y, color){
    this.color = color;
    this.x = x;
    this.y = y;
}

function gameCircle(radius, color, x, y){
    gameObject.call(this, x, y, color);
    this.radius = radius;
    this.tempColor = this.color;
    this.velocity = new Vector2d(0,0);
    this.corner = 0;
    this.update = function(){
        ctx.beginPath();   
        ctx.fillStyle = this.color;
        ctx.arc(this.x, this.y, this.radius, 0, 2*Math.PI, false);
        ctx.fill();
        ctx.closePath();
    }
    //TODO: Calculate the force from collision with player and apply friction to make it stop.
    this.newPos = function(){ 

         
        if(circle_Collision(player1, this)){
            this.color = "white";
            let b = bounce2(player1, this);
            this.velocity.x += 2 * b.x;
            this.velocity.y += 2 * b.y;
        }
        else if(rect_Cir_collision(player1, this)){
            this.color = "white";
            let b = bounce4(player1, this);
            this.velocity.x += 2 * b.x;
            this.velocity.y += 2 * b.y;
        } else{
            
            //This is to prevent from all points stuck in a corner.
            if(this.corner > 1){
                this.velocity.x = Math.random() * 10;
                this.velocity.y = Math.random() * 10;
            }
            this.corner = 0;
            this.color = this.tempColor;

            //Appy friction.
            this.velocity.x = this.velocity.x * 0.98;
            this.velocity.y = this.velocity.y * 0.98;
            
            //Force stop when velocity is small.
            if(distance(0,0,this.velocity.x, this.velocity.y) < 0.2) {
                this.velocity.x = 0;
                this.velocity.y = 0;
            }
        }
               //Bounce off the when the point touches the boundary of canvas.

        //Touch right side of boundary
        if(this.x >= canvas.width - this.radius) {
            this.x = canvas.width - this.radius;
            this.velocity.x = -this.velocity.x;
            this.corner++;
        }
        //Touch left side of boundary
        else if(this.x <= this.radius) {
            this.x = this.radius;
            this.velocity.x = -this.velocity.x;
            this.corner++;
        }
        //Touch top of the boundary. 
        if(this.y <= this.radius){ 
            this.y = this.radius;
            this.velocity.y = -this.velocity.y;
            this.corner++;
        }
        //Touch bottom of the boundary.
        else if(this.y >= canvas.height - this.radius) {
            this.y = canvas.height - this.radius;
            this.velocity.y = -this.velocity.y;
            this.corner++;
        }

        //Movement
        this.x +=  this.velocity.x;
        this.y +=  this.velocity.y;
    }
}

function playerRect(width, height, color, x, y){ 
    gameObject.call(this, x, y, color);
    this.width = width;
    this.height = height;
    this.angle = 0;
    this.moveAngle = 0;
    this.force = 3;
    
    this.update = function(){
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.fillStyle = this.color;
        ctx.fillRect(this.width / -2, this.height / -2, this.width, this.height);
        ctx.restore();  
    };
    this.newPos = function(){
        this.angle += this.moveAngle * Math.PI / 180;
        this.velocity = playerMovement(this.x, this.y, gameArea.targetX, gameArea.targetY, this.force, 0);
        this.x += this.velocity.x;
        this.y += this.velocity.y;
    };
}

function playerCir(radius, color, x, y){ 
    gameObject.call(this, x, y, color);
    this.radius = radius;
    this.force = 2.5;    
    this.update = function(){
        ctx.beginPath();
        ctx.globalAlpha=0.6;
        ctx.fillStyle = this.color;
        //Draw the circle bigger than its radius to make more realistic collision.
        ctx.arc(this.x, this.y, this.radius+5, 0, 2*Math.PI, false);
        ctx.fill();
        ctx.closePath();
        ctx.globalAlpha = 1;

    };
    this.newPos = function(){
        this.velocity = playerMovement(this.x, this.y, gameArea.targetX, gameArea.targetY, this.force, this.radius);
        this.x += this.velocity.x;
        this.y += this.velocity.y;
    };
}

function playerLine(length, color, x, y){
    gameObject.call(this, x, y, color);
    this.length = length;
    this.x = x;
    this.y = y;

    this.color = color;
    this.direction = new Vector2d(1,1);
    this.dist = 1;
    this.update = function(){
        ctx.lineWidth=5;
        ctx.strokeStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x - this.endPoint.x, this.y - this.endPoint.y);
        ctx.stroke();

        ctx.closePath();
    };
    this.newPos = function(){
        //Not Done
        this.velocity = playerMovement(this.x, this.y, gameArea.targetX, gameArea.targetY, this.force, 0);
        if(distance(0,0,this.velocity.x, this.velocity.y)!= 0){
            this.direction = this.velocity;
        }
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.endPoint = getLine(this.x, this.y, this.direction, this.length);

    };
}

function getLine(x, y, target, length){
    var dx, dy, d, endPoint;
    dx = target.x-x,
    dy = target.y-y;
    //Direction of the line.
    d = normalise(new Vector2d(target.x,target.y));

    endPoint = new Vector2d(d.x*length, d.y*length);
    return endPoint;
}

function rect_Cir_collision(rect, circle){

    //Rotate the circle coordinate in negetive angle of the rectangle
    //to assume thta rectangle axis is parallel to the x axis to perform collision detection.
    unrotatedCircleX = Math.cos(-rect.angle) * (circle.x-rect.x) - Math.sin(-rect.angle) * (circle.y-rect.y) + rect.x;
    unrotatedCircleY = Math.sin(-rect.angle) * (circle.x-rect.x) + Math.cos(-rect.angle) * (circle.y-rect.y) + rect.y;
    

    //Calculate the x and y coordinate which is the closest point on rectangle from the centre of the circle.
    //console.log(circle.x);
    //console.log(unrotatedCircleX);
    var closest = closestPoint(unrotatedCircleX, unrotatedCircleY, rect);

    var dist = distance(unrotatedCircleX, unrotatedCircleY, closest.x, closest.y);
    if(dist < circle.radius) return true; else return false;
}

function closestPoint(circleX, circleY, rect){
    var closestX, closestY;
    if(circleX < (rect.x - rect.width/2)){
        closestX = rect.x - rect.width/2;
    } else if(circleX > (rect.x + rect.width/2)){
        closestX = rect.x + rect.width/2;
    } else{
        closestX = circleX;
    }

    if(circleY < (rect.y - rect.height/2)){
        closestY = rect.y - rect.height/2;
    } else if(circleY > (rect.y + rect.height/2)){
        closestY = rect.y + rect.height/2;
    } else{
        closestY = circleY;
    }
    var closest = new Vector2d(closestX, closestY);
    return closest;
}

function circle_Collision(cir1, cir2){

    //Collision == true if the distance from the centre of one circle 
    //to the centre of another circle is smaller than the sum of two circles' radius.
    if(distance(cir1.x, cir1.y, cir2.x, cir2.y) < cir1.radius + cir2.radius){
        return true;
    }
    return false;
}

//Player movement when moving mouse cursor.
function playerMovement(x, y, targetX, targetY, force, limit)
{
    if(targetX > canvas.width - limit) targetX = canvas.width - limit;
    else if (targetX < 0 + limit) targetX = limit;
    if(targetY > canvas.height - limit) targetY = canvas.height - limit;
    else if(targetY < 0 + limit) targetY = limit;
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
    var velocity = new Vector2d(velX, velY);
    return velocity;  
}

function Vector2d(x, y){
    this.x = x;
    this.y = y;
}

function bounce(player, point){
    var tangentVector, velocityVector, length, veloVOnTangent, veloVOrthToTangent;

    //tangentVector: vector that is the tangent of two circle, which is perpendicular 
    //to the line connecting two circles. Product of tangentVector and line perpendicular to it is 0,
    //hence tangentVector of (x,y) is (-y, x)
    tangentVector = new Vector2d(-(point.y - player.y), (point.x - player.x));
    
    //Normalise vector
    tangentVector = normalise(tangentVector);

    //Velocity of the player.
    velocityVector = new Vector2d(player.vlocity.x, player.vlocity.y);
    
    //Next, we try to get the projection of velocityVector.

    //Length of the velocity vector parallel to tangent vector.
    //Length = Scalar projection of velocityVector onto tangentVector.
    length = dot2(velocityVector, tangentVector);
    
    //Velocity vector that is on tangent vector.
    veloVOnTangent = new Vector2d(tangentVector.x * length, tangentVector.y * length);

    //Velocity vector that is orthogonal to tangent vector (veloVOrthToTangent + veloVOnTangent = velocityVector)
    veloVOrthToTangent = new Vector2d(velocityVector.x - veloVOnTangent.x, velocityVector.y - veloVOnTangent.y);

    return veloVOrthToTangent;
}

function bounce2(player, point){

    var d, velocityVector, velocityToPoint, c;

    //c: To control the force applied onto the point.
    c = 0.8;

    //d: vector from centre of player to centre of point.
    d = new Vector2d(point.x - player.x, point.y - player.y);

    d = normalise(d);

    //Velocity of the difference between player and point.
 
     velocityVector = new Vector2d(player.velocity.x - point.velocity.x, player.velocity.y - point.velocity.y);

    //l: length of velocityVector projected onto direction d.
    l = dot2(velocityVector, d);
    
    //Prevent situation where angle of velocityVector and d > 90,
    //which makes the point going to the same direction of player.
    if(l < 0) {
        l = 0;
    }

    velocityToPoint = new Vector2d(d.x * l * c, d.y * l * c);

    return velocityToPoint;
}

function bounce3(player, point){
    
    var d = new Vector2d(point.x - player.x, point.y - player.y);
    var l = distance(0,0,d.x,d.y);
    d = normalise(d);
    var k = 0.5;

    var overlap = (player.radius + point.radius) - l;
    if(overlap < 0) {
        overlap = 0;    
    }

    var acceleration = new Vector2d(d.x * overlap*k, d.y*overlap*k);
    //Velocity of the player.
    // velocityVector = new Vector2d(player.position.velX - point.position.x, player.position.velY - point.position.y);

    // var l = dot2(velocityVector, d);
    // if(l < 0) {
    //     l = 0;
    // }
    // var velocityToPoint = new Vector2d(d.x * l, d.y * l);

    // return velocityToPoint;
    return acceleration;
}

function bounce4(player, point){
    var unrotated;
    var d, velocityVector, velocityToPoint, c, closest, moveAngle, preX, preY;

    //c: To control the force applied onto the point.
    c = 0.8;
    unrotated = point;
    unrotated.x = Math.cos(-player.angle) * (point.x - player.x) - Math.sin(-player.angle) * (point.y - player.y) + player.x;
    unrotated.y = Math.sin(-player.angle) * (point.x - player.x) + Math.cos(-player.angle) * (point.y - player.y) + player.y; 
    closest = closestPoint(unrotated.x, unrotated.y, player);

    //d: directional vector from the closest point from a player to point to the centre of the point.
    d = new Vector2d(point.x - closest.x, point.y - closest.y);
    d.x =  Math.cos(player.angle) * (d.x - player.x) - Math.sin(player.angle) * (d.y - player.y) + player.x;
    d.y = Math.sin(player.angle) * (d.x - player.x) + Math.cos(player.angle) * (d.y - player.y) + player.y; 
    d = normalise(d);

    

    rotateRadius = new Vector2d(closest.x - player.x, closest.y - player.y);
    moveAngle = player.moveAngle * Math.PI / 180;
    //Previous X and Y of the player
    preX = Math.cos(-moveAngle) * (rotateRadius.x) - Math.sin(-moveAngle) * (rotateRadius.y) + player.x,
    preY = Math.sin(-moveAngle) * (rotateRadius.x) + Math.cos(-moveAngle) * (rotateRadius.y) + player.y;
    
    rotateVelocity = new Vector2d(player.x - preX, player.y - preY);
    // console.log(rotateVelocity);
    // console.log(player.x + "," + player.y)

    // rotateVelocity = normalise(rotateVelocity);
    // velocityVector = new Vector2d(player.velocity.x - point.velocity.x, player.velocity.y - point.velocity.y);

    velocityVector = new Vector2d(player.velocity.x - point.velocity.x,
         player.velocity.y - point.velocity.y);

    //l: length of velocityVector projected onto direction d.
    l = dot2(velocityVector, d);
    
    //Prevent situation where angle of velocityVector and d > 90,
    //which makes the point going to the same direction of player.
    if(l < 0) l = 0;

    velocityToPoint = new Vector2d(d.x * l * c, d.y * l * c);

    return velocityToPoint;
}

//Vector normalisation
function normalise(vector){
    var dist = distance(0,0,vector.x, vector.y);
    var newVector = vector;
    newVector.x = vector.x / dist;
    newVector.y = vector.y / dist;
    return newVector;
}

//Dot prodeuct of 2D vectors.
function dot2(vector1, vector2){
    var sum = vector1.x * vector2.x + vector1.y * vector2.y;
    return sum;
}

//Distance of two points
function distance(x1, y1, x2, y2){
    let dx = x2 - x1,
        dy = y2 - y1;
    return Math.sqrt(dx*dx + dy*dy);  
}

function updateGameArea(){
    gameArea.clear();
    ctx.fillStyle = "black";
    ctx.fillRect(0,0, canvas.width , canvas.height);
    if(player1 instanceof playerRect){
        //Left click
        if(gameArea.mouseClick == 1) player1.moveAngle = 2;
        //Right click
        else if(gameArea.mouseClick == 2) player1.moveAngle = -2;

        else player1.moveAngle = 0;
    }
    player1.newPos();
    player1.update();
   pointArray.forEach(point => {
        point.newPos();
        point.update();
    });
}
/*
function setCanvasSize(bounds){
    document.getElementById('canvas').setAttribute('width', bounds.width);
    document.getElementById('canvas').setAttribute('height', bounds.height);
}
*/
startGame();
