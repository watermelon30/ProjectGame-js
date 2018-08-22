var player1;    
var pointArray = [];
var canvas  = document.getElementById('canvas');
var ctx = canvas.getContext("2d");

var gameArea = {  
    //target: used to determine the player direction and speed.
    target : new Vector2d(window.innerWidth/2, window.innerHeight/2),
    //Top left corner coordinate of the canvas. 
    canvasTL : new Vector2d(0,0),
    //Bottom right corner coordinate of the canvas.
    // canvasBR : new Vector2d(4000,4000),
    canvasBR : new Vector2d(4000,4000),

    //Top left corner coordinate of the screen. 
    screenTL : new Vector2d(0,0),
    //Bottom right corner coordinate of the screen. 
    // screenBR : new Vector2d(canvas.width, canvas.height),
    screenBR : new Vector2d(window.innerWidth, window.innerHeight),
    lMousePress : 0, //1 when left mouse key pressed
    rMousePress : 0, //1 when right mouse key pressed
    mouseClick : 0, //1 for left rotate, 2 for right rotate, 0 for no rotate.
    start: function() {

        //setCanvasSize(this.bounds);

        //Frame Rate
        this.interval = setInterval(updateGameArea, 10);
        
        canvas.addEventListener('mousemove', function(e) {
            var bounds = document.getElementById('canvas').getBoundingClientRect();
            gameArea.target.x = e.clientX;
            gameArea.target.y = e.clientY;
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
        ctx.clearRect(0,0, canvas.width , canvas.height);
    }
};

function init(){
    ctx.canvas.width  = window.innerWidth;
    ctx.canvas.height = window.innerHeight;
    // console.log(ctx.canvas.width + " " + ctx.canvas.height);
    

    // player1 = new playerRect(50,200,"red",  window.innerWidth/2,window.innerHeight/2);
    // player1 = new playerCir(50,"red", window.innerWidth/2,window.innerHeight/2);
    player1 = new playerLine(100,"red", window.innerWidth/2,window.innerHeight/2);

        
    var x, y, radius = 10, color;
    for(let i=0; i< 5000; i++){
        color = randomColor();
        x = Math.random() * (gameArea.canvasBR.x - radius);
        y = Math.random() * (gameArea.canvasBR.y - radius);
        if(i != 0){
            //Check for overlapping points
            //Note: This does not actually prevent all overlapping, but enough.
            for(let j=0; j< pointArray.length; j++){
                if(distance(x,y, pointArray[j].x, pointArray[j].y) < radius * 2) {
                    x = Math.random() * (gameArea.canvasBR.x - radius);
                    y = Math.random() * (gameArea.canvasBR.y - radius);
                    //j-- to recheck overlapping.
                    j--;
                }
                //TODO: Check overlapping with player object.
            }
        }
        pointArray.push(new gamePoint(radius, color, x, y));
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

function gamePoint(radius, color, x, y){
    gameObject.call(this, x, y, color);
    this.radius = radius;
    this.tempColor = this.color;
    this.velocity = new Vector2d(0,0);
    this.corner = 0;
    this.update = function(){
        //Draw only if the coordinate is inside the screen coordinate.
        if(this.x >= gameArea.screenTL.x && this.x <= gameArea.screenBR.x){
            if(this.y >= gameArea.screenTL.y && this.y <= gameArea.screenBR.y){
                ctx.beginPath();
                ctx.fillStyle = this.color;
                //Substract screen top left to get coordinate in screen perspective.
                ctx.arc(this.x-gameArea.screenTL.x, this.y-gameArea.screenTL.y, this.radius, 0, 2*Math.PI, false);
                ctx.fill();
                ctx.closePath();
            }
         } 
    }
    this.newPos = function(){ 
        if(!player1 instanceof playerLine){
            if(player1.collisionFunc(this)){
                this.color = "white";
                console.log('collide!');
                let b = player1.bounce(this);
                this.velocity.x += 2 * b.x;
                this.velocity.y += 2 * b.y;
                console.log(this.velocity.x+","+this.velocity.y);
            } else{
                //This is to prevent from all points stuck in a corner.
                if(this.corner > 1){
                    this.velocity.x = Math.random() * 10;
                    this.velocity.y = Math.random() * 10;
                }
                // if(distance(this.x, this.y, gameArea.canvasTL.x, gameArea.canvasTL.y) < 2){
                    // this.velocity.x = Math.random() * 10;
                    // this.velocity.y = Math.random() * 10;
                // }
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
        }

        //Bounce off the when the point touches the boundary of canvas.

        //Touch right side of boundary
        if(this.x >= gameArea.canvasBR.x - this.radius) {
            this.x = gameArea.canvasBR.x - this.radius;
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
        else if(this.y >= gameArea.canvasBR.y - this.radius) {
            this.y =  gameArea.canvasBR.y- this.radius;
            this.velocity.y = -this.velocity.y;
            this.corner++;
        }
        //Movement
        this.x += this.velocity.x;
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
        ctx.translate(window.innerWidth/2, window.innerHeight/2);
        ctx.rotate(this.angle);
        ctx.fillStyle = this.color;
        ctx.fillRect(this.width / -2, this.height / -2, this.width, this.height);
        ctx.restore();  
    };
    this.newPos = function(){

        this.angle += this.moveAngle * Math.PI / 180;
        this.velocity = playerMovement(this.x, this.y, gameArea.target.x, gameArea.target.y, this.force);
        let playerVelo = checkBound(this.x, this.y, this.velocity, 0);

        this.x += playerVelo.x;
        this.y += playerVelo.y;
        // this.x += this.velocity.x;
        // this.y += this.velocity.y;
    };

    this.collisionFunc = function(point){
        return rect_Cir_collision(this, point);
    };

    this.bounce = function(point){
        return bounce4(this, point);
    }
}

function playerCir(radius, color, x, y){ 
    gameObject.call(this, x, y, color);
    this.radius = radius;
    this.force = 2.5;
    this.velocity = new Vector2d(0,0); 
    this.update = function(){
        ctx.beginPath();
        ctx.globalAlpha=0.6;
        ctx.fillStyle = this.color;
        //Draw the circle bigger than its radius to make more realistic collision.
        ctx.arc(window.innerWidth/2, window.innerHeight/2, this.radius+5, 0, 2*Math.PI, false);
        ctx.fill();
        ctx.closePath();
        ctx.globalAlpha = 1;

    };
    this.newPos = function(){
        this.velocity = playerMovement(this.x, this.y, gameArea.target.x, gameArea.target.y, this.force);
        let playerVelo = checkBound(this.x, this.y, this.velocity, this.radius);
        this.x += playerVelo.x;
        this.y += playerVelo.y;
        //console.log(gameArea.screenBR.x + ", " + gameArea.screenBR.y);
    };
    this.collisionFunc = function(point){
        return circle_Collision(this, point);
    }

    this.bounce = function(point){
        return bounce2(this, point);
    }
}


//Player movement when moving mouse cursor.
function playerMovement(x, y, targetX, targetY, force){
    //Get the direction from middle screen point to the cursor.
    let dx = targetX - window.innerWidth/2,
        dy = targetY - window.innerHeight/2,
        dist = distance(targetX, targetY, window.innerWidth/2, window.innerHeight/2);
        force = 5;
    //Distance between cursor and player position.
    // TODO: Slower the player if distance is close. 
    if(dist < 50){
        force = 0;
    }

    //Calculate the velocity (next position) from one point to another with constant speed.
    let velX = (dx/dist)*force,
        velY = (dy/dist)*force; 

    var velocity = new Vector2d(velX, velY);
    return velocity;  
}


function playerLine(length, color, x, y){
    gameObject.call(this, x, y, color);
    this.length = length;
    this.direction = new Vector2d(1,1);
    this.dist = 1;
    this.update = function(){
        ctx.lineWidth=5;
        ctx.strokeStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(window.innerWidth/2, window.innerHeight/2);
        ctx.lineTo(window.innerWidth/2 - this.endPoint.x, window.innerHeight/2 - this.endPoint.y);
        // ctx.lineTo(this.x - this.endPoint.x, this.y - this.endPoint.y);
        ctx.stroke();

        ctx.closePath();
    };
    this.newPos = function(){
        //Not Done
        // this.velocity = playerMovement(this.x, this.y, gameArea.target.x, gameArea.target.y, this.force, 0);
        // if(distance(0,0,this.velocity.x, this.velocity.y)!= 0){
        //     this.direction = this.velocity;
        // }
        // this.x += this.velocity.x;
        // this.y += this.velocity.y;
        // this.endPoint = getLine(this.x, this.y, this.direction, this.length);

        this.velocity = playerMovement(this.x, this.y, gameArea.target.x, gameArea.target.y, this.force, 0);
        if(distance(0,0,this.velocity.x, this.velocity.y)!= 0){
            this.direction = this.velocity;
        }

        this.endPoint = getLine(window.innerWidth/2, window.innerHeight/2, this.direction, this.length);
        let playerVelo = checkBound(this.x, this.y, this.velocity, 0);

        this.x += playerVelo.x;
        this.y += playerVelo.y;        

    };
}


function checkBound(playerX, playerY, velocity, limit){
    //Move in x direction if screen bound will not touch canvas bound.
    let playerVelo = new Vector2d(0,0);
    if(playerX + velocity.x <= gameArea.canvasBR.x - limit){
        if(playerX + velocity.x >= gameArea.canvasTL.x + limit){
            gameArea.screenTL.x += velocity.x; 
            gameArea.screenBR.x += velocity.x;
            playerVelo.x = velocity.x;
        }
    } 
    //Move in y direction if screen bound will not touch canvas bound.
    if(playerY + velocity.y < gameArea.canvasBR.y - limit){
        if(playerY + velocity.y > gameArea.canvasTL.y + limit){
            gameArea.screenTL.y += velocity.y;
            gameArea.screenBR.y += velocity.y;
            playerVelo.y += velocity.y;
        } 
    }
    return playerVelo;
}



//Get the endpoint of the character line.
function getLine(x, y, target, length){
    var dx, dy, d, endPoint;
    dx = target.x- x,
    dy = target.y- y;
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
    if(distance(cir1.x, cir1.y, cir2.x, cir2.y) <= cir1.radius + cir2.radius){
        return true;
    }
    return false;
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
    unrotated = new Vector2d(point.x, point.y);
    unrotated.x = Math.cos(-player.angle) * (point.x - player.x) - Math.sin(-player.angle) * (point.y - player.y) + player.x;
    unrotated.y = Math.sin(-player.angle) * (point.x - player.x) + Math.cos(-player.angle) * (point.y - player.y) + player.y; 
    closest = closestPoint(unrotated.x, unrotated.y, player);

    //d: directional vector from the closest point from a player to point to the centre of the point 
      //in unrotated rectangle's perspective.
    d = new Vector2d(unrotated.x - closest.x, unrotated.y - closest.y);
    d = normalise(d);

    //Rotate the d back to rotated rectangle's prespective.
    d2 = new Vector2d(d.x, d.y);
    d2.x = Math.cos(player.angle) * d.x - Math.sin(player.angle) * d.y;
    d2.y = Math.sin(player.angle) * d.x + Math.cos(player.angle) * d.y;

    rotateRadius = new Vector2d(closest.x - player.x, closest.y - player.y);
    moveAngle = player.moveAngle * Math.PI / 180;
    //Previous X and Y of the closest point
    preX = Math.cos(-moveAngle) * (rotateRadius.x) - Math.sin(-moveAngle) * (rotateRadius.y) + closest.x,
    preY = Math.sin(-moveAngle) * (rotateRadius.x) + Math.cos(-moveAngle) * (rotateRadius.y) + closest.y;

    // d3 = new Vector2d(closest.x - preX, closest.y - preY)

    d3 = new Vector2d(closest.x - preX, closest.y - preY);
    d3 = normalise(d3);

    d4 = new Vector2d(d3.x, d3.y);
    d4.x = Math.cos(moveAngle) * d4.x - Math.sin(moveAngle) * d4.y;
    d4.y = Math.sin(moveAngle) * d4.x + Math.cos(moveAngle) * d4.y;

    // console.log("current moveangle: " + player.moveAngle);
    // console.log("rotate velo: " + rotateVelocity.x + "," + rotateVelocity.y);

    velocityVector = new Vector2d(player.velocity.x - point.velocity.x + d4.x ,
         player.velocity.y - point.velocity.y + d4.y);

    //l: length of velocityVector projected onto direction d.
    l = dot2(velocityVector, d2);
    
    //Prevent situation where angle of velocityVector and d > 90,
    //which makes the point going to the same direction of player.
    if(l < 0) l = 0;

    velocityToPoint = new Vector2d(d2.x * l * c, d2.y * l * c);

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
