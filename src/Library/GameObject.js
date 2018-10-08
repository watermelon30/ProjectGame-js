var Vector2d = require('./Vector.js');
var Global = require('./Global.js');
var dt =  1.0 / Global.fps //Delta time.


//Base class of all objects in canvas.
class gameObject{
    constructor(x, y, color){
        //socket.id
        this.color = color;
        this.x = x;
        this.y = y;    
    }
}

//Life Amount for rectangle: 2000, Circle: 1500, Line: 1000
class lifeBar{
    constructor(lifeAmount){
        this.life = lifeAmount;
        this.maximum = lifeAmount;
    }
    beingAttacked(){
        this.life--;
        if(this.life < 0) return false;
        else return true;
    }
    recover(){
        if(this.life < this.maximum){
            this.life++;
            return true;
        }
        return false;
    }
}

class gamePoint extends gameObject{
    constructor(x, y, color, radius){
        super(x, y, color);
        this.radius = radius;
        this.originalColor = this.color;
        this.velocity = new Vector2d(0,0);
        this.corner = 0;
        //Check if the point has no where to go.
        this.stuck = false;
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
            if(player.collisionCircle(new Vector2d(this.x, this.y), this.radius)){
                //If the point touches a boundary and the shape, it is stuck.
                if(this.corner) this.stuck = true;
                let b = player.bounce(this);
                //Point being crushed. Assign new position.
                if(b.x == Infinity){
                    this.respawn();
                    return false;
                }
                this.velocity.x += 2 * b.x;
                this.velocity.y += 2 * b.y;
                return true;
            }
        }
    }

    respawn(){
        let newPos = randomPointPosition(Global.pointRadius);
        this.x = newPos.x;
        this.y = newPos.y;
        this.radius = Global.pointRadius;
    }

    newPos(){
        this.stuck = false;
        if(this.velocity.x != 0 || this.velocity.y != 0){
            //Prevent from all points stuck in a corner.
            if(this.corner > 1){
                this.velocity.x = Math.random() * 15;
                this.velocity.y = Math.random() * 15;
            }
            this.corner = 0;
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

            //Apply friction.
            this.velocity.x = this.velocity.x * 0.985;
            this.velocity.y = this.velocity.y * 0.985;
            
            //Force stop when velocity is small.
            if(this.velocity.distance(new Vector2d(0,0)) < 0.2) {
                this.velocity.x = 0;
                this.velocity.y = 0;
            }
        }
    }

    //Only shrink if eaten by circle or line player.
    shrink(){
        if(this.radius > 5){
            this.radius--;
            return true;
        } else {
            this.respawn();
            return false;
        }
    }
}

class gameNeedle extends gameObject{
    constructor(x, y, color, length, direction, speed){
        super(x, y, color);
        this.length = length - 50;
        this.direction = direction;
        this.direction.x *= speed;
        this.direction.y *= speed; 
        this.endPoint = getLine(this.x, this.y, this.direction, this.length);
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
        this.x += this.direction.x;
        this.y += this.direction.y;
        this.endPoint = getLine(this.x, this.y, this.direction, this.length);
    }

    touchOthers(shapes){
        if(shapes instanceof playerCir){
            return shapes.collisionCircle(new Vector2d(this.x, this.y), 0)
        }
        if(shapes instanceof playerRect){
            return shapes.withLineIntersect(this);
        }
        return shapes.touchLine(this);
    }

    isAlive(object){
        if(object.beingAttacked(this)){
            this.alive = false;
        }
    }
}

class gameEnergy extends gameObject{
    constructor(x, y, color, direction){
        super(x, y, color);
        this.radius = 10;
        //Random direction in a range 0.8 - 1.2 times of original direction.
        // this.direction.x =  direciton.x * (Math.random() * 0.4 + 0.8);
        // this.direction.y =  direction.y * (Math.random() * 0.4 + 0.8);
        this.direction = direction;
        this.velocity = new Vector2d(this.direction.x * 5, this.direction.y * 5);
        this.absorbed = false;
        this.absorbingTime = 0;
    }
    inScreen(screenTL, screenBR){
        if(this.x >= screenTL.x - this.radius && this.x <= screenBR.x + this.radius){
            if(this.y >= screenTL.y - this.radius && this.y <= screenBR.y + this.radius){
                return true;
            }
        }
        return false;
    }

    newPos(){
        if(this.velocity.x != 0 || this.velocity.y != 0){
            //Bounce off the when the point touches the boundary of canvas.

            //Touch right side of boundary
            if(this.x >= Global.canvasWidth - this.radius) {
                this.x = Global.canvasWidth - this.radius;
                this.velocity.x = -this.velocity.x;
            }
            //Touch left side of boundary
            else if(this.x <= this.radius) {
                this.x = this.radius;
                this.velocity.x = -this.velocity.x;
            }
            //Touch top of the boundary. 
            if(this.y <= this.radius){ 
                this.y = this.radius;
                this.velocity.y = -this.velocity.y;
            }
            //Touch bottom of the boundary.
            else if(this.y >=  Global.canvasHeight - this.radius) {
                this.y =  Global.canvasHeight- this.radius;
                this.velocity.y = -this.velocity.y;
            }
            this.x += this.velocity.x;
            this.y += this.velocity.y;

            //Apply friction.
            this.velocity.x *= 0.985;
            this.velocity.y *= 0.985;
            
            //Force stop when velocity is small.
            if(this.velocity.distance(new Vector2d(0,0)) < 0.2) {
                this.velocity.x = 0;
                this.velocity.y = 0;
            }
        }
    }

    absorb(player){
        if(!this.absorbed){
            if(player instanceof playerLine){
                if(player.withLineIntersect(this)){
                    this.absorbed = true;
                    return true;
                }
            }
            else {
                if(player.collisionCircle(new Vector2d(this.x, this.y), this.radius)){
                    this.absorbed = true;
                    return true;
                }
                return false;
            }
        }
    }

    //only will be called when absorbed == true
    shrink(){
        if(this.radius > 0){
            this.radius -= 2;
        }
        if(this.absorbingTime < 20){
            this.absorbingtime++;
            return true;
        }
        return false;
    }
}

class gamePlayer{
    constructor(id, x, y,color, screenHeight, screenWidth, team){
        this.id = id;
        this.x = x;
        this.y = y;
        this.color = color;
        this.screenHeight = screenHeight;
        this.screenWidth = screenWidth;
        this.team = team;
        this.id = id;
        this.originalColor = color;
        this.target = new Vector2d(0,0);
    }
}

class playerCir extends gamePlayer{
    constructor(id, x, y, color, screenWidth, screenHeight, radius, team){
        super(id,x,y,color, screenHeight, screenWidth, team);
        this.radius = radius;
        this.alpha = 1.0;
        this.playerVelo = new Vector2d(0,0);
        this.velocity = new Vector2d(0,0);
        this.screenTL = new Vector2d(x - screenWidth/2, y - screenHeight/2);
        this.screenBR =  new Vector2d(x + screenWidth/2, y + screenHeight/2);
        this.invisibleTimer = 10;
        this.invisible = false;
        this.lifeBar = new lifeBar(Global.circleLifeAmount);
        this.energyArray = [];
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
        //PlayerVelo is the actual velocity of a player after boundary checking.
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
            //If Invisibletimer is 0, disable invisible mode.
            if(this.invisibleTimer >= 0.02){
                this.invisibleTimer-=0.02;
            }
            else {
                this.invisible = false;
                this.invisibleTimer = 0;
            }
        } else {
            //Restart invisibleTimer
            this.alpha = 1;
            if(this.invisibleTimer < 14.99){
                this.invisibleTimer += 0.01;
            }
        }
    }

    collisionCircle(centreVector,  radius){
        //Collision == true if the distance from the centre of one circle 
        //to the centre of another circle is smaller than the sum of two circles' radius.
        if(centreVector.distance(new Vector2d(this.x, this.y)) <= radius + this.radius){
            return true;
        }
        return false;
    }

    //When the circle player covers points under its area in invisible mode, points are eaten.
    eatPoint(centreVector){
        if(centreVector.distance(new Vector2d(this.x, this.y)) <= this.radius){
            return true;
        } 
        return false;
    }

    //Find the intersection of line and circle
    withLineIntersect(line){
        var lineHead = new Vector2d(line.x, line.y);
        var lineDist = new Vector2d(lineHead.x - line.endPoint.x, lineHead.y - line.endPoint.y);
        var centreToLHead = new Vector2d(this.x - line.endPoint.x, this.y - line.endPoint.y);
        var lineDistSquare = lineDist.dot(lineDist);

        // Find the circle centre projected onto the line.   
        // Assume that projection of the circle centre onto the line
        // will be on line.endPoint + t(lineHead - line.endPoint).
        var t = (lineDist.dot(centreToLHead)) / lineDistSquare;
        var projection = line.endPoint.add(lineDist.multiply(t));
        //Check if projection lies inside the segment
        if(onSegment(lineHead, line.endPoint, projection)){
            if(projection.distance(new Vector2d(this.x, this.y)) <= this.radius){
                return true;
            }
        }
        //Handle the case where the projection is not on the segment but one of 
        //the segment end still in the circle.
        if(lineHead.distance(new Vector2d(this.x, this.y)) <= this.radius) return true;
        if(line.endPoint.distance(new Vector2d(this.x, this.y)) <= this.radius) return true;
        
        return false;

    }

    bounce(point){
        var d, velocityVector, velocityToPoint, c, l;

        //c: To control the force applied onto the point.
        c = 0.8;
    
        //d: vector from centre of player to centre of point.
        d = new Vector2d(point.x - this.x, point.y - this.y).normalise();
    
        //Velocity of the difference between player and point.
     
         velocityVector = new Vector2d(this.playerVelo.x - point.velocity.x, this.playerVelo.y - point.velocity.y);
    
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

    //Return false if player reaches minimum size.
    shrink(){
        if(this.radius > 30){
            this.radius *= (1-Global.circleShrinkRate);
            return true;
        }
        return false;
    }

    //Stretch the circle size.
    stretch(){
        if(this.lifeBar.recover()){
            return 1;
        }
        if(this.radius < Global.circleMaxR){
            this.radius *= (1+Global.circleStretchRate);
            return 2;
        }
        return 3;
    }

    //Called when circle reaches minimum size.
    bleeding(){
        return this.lifeBar.beingAttacked();
    }

    //Function to enable invisible mode.
    unseen(){
        if(this.invisibleTimer > 5){
            this.invisible = true;
        }
        else{
            console.log("Cannot be invisible");
        }
    }

    emit(){
        if(this.radius > 30){
            let direction = this.playerVelo.normalise(),
                energyX = this.x + direction.x * this.radius,
                energyY = this.y + direction.y * this.radius;

            this.energyArray.push(new gameEnergy(energyX, energyY, this.color, direction));
            this.radius--;    
        }
    }
}

class playerLine extends gamePlayer{
    constructor(id, x, y, color, screenWidth, screenHeight, length, team){
        super(id, x,y,color, screenHeight, screenWidth, team);
        this.length = length;
        this.direction = new Vector2d(1,1);
        this.needleArray = [];
        this.playerVelo = new Vector2d(0,0);
        this.velocity = new Vector2d(0,0);
        this.screenTL = new Vector2d(x - screenWidth/2, y - screenHeight/2);
        this.screenBR = new Vector2d(x + screenWidth/2, y + screenHeight/2);
        this.endPoint = getLine(this.x, this.y, this.direction, this.length);
        this.grid = new Vector2d(this.x % Global.gridGap, this.y % Global.gridGap);
        this.emit = false;
        this.lifeBar = new lifeBar(Global.lineLifeAmount);
        this.ammo = 100;

        //Gathering ammo (0) OR increase size/life (1) when points eaten.
        this.ammoMode = false;
    }

    inScreen(othersScreenTL, othersScreenBR){
        if(this.x >= othersScreenTL.x - this.length && this.x <= othersScreenBR.x + this.length){
            if(this.y >= othersScreenTL.y - this.length && this.y <= othersScreenBR.y + this.length){
                return true;
            }
        }
        return false;
    }
    //Return false when player tries to emit needle without ammo.
    newPos(){
        this.velocity = playerMovement(this.target.x, this.target.y, this.screenWidth, this.screenHeight);
        if(this.velocity.distance(new Vector2d(0,0))!= 0){
            this.direction = Object.assign({},this.velocity);
        }
        this.playerVelo = checkBound(this.x, this.y, this.velocity, 0);
        this.x += this.playerVelo.x;
        this.y += this.playerVelo.y;
        this.endPoint = getLine(this.x, this.y, this.direction, this.length);
        this.screenTL.x = this.x - this.screenWidth/2;
        this.screenTL.y = this.y - this.screenHeight/2;
        this.screenBR.x = this.x + this.screenWidth/2;
        this.screenBR.y = this.y + this.screenHeight/2;
        this.grid.x = this.x % Global.gridGap;
        this.grid.y = this.y % Global.gridGap;

        if(this.emit == true){
            //Emit needle when ammo != 0
            if(this.ammo > 0){
                this.needleArray.push(new gameNeedle(this.x, this.y,this.color,this.length,this.velocity.normalise(),8));
                this.ammo--;
            }
            else return false;
        }
        return true;
    }

    touchOthers(shapes){
        return shapes.withLineIntersect(this);
    }


    eatPoint(pointCentre, radius){
        let lineHead = new Vector2d(this.x, this.y);
        if(lineHead.distance(pointCentre) <= radius){
            return true;
        }
        return false;
    }

    touchLine(opposite){
        let thisHead = new Vector2d(this.x, this.y),
            oppHead = new Vector2d(opposite.x, opposite.y);
        return lineIntersect(thisHead, this.endPoint, oppHead, opposite.endPoint);
    }

    shrink(){
        if(this.length > 40){
            this.length *= (1- Global.lineShrinkRate);
            return true;
        } else {
            return this.lifeBar.beingAttacked();
        }
    }

    //Bonus only comes when line absorbs energy from teammate circle.
    stretch(bonus){
        if(!this.ammoMode){
            if(this.lifeBar.recover()){
                if(bonus) this.lifeBar.recover();
                return 1;
            }
            if(this.length < Global.lineMaxLength){
                if(bonus) this.length *= (1 + Global.lineStretchRate * Global.energyBonusRate);
                else this.length *= (1+Global.lineStretchRate);
                return 2;
            }
        } else{
            if(this.ammo < Global.lineMaxAmmo){
                if(bonus) this.ammo += Global.energyBonusRate * Global.ammoReload;
                else this.ammo += Global.ammoReload;
                return 4;
            }
        }
        return 3;
    }

    cleanNeedle(){
        //To ask: Necessary to clean needle out of canvas from the needleArray?
    };

}

class playerRect extends gamePlayer{
    constructor(id, x, y, color, screenWidth, screenHeight, width, height, team){
        super(id, x,y, color, screenHeight, screenWidth, team);
        this.width = width;
        this.height = height;
        this.angle = 0;
        this.moveAngle = 0;
        this.force = 3;
        this.playerVelo = new Vector2d(0,0);
        this.screenTL = new Vector2d(x - screenWidth/2, y - screenHeight/2);
        this.screenBR = new Vector2d(x + screenWidth/2, y + screenHeight/2);
        this.lifeBar = new lifeBar(Global.rectangleLifeAmount);
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

    //Collision detection with other circle.(Radius parameter for line player will be 0)
    collisionCircle(circle_centre, radius){

        //Rotate the circle coordinate in negative angle of the rectangle
        //to assume tht rectangle axis is parallel to the x axis to perform collision detection.
        let unrotatedCircleCentre = rotatePoint(circle_centre, new Vector2d(this.x, this.y), -this.angle);
        
        //Calculate the x and y coordinate which is the closest point on rectangle from the centre of the circle.
        //console.log(circle.x);
        let closest = closestPoint(unrotatedCircleCentre.x, unrotatedCircleCentre.y, this);

        let dist = closest.distance(unrotatedCircleCentre);
        if(dist < radius) return true; 
        else return false;
    }

    collisionRectangle(opposite){
        let oppCentre = new Vector2d(opposite.x, opposite.y);

        //Only check collision detection if the distance of two centres are close.
        if(new Vector2d(this.x, this.y).distance(oppCentre) 
           < Math.max(this.width, this.height) + Math.max(opposite.width, opposite.height)){
            
            let oppTL = new Vector2d(opposite.x - opposite.width/2, opposite.y - opposite.height/2),
                oppTR = new Vector2d(opposite.x + opposite.width/2, opposite.y - opposite.height/2),
                oppBL = new Vector2d(opposite.x - opposite.width/2, opposite.y + opposite.height/2),
                oppBR = new Vector2d(opposite.x + opposite.width/2, opposite.y + opposite.height/2);
            
            //Rotate points of opposite rectangle in negative angle of this rectangle to
            //simulate its position in this rectangle's user view.
            let rotatedOppTL = rotatePoint(oppTL, oppCentre, opposite.angle),
                rotatedOppTR = rotatePoint(oppTR, oppCentre, opposite.angle),
                rotatedOppBL = rotatePoint(oppBL, oppCentre, opposite.angle),
                rotatedOppBR = rotatePoint(oppBR, oppCentre, opposite.angle);
            
            //Check each edge of opposite rectangle if it is inside the other rectangle.
            if(lineRectIntersect(this, rotatedOppTL, rotatedOppTR)) return true;
            if(lineRectIntersect(this, rotatedOppTR, rotatedOppBR)) return true;
            if(lineRectIntersect(this, rotatedOppBR, rotatedOppBL)) return true;
            if(lineRectIntersect(this, rotatedOppBL, rotatedOppTL)) return true;
        }
        return false;
    }

    withLineIntersect(line){
        return lineRectIntersect(this, new Vector2d(line.x, line.y), line.endPoint);
    }

    bounce(point){
        var unrotated, closest;
        var d, d2;
        var rotateRadius, rotateVelo, rotateVelo2, moveAngle, preX, preY;
        var velocityVector, velocityToPoint, c, l;
    
        //c: To control the force applied onto the point.
        c = 1;

        //unrotated: Rotate the point coordinate with -player.angle to get the position in unrotated rectangle's perspective.
        unrotated = rotatePoint(point, new Vector2d(this.x, this.y), -this.angle);

        closest = closestPoint(unrotated.x, unrotated.y, this);
    
        //d: directional vector from the closest point of a player to point to the centre of the point 
          //in unrotated rectangle's perspective.
        d = new Vector2d(unrotated.x - closest.x, unrotated.y - closest.y).normalise();
    
        //Rotate the d back to rotated rectangle's prespective.

        d2 = new Vector2d(d.x, d.y);

        d2 = rotatePoint(d, new Vector2d(0,0), this.angle);
    
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

        //Condition where the points are crushed by the boundary and rectangle.
        if(point.stuck){
            if(  point.x + point.radius + velocityToPoint.x >= Global.canvasWidth 
               ||point.x - point.radius + velocityToPoint.x <= 0
               ||point.y + point.radius + velocityToPoint.y >= Global.canvasHeight
               ||point.y - point.radius + velocityToPoint.y <= 0){
                    console.log("boooom");
                    return new Vector2d(Infinity,Infinity);
            }
        }
    
        return velocityToPoint;
    }

    //Return false if player reaches minimum size.
    shrink(){
        if(this.width > 20 && this.height > 60){
            this.width *= (1-Global.rectangleShrinkRate);
            this.height *= (1-Global.rectangleShrinkRate);
            return true;
        }
        return false;
    }

    stretch(bonus){
        if(this.lifeBar.recover()){
            if(bonus) this.lifeBar.recover();
            return 1;
        }
        if(this.width > Global.rectangleMaxW && this.height > Global.rectangleMaxH){
            if(bonus){
                this.width *= (1 + Global.rectangleStretchRate * Global.energyBonusRate);
                this.height *= ( 1 + Global.rectangleStretchRate * Global.energyBonusRate);
            }
            else {
                this.width *= (1 + Global.rectangleStretchRate);
                this.height *= ( 1 + Global.rectangleStretchRate);
            }
            return 2;
        }
        return 3;
    }

    bleeding(){
        return this.lifeBar.beingAttacked();
    }
}



/**
 * Rotate a point by angle(radius) around a centre point.
 */
function rotatePoint(point, centre, angle){
    let rotatedX = Math.cos(angle) * (point.x-centre.x) - Math.sin(angle) * (point.y-centre.y) + centre.x;
    let rotatedY = Math.sin(angle) * (point.x-centre.x) + Math.cos(angle) * (point.y-centre.y) + centre.y;
    return new Vector2d(rotatedX, rotatedY);
}

/**
 * Detect the collision of line and rectangle.
 */
function lineRectIntersect(rect, lineHead, lineTail){
    //Original 4 points of rectangle.
    let pointTL = new Vector2d(rect.x - rect.width/2, rect.y - rect.height/2),
        pointTR = new Vector2d(rect.x + rect.width/2, rect.y - rect.height/2),
        pointBL = new Vector2d(rect.x - rect.width/2, rect.y + rect.height/2),
        pointBR = new Vector2d(rect.x + rect.width/2, rect.y + rect.height/2); 

    //Here we rotate the line in negative angle of rectangle
    //to simulate the position in rectangle user view.
    let rotatedLineHead = rotatePoint(lineHead, new Vector2d(rect.x, rect.y), -rect.angle),
        rotatedLineTail = rotatePoint(lineTail, new Vector2d(rect.x, rect.y), -rect.angle);

    //Check intersection of 4 edges of rectangle and the rotated line segment.
    if(lineIntersect(pointTL, pointTR, rotatedLineHead, rotatedLineTail)) return true;
    if(lineIntersect(pointTL, pointBL, rotatedLineHead, rotatedLineTail)) return true;
    if(lineIntersect(pointTR, pointBR, rotatedLineHead, rotatedLineTail)) return true;
    if(lineIntersect(pointBL, pointBR, rotatedLineHead, rotatedLineTail)) return true;

    //No intersection. Return false.
    return false;
}


/**
 * Given the head, direction and length of a line, find the endpoint of the line.
 */
function getLine(x, y, target, length){
    var dx, dy, d, endPoint;
    dx = target.x- x,
    dy = target.y- y;
    //Direction of the line.
    d = new Vector2d(target.x, target.y).normalise();
    endPoint = new Vector2d(x - d.x*length, y - d.y*length);
    // endPoint.x = x - endPoint.x;
    // endPoint.y = y - endPoint.y;
    return endPoint;
}

/**
 * Generate player movement speed depends on the mouse cursor.
 */ 
function playerMovement(targetX, targetY, screenWidth, screenHeight){

    let force = 0,
        min = Math.min(screenWidth/2, screenHeight/2),
        dx = targetX - screenWidth/2,
        dy = targetY - screenHeight/2,
        
        //To make the maximum speed in x and y direction the same, we take the minimum of screen width/height 
            //as the maximum of the cursor x and y coordinate.
        dist = new Vector2d(screenWidth/2, screenHeight/2).distance(new Vector2d(Math.min(targetX, min), Math.min(targetY,min)));

    //This is to determine the speed according to the distance from middle of screen and mouse position. 
    force = dist * dt;
    if(Math.abs(dx) > min) dx = Math.sign(dx) * min;
    if(Math.abs(dy) > min) dy = Math.sign(dy) * min;

    //Calculate the velocity (next position) from one point to another with constant speed.
    let velX = (dx/dist)*force,
        velY = (dy/dist)*force; 

    var velocity = new Vector2d(velX, velY);
    // console.log(velocity);  

    return velocity;  
}

/**
 * Given the speed of the player, check collision with the boundary 
 * of the canvas return and the final speed of a player.
 */ 
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

/**
 * Find the closest point from a point to a rectangle.
 * If the point is inside the rectangle, return its own position.
 */
function closestPoint(pointX, pointY, rect){
    var closestX, closestY;
    if(pointX < (rect.x - rect.width/2)){
        closestX = rect.x - rect.width/2;
    } else if(pointX > (rect.x + rect.width/2)){
        closestX = rect.x + rect.width/2;
    } else{
        closestX = pointX;
    }

    if(pointY < (rect.y - rect.height/2)){
        closestY = rect.y - rect.height/2;
    } else if(pointY > (rect.y + rect.height/2)){
        closestY = rect.y + rect.height/2;
    } else{
        closestY = pointY;
    }
    var closest = new Vector2d(closestX, closestY);
    return closest;
}

/**
 * Generate a random position for an object on the canvas
 */
function randomPointPosition(radius){
    let x = Math.random() * (Global.canvasWidth - radius),
        y = Math.random() * (Global.canvasHeight - radius);
    return new Vector2d(x, y);
}


//Check the orientation of three points(two segments).
/**
 * If the slope of segment (p1, p2) > slope of segment (p2, q1), the orientation p1->p2->q1 will be clockwise (return 1).
 * If slope(p1, p2) < slope(p2, q1), the orientation will be anti-clockwise (return 2).
 * If slope are equal, two segments are collinear (return 0).
 */
function orientation(p1, p2, q1){
    // let slope1 = (p2.y - p1.y) / (p2.x - p1.x);
    // let slope2 = (q1.y - p2.y) / (q1.x - p2.x);
    // if(slope1 > slope2) return 1;
    // else if(slope1 < slope2) return 2;
    // return 0;

    let o = (p2.y - p1.y) * (q1.x - p2.x) - (p2.x - p1.x) * (q1.y - p2.y); 
    if(o == 0) return 0;
    if(o > 0) return 1;
    if(o < 0) return 2;
}

/**
 * Given that p1, p2, q1 are collinear, check if q1 is on segment(p1,p2).
 */
function onSegment(p1, p2, q1){
    if(q1.x >= Math.min(p1.x, p2.x) && q1.x <= Math.max(p1.x, p2.x)
    && q1.y >= Math.min(p1.y, p2.y) && q1.y <= Math.max(p1.y, p2.y)){
        return true;
    }
    return false;
}

/**
 * Check intersection for segment (p1, p2) and (q1, q2).
 * Intersection happens in 2 cases:
 * 1: orientations of one segment and two end points of another segment are different, and vice versa.
 * 2: one point of a segment is inside another segment when two segments are collinear.
 */
function lineIntersect(p1, p2, q1, q2){
    let op1 = orientation(p1, p2, q1),
        op2 = orientation(p1, p2, q2),
        oq1 = orientation(q1, q2, p1),
        oq2 = orientation(q1, q2, p2);
    
    //Case 1
    if(op1 != op2 && oq1 != oq2) return true;

    //Case 2
    //q1 lies on segment (p1, p2)
    if(op1 == 0 && (p1, p2, q1)) return true;

    //q2 lies on segment (p1, p2)
    if(op2 == 0 && onSegment(p1, p2, q2)) return true;

    //p1 lies on segment (q1, q2)
    if(oq1 == 0 && onSegment(q1, q2, p1)) return true;

    //p2 lies on segment (q1, q2)
    if(oq2 == 0 && onSegment(q1, q2, p2)) return true;

    return false;
}


module.exports = {
    gamePoint:gamePoint,
    gameNeedle:gameNeedle,
    playerLine:playerLine,
    playerRect:playerRect,
    playerCir:playerCir
}; 

