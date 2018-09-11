var Vector2d = require('./Vector.js');
var Global = require('./Global.js');

//Base class of all objects in canvas.
class gameObject{
    constructor(x, y, color){
        this.color = color;
        this.x = x;
        this.y = y;    
    }
}

class gamePoint extends gameObject{
    constructor(x, y, color, radius){
        super(x, y, color);
        this.radius = radius;
        this.tempColor = this.color;
        this.velocity = new Vector2d(0,0);
        this.corner = 0;
    }
    inScreen(screenTL, screenBR){
        if(this.x >= screenTL.x - this.radius && this.x <= screenBR.x + this.radius){
            if(this.y >= screenTL.y - this.radius && this.y <= screenBR.y + this.radius){
                return true;
            }
        }
        return false;
    }

    newSpeed(player){
            if(!(player instanceof playerLine)){
                if(player.collisionFunc(this)){
                    this.color = "white";
                    let b = player.bounce(this);
                    this.velocity.x += 2 * b.x;
                    this.velocity.y += 2 * b.y;
                }
            }
    }

    newPos(){
        //This is to prevent from all points stuck in a corner.
        if(this.corner > 1){
            this.velocity.x = Math.random() * 10;
            this.velocity.y = Math.random() * 10;
        }
        this.corner = 0;
        this.color = this.tempColor;
        //Bounce off the when the point touches the boundary of canvas.

        //Touch right side of boundary
        if(this.x >= Global.canvasWidth - this.radius) {
            this.x = Global.canvasWidth - this.radius;
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
        else if(this.y >=  Global.canvasHeight - this.radius) {
            this.y =  Global.canvasHeight- this.radius;
            this.velocity.y = -this.velocity.y;
            this.corner++;
        }
        //Movement
        this.x += this.velocity.x;
        this.y += this.velocity.y;

        //Appy friction.
        this.velocity.x = this.velocity.x * 0.98;
        this.velocity.y = this.velocity.y * 0.98;
        
        //Force stop when velocity is small.
        if(this.velocity.distance(new Vector2d(0,0)) < 0.2) {
            this.velocity.x = 0;
            this.velocity.y = 0;
        }        
    }
}

class gameNeedle extends gameObject{
    constructor(x, y, color, length, direction, speed){
        super(x, y, color);
        this.length = length - 50;
        this.direction = direction.normalise();
        this.direction.x *= speed;
        this.direction.y *= speed; 
        this.endPoint = new Vector2d(0,0);
        this.alive = true;
    }

    inScreen(screenTL, screenBR){
        if(this.x >= screenTL.x - this.length && this.x <= screenBR.x + this.length){
            if(this.y >= screenTL.y - this.length && this.y <= screenBR.y + this.length){
                return true;
            }
        }
        return false;
    }
    newPos(){
        this.endPoint = getLine(this.x, this.y, this.direction, this.length);
        this.x += this.direction.x;
        this.y += this.direction.y;
        // if(this.x < screenTL.x || this.y > screenBR.x) {
        //     this.alive = false;
        // }
    }
}

class playerLine extends gameObject{
    constructor(x, y, color, screenWidth, screenHeight, length){
        super(x,y,color);
        this.screenWidth = screenWidth;
        this.screenHeight = screenHeight;
        this.length = length;
        this.direction = new Vector2d(1,1);
        this.needleArray = [];
        this.playerVelo = new Vector2d(0,0);
        this.velocity = new Vector2d(0,0);
        this.screenTL = new Vector2d(x - screenWidth/2, y - screenHeight/2);
        this.screenBR = new Vector2d(x + screenWidth/2, y + screenHeight/2);
        this.target = new Vector2d(0,0);
        this.endPoint = new Vector2d(0,0);
        this.grid = new Vector2d(this.x % Global.gridGap, this.y % Global.gridGap);
        this.emit = false;
    }

    inScreen(othersScreenTL, othersScreenBR){
        if(this.x >= othersScreenTL.x - this.length && this.x <= othersScreenBR.x + this.length){
            if(this.y >= othersScreenTL.y - this.length && this.y <= othersScreenBR.y + this.length){
                return true;
            }
        }
        return false;
    }
    newPos(){
        this.velocity = playerMovement(this.target.x, this.target.y, this.screenWidth, this.screenHeight);
        if(this.velocity.distance(new Vector2d(0,0))!= 0){
            this.direction = Object.assign({},this.velocity);
        }
        this.endPoint = getLine(this.x, this.y, this.direction, this.length);
        this.playerVelo = checkBound(this.x, this.y, this.velocity, 0);
        this.x += this.playerVelo.x;
        this.y += this.playerVelo.y;
        this.screenTL.x = this.x - this.screenWidth/2;
        this.screenTL.y = this.y - this.screenHeight/2;
        this.screenBR.x = this.x + this.screenWidth/2;
        this.screenBR.y = this.y + this.screenHeight/2;
        this.grid.x = this.x % Global.gridGap;
        this.grid.y = this.y % Global.gridGap;

        if(this.emit == true){
            this.needleArray.push(new gameNeedle(this.x, this.y,this.color,this.length,this.velocity,8));
        }
    }

    emit(){
        this.needleArray.push(new gameNeedle(this.x, this.y,this.color,this.length,this.velocity,8));
    }

    cleanNeedle(){
        //To ask: Necessary to clean needle out of canvas from the needleArray?
    };

}

class playerRect extends gameObject{
    constructor(x, y, color, screenWidth, screenHeight, width, height){
        super(x,y,color);
        this.screenWidth = screenWidth;
        this.screenHeight = screenHeight;
        this.width = width;
        this.height = height;
        this.angle = 0;
        this.moveAngle = 0;
        this.force = 3;
        this.playerVelo = new Vector2d(0,0);
        this.screenTL = new Vector2d(x - screenWidth/2, y - screenHeight/2);
        this.screenBR = new Vector2d(x + screenWidth/2, y + screenHeight/2);
        this.target = new Vector2d(0,0);
    }
    inScreen(othersScreenTL, othersScreenBR){
        //furthest: Furthest point from rectangle centre
        var furthest = Math.sqrt(this.height*this.height + this.width*this.width);
        if(this.x >= othersScreenTL.x - furthest && this.x <= othersScreenBR.x + furthest){
            if(this.y >= othersScreenTL.y - furthest && this.y <= othersScreenBR.y + furthest){
                return true;
            }
        }
        return false;
    }
    newPos(){
        this.angle += this.moveAngle * Math.PI / 180;
        this.velocity = playerMovement(this.target.x, this.target.y, this.screenWidth, this.screenHeight);
        this.playerVelo = checkBound(this.x, this.y, this.velocity, 0);
        this.x += this.playerVelo.x;
        this.y += this.playerVelo.y;
        this.screenTL.x = this.x - this.screenWidth/2;
        this.screenTL.y = this.y - this.screenHeight/2;
        this.screenBR.x = this.x + this.screenWidth/2;
        this.screenBR.y = this.y + this.screenHeight/2;
    }

    collisionFunc(shape){

        //Rotate the circle coordinate in negetive angle of the rectangle
        //to assume thta rectangle axis is parallel to the x axis to perform collision detection.
        var unrotatedCircleX = Math.cos(-this.angle) * (shape.x-this.x) - Math.sin(-this.angle) * (shape.y-this.y) + this.x;
        var unrotatedCircleY = Math.sin(-this.angle) * (shape.x-this.x) + Math.cos(-this.angle) * (shape.y-this.y) + this.y;
        
        //Calculate the x and y coordinate which is the closest point on rectangle from the centre of the circle.
        //console.log(shape.x);
        //console.log(unrotatedCircleX);
        var closest = closestPoint(unrotatedCircleX, unrotatedCircleY, this);

        var dist = closest.distance(new Vector2d(unrotatedCircleX, unrotatedCircleY));
        if(dist < shape.radius) return true; 
        else return false;
    }

    bounce(point){
        var unrotated, closest;
        var d, d2;
        var rotateRadius, rotateVelo, rotateVelo2, moveAngle, preX, preY;
        var velocityVector, velocityToPoint, c, l;
    
        //c: To control the force applied onto the point.
        c = 1;

        //unrotated: Rotate the point coordinate with -player.angle to get the position in unrotated rectangle's perspective.
        unrotated = new Vector2d(0,0);
        unrotated.x = Math.cos(-this.angle) * (point.x - this.x) - Math.sin(-this.angle) * (point.y - this.y) + this.x;
        unrotated.y = Math.sin(-this.angle) * (point.x - this.x) + Math.cos(-this.angle) * (point.y - this.y) + this.y; 
        closest = closestPoint(unrotated.x, unrotated.y, this);
    
        //d: directional vector from the closest point of a player to point to the centre of the point 
          //in unrotated rectangle's perspective.
        d = new Vector2d(unrotated.x - closest.x, unrotated.y - closest.y).normalise();
    
        //Rotate the d back to rotated rectangle's prespective.
        d2 = new Vector2d(d.x, d.y);
        d2.x = Math.cos(this.angle) * d.x - Math.sin(this.angle) * d.y;
        d2.y = Math.sin(this.angle) * d.x + Math.cos(this.angle) * d.y;
    
        //rotateRadius: the radius from closest point on rectangle to the centre of rectangle.
        rotateRadius = new Vector2d(closest.x - this.x, closest.y - this.y);
        moveAngle = this.moveAngle * Math.PI / 180;
        rotateVelo = new Vector2d(0, 0);
        rotateVelo2 = new Vector2d(0,0);

        //Previous X and Y of the closest point before rotation (only calculate when rotation exists)
        if(moveAngle != 0){
            preX = Math.cos(-moveAngle) * (rotateRadius.x) - Math.sin(-moveAngle) * (rotateRadius.y) + this.x;
            preY = Math.sin(-moveAngle) * (rotateRadius.x) + Math.cos(-moveAngle) * (rotateRadius.y) + this.y;
    
            //Rotation velocity in unrotated rectangle's perspective.
            rotateVelo = new Vector2d(closest.x - preX, closest.y - preY);
            //Rotation velocity in rotated rectangle's perspective.
            rotateVelo2.x = Math.cos(this.angle) * rotateVelo.x - Math.sin(this.angle) * rotateVelo.y;
            rotateVelo2.y = Math.sin(this.angle) * rotateVelo.x + Math.cos(this.angle) * rotateVelo.y;
            // console.log(rotateVelo.x + ", " + rotateVelo.y);
            // console.log(rotateRadius.x + ", " + rotateRadius.y);
        } 
    
        velocityVector = new Vector2d(this.playerVelo.x - point.velocity.x + rotateVelo2.x,
                                      this.playerVelo.y - point.velocity.y + rotateVelo2.y);
    
        //l: length of velocityVector projected onto direction d.
        l = d2.dot(velocityVector);
        
        //Prevent situation where angle of velocityVector and d > 90,
        //which makes the point going to the same direction of player.
        if(l < 0) l = 0;
    
        velocityToPoint = new Vector2d(d2.x * l * c, d2.y * l * c);
    
        return velocityToPoint;
    }
}

class playerCir extends gameObject{
    constructor(x, y, color, screenWidth, screenHeight, radius){
        super(x,y,color);
        this.tempColor = color;
        this.screenWidth = screenWidth;
        this.screenHeight = screenHeight;
        this.radius = radius;
        this.alpha = 1.0;
        this.playerVelo = new Vector2d(0,0);
        this.velocity = new Vector2d(0,0);
        this.screenTL = new Vector2d(x - screenWidth/2, y - screenHeight/2);
        this.screenBR =  new Vector2d(x + screenWidth/2, y + screenHeight/2);
        this.target = new Vector2d(0,0);
        this.timer = 10;
        this.invisible = false;
    }

    inScreen(othersScreenTL, othersScreenBR){
        if(this.x >= othersScreenTL.x - this.radius && this.x <= othersScreenBR.x + this.radius){
            if(this.y >= othersScreenTL.y - this.radius && this.y <= othersScreenBR.y + this.radius){
                return true;
            }
        }
        return false;
    }

    newPos(){
        this.velocity = playerMovement(this.target.x, this.target.y, this.screenWidth, this.screenHeight);
        this.playerVelo = checkBound(this.x, this.y, this.velocity, this.radius);
        this.x += this.playerVelo.x;
        this.y += this.playerVelo.y;
        this.screenTL.x = this.x - this.screenWidth/2;
        this.screenTL.y = this.y - this.screenHeight/2;
        this.screenBR.x = this.x + this.screenWidth/2;
        this.screenBR.y = this.y + this.screenHeight/2;

        //Invisible mode
        if(this.invisible == true){
            this.alpha = 0.5;
            //If timer is 0, disable invisible mode.
            if(this.timer >= 0.02){
                this.timer-=0.02;
            }
            else {
                this.invisible = false;
                this.timer = 0;
            }
        } else {
            //Restart timer
            this.alpha = 1;
            if(this.timer < 14.99){
                this.timer += 0.01;
            }
        }
    }

    collisionFunc(shape){
        //Collision == true if the distance from the centre of one circle 
        //to the centre of another circle is smaller than the sum of two circles' radius.
        if(new Vector2d(shape.x, shape.y).distance(new Vector2d(this.x, this.y)) <= shape.radius + this.radius){
            return true;
        }
        return false;
    }

    bounce(point){
        var d, velocityVector, velocityToPoint, c, l;

        //c: To control the force applied onto the point.
        c = 0.8;
    
        //d: vector from centre of player to centre of point.
        d = new Vector2d(point.x - this.x, point.y - this.y).normalise();
    
        //Velocity of the difference between player and point.
     
         velocityVector = new Vector2d(this.velocity.x - point.velocity.x, this.velocity.y - point.velocity.y);
    
        //l: length of velocityVector projected onto direction d.
        l = velocityVector.dot(d);
        
        //Prevent situation where angle of velocityVector and d > 90,
        //which makes the point going to the same direction of player.
        if(l < 0) {
            l = 0;
        }
    
        velocityToPoint = new Vector2d(d.x * l * c, d.y * l * c);
    
        return velocityToPoint;
    }
    shrink(){
        if(this.radius > 30){
            this.radius-= 0.01;
        }
    }
    unseen(){
        if(this.timer > 5){
            this.invisible = true;
        }
        else{
            console.log("Cannot be invisible");
        }
    }
}

//Get the endpoint of the character line.
function getLine(x, y, target, length){
    var dx, dy, d, endPoint;
    dx = target.x- x,
    dy = target.y- y;
    //Direction of the line.
    d = new Vector2d(target.x, target.y).normalise();
    endPoint = new Vector2d(d.x*length, d.y*length);
    return endPoint;
}

//Player movement when moving mouse cursor.
function playerMovement(targetX, targetY, screenWidth, screenHeight){

    let force = 0,
        min = Math.min(screenWidth/2, screenHeight/2),
        dx = targetX - screenWidth/2,
        dy = targetY - screenHeight/2,
        
        //To make the maximum speed in x and y direction the same, we take the minimum of screen width/height 
            //as the maximum of the cursor x and y coordinate.
        dist = new Vector2d(screenWidth/2, screenHeight/2).distance(new Vector2d(Math.min(targetX, min), Math.min(targetY,min)));

    //This is to determine the speed according to the distance from middle of screen and mosue position. 
    force = dist * 0.015;
    if(Math.abs(dx) > min) dx = Math.sign(dx) * min;
    if(Math.abs(dy) > min) dy = Math.sign(dy) * min;

    //Calculate the velocity (next position) from one point to another with constant speed.
    let velX = (dx/dist)*force,
        velY = (dy/dist)*force; 

    var velocity = new Vector2d(velX, velY);
    // console.log(velocity);  

    return velocity;  
}

//Return the final speed of a player.
function checkBound(playerX, playerY, velocity, limit){
    //Move in x direction if screen bound will not touch canvas bound.
    let playerVelo = new Vector2d(0,0);
    if(playerX + velocity.x <= Global.canvasWidth - limit){
        if(playerX + velocity.x >= 0 + limit){
            playerVelo.x = velocity.x;
        }
    } 
    //Move in y direction if screen bound will not touch canvas bound.
    if(playerY + velocity.y <= Global.canvasHeight - limit){
        if(playerY + velocity.y >= 0 + limit){
            playerVelo.y = velocity.y;
        } 
    }
    return playerVelo;
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


module.exports = {
    gamePoint:gamePoint,
    gameNeedle:gameNeedle,
    playerLine:playerLine,
    playerRect:playerRect,
    playerCir:playerCir
}; 