// Requiring shared library.
import { Vector2d } from './Vector.js';
import { CONFIG } from './Global.js';
import * as COLLISION from './Collision.js';

var dt = 1.0 / CONFIG.fps // Delta time.

// Base class of game objects in the canvas.
class GameObject
{
    constructor(x, y, color)
    {
        // socket.id
        this.color = color;
        this.x = x;
        this.y = y;
    }
}

// Health Amount for rectangle: 2000, Circle: 1500, Line: 1000
class LifeBar
{
    constructor(lifeAmount)
    {
        this.life = lifeAmount;
        this.maximum = lifeAmount;
    }
    /**
     * Reduce health amount.
     * @returns: true if health amount is still > 0, false otherwise.
     */
    beingAttacked()
    {
        this.life--;
        if (this.life < 0) return false;
        else return true;
    }

    /**
     * Increase health amount.
     * @returns: true if health amount is still smaller than maximum, false otherwise.
     */
    recover()
    {
        if (this.life < this.maximum)
        {
            this.life++;
            return true;
        }
        return false;
    }
}

// Public point object.
class GamePoint extends GameObject
{
    constructor(x, y, color, radius)
    {
        super(x, y, color);
        this.radius = radius;

        // Velocity of a point object.
        this.velocity = new Vector2d(0, 0);

        this.corner = 0;

        // stuck: Check if the point has no where to go.
        this.stuck = false;
    }

    /**
     * Check if the point object is inside a player's screen.
     * @param othersScreenTL @param othersScreenBR: vectors that describe the boundaries of the player screen  
     * @returns: true if the point is inside the screen, false otherwise.
     */
    inScreen(screenTL, screenBR)
    {
        if (this.x >= screenTL.x - this.radius && this.x <= screenBR.x + this.radius)
        {
            if (this.y >= screenTL.y - this.radius && this.y <= screenBR.y + this.radius)
            {
                // Inside screen
                return true;
            }
        }
        return false;
    }

    /**
     * Calculates the new speed of a point object.
     * @param player: player (Rectangle/Line/Circle) object.
     * @returns: false if the point is crushed by a Rectangle player object. True otherwise.
     */
    newSpeed(player)
    {
        // Cannot collide with Line player.
        if (!(player instanceof PlayerLine))
        {
            if (player.collisionCircle(new Vector2d(this.x, this.y), this.radius))
            {
                // If the point touches a boundary and the shape, it is stuck.
                if (this.corner) this.stuck = true;

                // b: the extra velocity from colliding with other player object.
                let b = player.bounce(this);
                // Point being crushed. Assign new position.
                if (b.x == Infinity)
                {
                    this.respawn();
                    return false;
                }

                // Add up the extra velocity to the current velocity.
                this.velocity.x += 2 * b.x;
                this.velocity.y += 2 * b.y;

                // Assigning new speed for a point object with invalid speed value.
                if (isNaN(this.velocity.x) || isNaN(this.velocity.y))
                {
                    this.respawn();
                    return false;
                }
                return true;
            }
        }
        return true;
    }

    // Assign a new life for the point object. 
    respawn()
    {
        // Assign random valid position for the point object.
        let newPos = randomPointPosition(CONFIG.pointRadius);
        this.x = newPos.x;
        this.y = newPos.y;
        //Initialize the point attribute. 
        this.velocity = new Vector2d(0, 0);
        this.radius = CONFIG.pointRadius;
    }

    // Calculating the new position.     
    newPos()
    {
        this.stuck = false;
        // Prevent from all points stuck in a corner.
        if (this.corner > 1)
        {
            this.velocity.x = Math.random() * 15;
            this.velocity.y = Math.random() * 15;
        }
        if (this.velocity.x != 0 || this.velocity.y != 0)
        {
            this.corner = 0;

            // Bounce off the boundary when the point touches the boundary of canvas.

            // Touch right side of boundary
            if (this.x >= CONFIG.canvasWidth - this.radius)
            {
                this.x = CONFIG.canvasWidth - this.radius;
                this.velocity.x = -this.velocity.x;
                this.corner++;
            }
            // Touch left side of boundary
            else if (this.x <= this.radius)
            {
                this.x = this.radius;
                this.velocity.x = -this.velocity.x;
                this.corner++;
            }
            // Touch top of the boundary. 
            if (this.y <= this.radius)
            {
                this.y = this.radius;
                this.velocity.y = -this.velocity.y;
                this.corner++;
            }
            // Touch bottom of the boundary.
            else if (this.y >= CONFIG.canvasHeight - this.radius)
            {
                this.y = CONFIG.canvasHeight - this.radius;
                this.velocity.y = -this.velocity.y;
                this.corner++;
            }
            // Movement
            this.x += this.velocity.x;
            this.y += this.velocity.y;

            // Apply friction.
            this.velocity.x *= 0.985;
            this.velocity.y *= 0.985;

            // Force stop when velocity is small.
            if (this.velocity.distance(new Vector2d(0, 0)) < 0.2)
            {
                this.velocity.x = 0;
                this.velocity.y = 0;
            }
        }
    }

    /**
     * Shrunk if eaten by circle or line player.
     * @returns: true if the point radius is still greater than 5. false otherwise. 
     */
    shrink()
    {
        if (this.radius > 5)
        {
            this.radius--;
            return true;
        } else
        {
            this.respawn();
            return false;
        }
    }
}

// Needle object owned by a Line player.
class GameNeedle extends GameObject
{
    constructor(x, y, color, length, direction, speed)
    {
        super(x, y, color);
        // Make length of a needle shorter than the line player.
        this.length = length * 0.6;
        this.direction = direction;
        // Adding speed to the direction variable.
        this.direction.x *= speed;
        this.direction.y *= speed;
        this.endPoint = getLine(this.x, this.y, this.direction, this.length);
    }

    /**
     * Check if the needle object is inside a player's screen.
     * @param othersScreenTL @param othersScreenBR: vectors that describe the boundaries of the player screen  
     * @returns: true if the needle is inside the screen, false otherwise.
     */
    inScreen(screenTL, screenBR)
    {
        if (this.x >= screenTL.x - this.length && this.x <= screenBR.x + this.length)
        {
            if (this.y >= screenTL.y - this.length && this.y <= screenBR.y + this.length)
            {
                return true;
            }
        }
        return false;
    }

    // Assigning new position.
    newPos()
    {
        // Speed has been added in the direction vector.
        this.x += this.direction.x;
        this.y += this.direction.y;
        this.endPoint = getLine(this.x, this.y, this.direction, this.length);
    }

    // Check intersection with other players.
    /**
     * @param shapes: player object.
     * @returns: true if the intersected with player object. false it not. 
     */
    touchOthers(shapes)
    {
        // Calling collision function depends on the type of player.
        if (shapes instanceof PlayerCir)
        {
            return shapes.collisionCircle(new Vector2d(this.x, this.y), 0)
        }
        if (shapes instanceof PlayerRect)
        {
            return shapes.withLineIntersect(this);
        }
        return shapes.touchLine(this);
    }
}

// Energy object owned by Circle player.
class GameEnergy extends GameObject
{
    constructor(x, y, color, direction)
    {
        super(x, y, color);
        this.radius = 10;
        this.direction = direction;
        this.velocity = new Vector2d(this.direction.x * 5, this.direction.y * 5);
        this.absorbed = false;
        this.absorbingTime = 0;
    }
    /**
     * Check if the energy object is inside a player's screen.
     * @param othersScreenTL @param othersScreenBR: vectors that describe the boundaries of the player screen  
     * @returns: true if the energy is inside the screen, false otherwise.
     */
    inScreen(screenTL, screenBR)
    {
        if (this.x >= screenTL.x - this.radius && this.x <= screenBR.x + this.radius)
        {
            if (this.y >= screenTL.y - this.radius && this.y <= screenBR.y + this.radius)
            {
                return true;
            }
        }
        return false;
    }

    // Assigning new position
    newPos()
    {
        if (this.velocity.x != 0 || this.velocity.y != 0)
        {
            // Bounce off the when the point touches the boundary of canvas.

            // Touch right side of boundary
            if (this.x >= CONFIG.canvasWidth - this.radius)
            {
                this.x = CONFIG.canvasWidth - this.radius;
                this.velocity.x = -this.velocity.x;
            }
            // Touch left side of boundary
            else if (this.x <= this.radius)
            {
                this.x = this.radius;
                this.velocity.x = -this.velocity.x;
            }
            // Touch top of the boundary. 
            if (this.y <= this.radius)
            {
                this.y = this.radius;
                this.velocity.y = -this.velocity.y;
            }
            // Touch bottom of the boundary.
            else if (this.y >= CONFIG.canvasHeight - this.radius)
            {
                this.y = CONFIG.canvasHeight - this.radius;
                this.velocity.y = -this.velocity.y;
            }
            this.x += this.velocity.x;
            this.y += this.velocity.y;

            // Apply friction.
            this.velocity.x *= 0.985;
            this.velocity.y *= 0.985;

            // Force stop when velocity is small.
            if (this.velocity.distance(new Vector2d(0, 0)) < 0.2)
            {
                this.velocity.x = 0;
                this.velocity.y = 0;
            }
        }
    }

    /**
     * Check collision with other player. If collided, set absorbed to true.
     * @param player: player object.
     * @returns: true if absorbed is true, false otherwise.
     */
    absorb(player)
    {
        if (!this.absorbed)
        {
            if (player instanceof PlayerLine)
            {
                if (COLLISION.lineCirIntersect(this, new Vector2d(player.x, player.y), player.endPoint))
                {
                    this.absorbed = true;
                }
            }
            else
            {
                if (player.collisionCircle(new Vector2d(this.x, this.y), this.radius))
                {
                    this.absorbed = true;
                }
            }
        }
        return this.absorbed;
    }

    /**
     * Shrink the energy object.
     * Will only be called when absorbed == true
     * @returns: true if shrinking effect is still going, false otherwise
     */
    shrink()
    {
        if (this.radius > 0)
        {
            this.radius -= 1;
        }
        // The absorbing timer is to allow longer damages/heals for a player who touched the energy object.
        if (this.absorbingTime < 20)
        {
            this.absorbingTime++;
            return true;
        }
        return false;
    }
}

// Base class for player object.
class GamePlayer
{
    constructor(id, x, y, color, screenHeight, screenWidth, team)
    {
        this.id = id;
        this.x = x;
        this.y = y;
        this.color = color;
        this.screenHeight = screenHeight;
        this.screenWidth = screenWidth;
        this.team = team;
        this.id = id;
        this.target = new Vector2d(0, 0);
    }
}

// Circle player object class.
class PlayerCir extends GamePlayer
{
    constructor(id, x, y, color, screenWidth, screenHeight, radius, team)
    {
        super(id, x, y, color, screenHeight, screenWidth, team);
        this.type = "Circle";

        this.radius = radius;
        this.alpha = 1.0;

        //playerVelo is the actual velocity of a player after boundary checking.
        this.playerVelo = new Vector2d(0, 0);

        //velocity is the initial given velocity.
        this.velocity = new Vector2d(0, 0);
        //screenTL/BR: Player screen boundary vector.
        this.screenTL = new Vector2d(x - screenWidth / 2, y - screenHeight / 2);
        this.screenBR = new Vector2d(x + screenWidth / 2, y + screenHeight / 2);
        this.invisibleTimer = 10;
        this.invisible = false;
        this.lifeBar = new LifeBar(CONFIG.circleLifeAmount);
        this.energyArray = [];
    }

    /**
     * Check if the circle object is inside other player's screen.
     * @param othersScreenTL @param othersScreenBR: vectors that describe the boundaries of the player screen  
     * @returns: true if the circle is inside the screen, false otherwise.
     */
    inScreen(othersScreenTL, othersScreenBR)
    {
        if (this.x >= othersScreenTL.x - this.radius && this.x <= othersScreenBR.x + this.radius)
        {
            if (this.y >= othersScreenTL.y - this.radius && this.y <= othersScreenBR.y + this.radius)
            {
                return true;
            }
        }
        return false;
    }

    /**
     * Assigning new position for Circle. 
     */
    newPos()
    {
        this.velocity = playerMovement(this.target.x, this.target.y, this.screenWidth, this.screenHeight);
        this.playerVelo = checkBound(this.x, this.y, this.velocity, this.radius);
        this.x += this.playerVelo.x;
        this.y += this.playerVelo.y;
        //Setting new screen boundary vectors
        this.screenTL.x = this.x - this.screenWidth / 2;
        this.screenTL.y = this.y - this.screenHeight / 2;
        this.screenBR.x = this.x + this.screenWidth / 2;
        this.screenBR.y = this.y + this.screenHeight / 2;

        //Invisible mode
        if (this.invisible == true)
        {
            this.alpha = 0.5;
            //If invisibleTimer is 0, disable invisible mode.
            if (this.invisibleTimer >= 0.02)
            {
                this.invisibleTimer -= 0.02;
            }
            else
            {
                this.invisible = false;
                this.invisibleTimer = 0;
            }
        }
        else
        {
            //Restart invisibleTimer
            this.alpha = 1;

            //Fueling invisible timer if the maximum is not reached yet.
            if (this.invisibleTimer < CONFIG.circleMaxInvMode - 0.01)
            {
                this.invisibleTimer += 0.01;
            }
        }
    }

    /**
     * When the circle player covers points under its area in invisible mode, points are eaten.
     * Should only be called in invisible mode
     * @param centreVector: vector that represents the centre of the point.
     * @returns: true if point is inside the circle, false otherwise.
     */
    eatPoint(centreVector)
    {
        if (centreVector.distance(new Vector2d(this.x, this.y)) <= this.radius)
        {
            return true;
        }
        return false;
    }

    /**
     * Collision detection with circle object.
     * @param centreVector: vector that represents the centre of the circle.
     * @param radius: radius of the circle.
     * @returns: true if collided, false otherwise.
     */
    collisionCircle(centreVector, radius)
    {
        // Collision == true if the distance from the centre of one circle 
        // to the centre of another circle is smaller than the sum of two circles' radius.
        if (centreVector.distance(new Vector2d(this.x, this.y)) <= radius + this.radius)
        {
            return true;
        }
        return false;
    }

    /**
     * Collision detection with line object.
     * @param line: line object.
     * @returns: true if collided, false otherwise.
     */
    withLineIntersect(line)
    {
        return COLLISION.lineCirIntersect(this, new Vector2d(line.x, line.y), line.endPoint);
    }

    /**
     * Assign new speed to the point objects when collision detected.
     * @param point: public point object.
     * @returns: vector that specifies the new speed for the point object.
     */
    bounce(point)
    {
        var d, velocityVector, velocityToPoint, c, l;

        // c: To control the force applied onto the point.
        c = 0.8;

        // d: Normalized direction vector calculated by getting the centre of a player to the centre of a point.
        d = new Vector2d(point.x - this.x, point.y - this.y).normalise();

        // Velocity vector of the difference of velocities between player and point.
        velocityVector = new Vector2d(this.playerVelo.x - point.velocity.x, this.playerVelo.y - point.velocity.y);

        // l: Length of velocityVector projected onto direction d.
        l = velocityVector.dot(d);

        // Assign l to be 0 to prevent situation where angle of velocityVector and d > 90,
        // which will make the point go to the same direction with player.
        if (l < 0)
        {
            l = 0;
        }

        // Assign velocity in the direction from circle to point.
        velocityToPoint = new Vector2d(d.x * l * c, d.y * l * c);

        return velocityToPoint;
    }


    /**
     * Return false if player reaches minimum size.
     * @param amount: float that specifies the amount of shrinking. (1 means default rate). 
     * @returns: true if valid shrink, false otherwise.
     */
    shrink(amount)
    {
        if (this.radius > CONFIG.circleMinR)
        {
            this.radius *= (1 - CONFIG.circleShrinkRate * amount);
            return true;
        }
        return false;
    }

    /**
     * Stretch the circle size if hasn't reached maximum.
     * @returns: integer specifying the type of stretch.
     */
    stretch()
    {
        if (this.lifeBar.recover())
        {
            // return 1 as recovering health amount
            return 1;
        }
        if (this.radius < CONFIG.circleMaxR)
        {
            this.radius *= (1 + CONFIG.circleStretchRate);
            // return 2 as gaining mass.
            return 2;
        }
        // return 3 as no valid stretch.
        return 3;
    }

    /**
     * Called when circle reaches minimum size and is being attacked.
     * @returns: true if a player is still alive, false if player died.
     */
    bleeding()
    {
        return this.lifeBar.beingAttacked();
    }

    /**
     * Function to enable invisible mode.
     */
    unseen()
    {
        // Can only enable invisible with timer greater than 5 seconds
        if (this.invisibleTimer > 5)
        {
            this.invisible = true;
        }
        // console.log("Cannot be invisible"); //DEBUG
    }

    /**
     * Emit energy object for feeding teammates/attacking enemy.
     */
    emit()
    {
        if (this.radius > CONFIG.circleMinR)
        {
            let direction = this.playerVelo.normalise(),
                energyX = this.x + direction.x * this.radius,
                energyY = this.y + direction.y * this.radius;

            // Adding an energy object.
            this.energyArray.push(new GameEnergy(energyX, energyY, this.color, direction));

            // Shrink the circle
            this.radius--;
        }
    }

    /**
     * Clean energy that are out of bound by removing from the array. Will wait for garbage collection.
     * @param indexToClear: array that contains indexes of energy objects to be cleaned. 
     */
    cleanEnergy(indexToClear)
    {
        indexToClear.forEach(index =>
        {
            this.energyArray.splice(index, 1);
        });
    }
}

// Line player object class.
class PlayerLine extends GamePlayer
{
    constructor(id, x, y, color, screenWidth, screenHeight, length, team)
    {
        super(id, x, y, color, screenHeight, screenWidth, team);
        this.type = "Line";
        this.length = length;
        this.direction = new Vector2d(1, 1);
        this.needleArray = [];
        this.playerVelo = new Vector2d(0, 0);
        this.velocity = new Vector2d(0, 0);
        this.screenTL = new Vector2d(x - screenWidth / 2, y - screenHeight / 2);
        this.screenBR = new Vector2d(x + screenWidth / 2, y + screenHeight / 2);
        this.endPoint = getLine(this.x, this.y, this.direction, this.length);
        this.grid = new Vector2d(this.x % CONFIG.gridGap, this.y % CONFIG.gridGap);
        this.emit = false;
        this.lifeBar = new LifeBar(CONFIG.lineLifeAmount);
        this.ammo = 100;

        // Gathering ammo (true) OR increase size/life (false) when points eaten.
        this.ammoMode = false;
    }

    /**
     * Check if the line is inside other player's screen.
     * @param othersScreenTL @param othersScreenBR: vectors that describe the boundaries of the player screen  
     * @returns: true if the line is inside the screen, false otherwise.
     */
    inScreen(othersScreenTL, othersScreenBR)
    {
        if (this.x >= othersScreenTL.x - this.length && this.x <= othersScreenBR.x + this.length)
        {
            if (this.y >= othersScreenTL.y - this.length && this.y <= othersScreenBR.y + this.length)
            {
                return true;
            }
        }
        return false;
    }

    /**
     * Assign new position for the Line object and handle needle emission
     * @returns: false when a player tries to emit needle without ammo. Otherwise, return true.
     */
    newPos()
    {
        this.velocity = playerMovement(this.target.x, this.target.y, this.screenWidth, this.screenHeight);

        // Get a copy of the velocity vector to be the direction vector if velocity is not 0.
        // If the velocity is 0, the line will be heading toward the same direction as when the velocity was not 0.
        if (this.velocity.distance(new Vector2d(0, 0)) != 0)
        {
            this.direction = Object.assign({}, this.velocity);
        }

        this.playerVelo = checkBound(this.x, this.y, this.velocity, 0);
        this.x += this.playerVelo.x;
        this.y += this.playerVelo.y;
        // Finding the end point of the line.
        this.endPoint = getLine(this.x, this.y, this.direction, this.length);

        this.screenTL.x = this.x - this.screenWidth / 2;
        this.screenTL.y = this.y - this.screenHeight / 2;
        this.screenBR.x = this.x + this.screenWidth / 2;
        this.screenBR.y = this.y + this.screenHeight / 2;
        this.grid.x = this.x % CONFIG.gridGap;
        this.grid.y = this.y % CONFIG.gridGap;

        if (this.emit)
        {
            // Emit needle when ammo != 0
            if (this.ammo > 0)
            {
                this.needleArray.push(new GameNeedle(this.x, this.y, this.color, this.length, this.velocity.normalise(), 8));
                this.ammo--;
            }
            else return false;
        }
        return true;
    }

    /**
     * Check intersection with other shapes (excluding Line)
     * @param shapes: Rectangle or Circle player object 
     * @returns: true if collided, false if not.
     */
    touchOthers(shapes)
    {
        return shapes.withLineIntersect(this);
    }

    /**
     * Check the collision with public point object.
     * Line player object can only eat a point if the head touches the point.
     * @param pointCentre: centre of the point.
     * @param radius: radius of the point.
     * @returns: true if collided, false if not.
     */
    eatPoint(pointCentre, radius)
    {
        let lineHead = new Vector2d(this.x, this.y);
        if (lineHead.distance(pointCentre) <= radius)
        {
            return true;
        }
        return false;
    }

    /**
     * Check the line segment intersection.
     * @param opposite: The Line player object to check with.
     * @returns: true if intersected, false if not.
     */
    touchLine(opposite)
    {
        let thisHead = new Vector2d(this.x, this.y),
            oppHead = new Vector2d(opposite.x, opposite.y);
        return COLLISION.lineIntersect(thisHead, this.endPoint, oppHead, opposite.endPoint);
    }

    /**
     * Shrinking the line player object.
     * @param amount:To specify the extra amount of shrinking.
     * @returns: true if shrinking successfully, false otherwise. 
     */
    shrink(amount)
    {
        if (this.length > CONFIG.lineMinLength)
        {
            this.length *= (1 - CONFIG.lineShrinkRate * amount);
            return true;
        }

        return false;
    }

    /**
     * Shrinking the line player object.
     * @param bonus:To specify the extra amount of stretching.
     * bonus will only be given when absorbing energy from teammate Circle.
     * @returns: integer specifying the type of stretch
     */
    stretch(bonus)
    {
        if (!this.ammoMode)
        {
            if (this.lifeBar.recover())
            {
                // Double the recover amount.
                if (bonus > 1) this.lifeBar.recover();

                // Return 1 as increasing health amount.
                return 1;
            }
            if (this.length < CONFIG.lineMaxLength)
            {
                this.length *= (1 + CONFIG.lineStretchRate * bonus);

                // Return 2 as increasing length of the Line.
                return 2;
            }
        }
        else
        {
            this.ammo += CONFIG.energyBonusRate * CONFIG.ammoReload * bonus;
            if (this.ammo > CONFIG.lineMaxAmmo) this.ammo = CONFIG.lineMaxAmmo;

            // Return 4 as loading ammo.
            return 4;
        }
        // Return 3 as stretching nothing.
        return 3;
    }

    /**
     * Called when line reaches minimum size.
     * @returns: true if player is still alive, false if player died.
     */
    bleeding()
    {
        return this.lifeBar.beingAttacked();
    }

    /**
     * Clean needles that are out of canvas bound.
     * @param indexToClear: array containing needle indexes that is to be cleaned.
     */
    cleanNeedle(indexToClear)
    {
        indexToClear.forEach(index =>
        {
            this.needleArray.splice(index, 1);
        });
    };
}

//Rectangle player object class.
class PlayerRect extends GamePlayer
{
    constructor(id, x, y, color, screenWidth, screenHeight, width, height, team)
    {
        super(id, x, y, color, screenHeight, screenWidth, team);
        this.type = "Rectangle";
        this.width = width;
        this.height = height;
        this.angle = 0;
        this.moveAngle = 0;
        this.force = 3;
        this.playerVelo = new Vector2d(0, 0);
        this.screenTL = new Vector2d(x - screenWidth / 2, y - screenHeight / 2);
        this.screenBR = new Vector2d(x + screenWidth / 2, y + screenHeight / 2);
        this.lifeBar = new LifeBar(CONFIG.rectangleLifeAmount);
    }

    /**
     * Check if the rectangle is inside other player's screen.
     * @param othersScreenTL @param othersScreenBR: vectors that describe the boundaries of the player screen  
     * @returns: true if the rectangle is inside the screen, false otherwise.
     */
    inScreen(othersScreenTL, othersScreenBR)
    {
        // furthest: Furthest distance from rectangle centre to the edge of rectangle.
        var furthest = Math.sqrt(this.height * this.height + this.width * this.width);

        // Possible to return true if a rectangle is not in the screen, but will definitely return true if it is.
        if (this.x >= othersScreenTL.x - furthest && this.x <= othersScreenBR.x + furthest)
        {
            if (this.y >= othersScreenTL.y - furthest && this.y <= othersScreenBR.y + furthest)
            {
                return true;
            }
        }
        return false;
    }

    // Assign new position for the rectangle.
    newPos()
    {
        this.angle += this.moveAngle * Math.PI / 180;
        this.velocity = playerMovement(this.target.x, this.target.y, this.screenWidth, this.screenHeight);
        this.playerVelo = checkBound(this.x, this.y, this.velocity, 0);
        this.x += this.playerVelo.x;
        this.y += this.playerVelo.y;
        this.screenTL.x = this.x - this.screenWidth / 2;
        this.screenTL.y = this.y - this.screenHeight / 2;
        this.screenBR.x = this.x + this.screenWidth / 2;
        this.screenBR.y = this.y + this.screenHeight / 2;
    }

    /**
     * Collision detection with circle object.
     * @param circleCentre: vector that represents the centre of the circle. 
     * @param radius: radius of the circle. 
     * @returns: true if collided, false otherwise.
     */
    collisionCircle(circleCentre, radius)
    {
        return COLLISION.RectCirIntersect(this, circleCentre, radius);
    }

    /**
     * Collision detection with rectangle object.
     * @param opposite: Other rectangle object.
     * @returns: true if collided, false otherwise.
     */
    collisionRectangle(opposite)
    {
        return COLLISION.collisionRectangles(this, opposite);
    }

    /**
     * Collision detection with line object.
     * @param line: Line object.
     * @returns: true if collided, false otherwise.
     */
    withLineIntersect(line)
    {
        return COLLISION.lineRectIntersect(this, new Vector2d(line.x, line.y), line.endPoint);
    }

    /**
     * calculating the new velocity for a point object when rectangle collided with it.
     * @param point: point object to be assigned a new speed.
     * @returns: velocity vector assigned to the point object. If a point is going to be crushed, return a 
     * vector with infinity x and y.
     */
    bounce(point)
    {
        var unrotated, closest;
        var d, d2;
        var rotateRadius, rotateD, rotateVelo, moveAngle, preX, preY;
        var velocityVector, velocityToPoint, c, l;

        // c: To control the force applied onto the point.
        c = 1;

        // unrotated: Rotate the point coordinate with -this.angle to get the exact position in an unrotated rectangle's perspective.
        unrotated = COLLISION.rotatePoint(point, new Vector2d(this.x, this.y), -this.angle);

        // closest: closest point from the point object centre to the rectangle.
        closest = COLLISION.closestPoint(unrotated.x, unrotated.y, this);


        // d: direction vector from the closest point on the rectangle to the centre of the unrotated point object
        // in unrotated rectangle's perspective.
        d = new Vector2d(unrotated.x - closest.x, unrotated.y - closest.y).normalise();

        // Take a copy of d to d2
        d2 = Object.assign({}, d);
        // d2 = new Vector2d(d.x, d.y);

        // d2: Rotate the d back to rotated rectangle's prespective.
        d2 = COLLISION.rotatePoint(d, new Vector2d(0, 0), this.angle);

        // rotateRadius: the radius from closest point on rectangle to the centre of rectangle.
        rotateRadius = new Vector2d(closest.x - this.x, closest.y - this.y);

        // Convert degree to radian.
        moveAngle = this.moveAngle * Math.PI / 180;

        rotateD = new Vector2d(0, 0);
        rotateVelo = new Vector2d(0, 0);

        // Finding the rotation velocity
        if (moveAngle != 0)
        {
            // Previous X and Y position of the closest point before rotation (only calculate when rotation exists)
            preX = Math.cos(-moveAngle) * (rotateRadius.x) - Math.sin(-moveAngle) * (rotateRadius.y) + this.x;
            preY = Math.sin(-moveAngle) * (rotateRadius.x) + Math.cos(-moveAngle) * (rotateRadius.y) + this.y;

            // Rotation direction in unrotated rectangle's perspective.
            // Here I assume the distance from previous point to the current point to also be the rotation velocity for simplicity.
            rotateD = new Vector2d(closest.x - preX, closest.y - preY);

            // Rotation velocity in rotated rectangle's perspective.
            rotateVelo.x = Math.cos(this.angle) * rotateD.x - Math.sin(this.angle) * rotateD.y;
            rotateVelo.y = Math.sin(this.angle) * rotateD.x + Math.cos(this.angle) * rotateD.y;
            // console.log(rotateVelo.x + ", " + rotateVelo.y);
        }

        // Combine rotation velocity, player velocity and point velocity.
        velocityVector = new Vector2d(this.playerVelo.x - point.velocity.x + rotateVelo.x,
            this.playerVelo.y - point.velocity.y + rotateVelo.y);

        // l: length of velocityVector projected onto direction d2.
        l = d2.dot(velocityVector);

        // Prevent situation where angle of velocityVector and d > 90,
        // which makes the point go toward the same direction of player.
        if (l < 0) l = 0;

        // Final velocity to the point.
        velocityToPoint = new Vector2d(d2.x * l * c, d2.y * l * c);

        // Condition where the points are going to be crushed by the boundary and rectangle.
        if (point.stuck)
        {
            // Check if a point is going to be crushed by a boundary.
            if (point.x + point.radius + velocityToPoint.x >= CONFIG.canvasWidth
                || point.x - point.radius + velocityToPoint.x <= 0
                || point.y + point.radius + velocityToPoint.y >= CONFIG.canvasHeight
                || point.y - point.radius + velocityToPoint.y <= 0)
            {
                // console.log("boooom");
                return new Vector2d(Infinity, Infinity);
            }
        }
        return velocityToPoint;
    }

    /**
     * Shrink the rectangle player object
     * @param amount: float that specifies the amount of shrink.
     * @returns: true if valid shrink, false otherwise. 
     */
    shrink(amount)
    {
        // Only shrink if the rectangle is still greater than minimum.
        if (this.width > CONFIG.rectangleMinW && this.height > CONFIG.rectangleMinH)
        {
            this.width *= (1 - CONFIG.rectangleShrinkRate * amount);
            this.height *= (1 - CONFIG.rectangleShrinkRate * amount);
            return true;
        }
        return false;
    }


    /**
     * Stretch the rectangle player object.
     * @param bonus: float that specifies the amount of stretch.
     * @returns: integer that specifies the type of stretch.
     */
    stretch(bonus)
    {
        if (this.lifeBar.recover())
        {
            //Double the recover if bonus.
            if (bonus > 1) this.lifeBar.recover();
            //return 1 if increasing the health amount.
            return 1;
        }
        if (this.width < CONFIG.rectangleMaxW && this.height < CONFIG.rectangleMaxH)
        {
            this.width *= (1 + CONFIG.rectangleStretchRate * bonus);
            this.height *= (1 + CONFIG.rectangleStretchRate * bonus);
            //return 2 if gaining the rectangle mass.
            return 2;
        }
        //Return 3 if no valid stretching.
        return 3;
    }

    /**
     * Reduce the health amount if the rectangle is at minimum mass.
     * @returns: true if the player is still alive, false if player died.
     */
    bleeding()
    {
        return this.lifeBar.beingAttacked();
    }
}

/**
 * Finding the end point of the line given the needed parameters.
 * @param x, @param y: x and y coordinate of the head of the line.
 * @param target: The position of the user mouse cursor.
 * @param length: Expected length of the line.
 * @returns: the vector that represents the end point of the line.
 */
function getLine(x, y, target, length)
{
    let d, endPoint;

    // Direction vector of the line.
    d = new Vector2d(target.x, target.y).normalise();

    // The end point found here will not make the length of the line to be expected length, but could still work.
    // TODO: Getting expected length of line.
    endPoint = new Vector2d(x - d.x * length, y - d.y * length);
    // endPoint.x = x - endPoint.x;
    // endPoint.y = y - endPoint.y;
    return endPoint;
}

/**
 * Generate player movement speed depends on the distance with mouse cursor.
 * @param targetX @param targetY: the position of the mouse cursor in the screen coordinate
 * @param screenHeight @param screenWidth: the width and height of the player screen.
 */
function playerMovement(targetX, targetY, screenWidth, screenHeight)
{

    let force = 0,

        // To make the maximum speed in x and y direction the same, we take the minimum of screen width/height
        // divided by 2 as the maximum length from mouse position to the centre of the screen.
        min = Math.min(screenWidth / 2, screenHeight / 2),

        dx = targetX - screenWidth / 2,
        dy = targetY - screenHeight / 2,

        // Finding the distance from screen centre to the mouse cursor position (or the maximum point).
        dist = new Vector2d(screenWidth / 2, screenHeight / 2).distance(new Vector2d(Math.min(targetX, min), Math.min(targetY, min)));

    // This is to determine the speed according to the distance from middle of screen and mouse position.
    // TODO: Assigning different speeds for different type of player object.
    force = dist * dt;

    // Limiting the maximum distance of the mouse position to centre of the screen.
    if (Math.abs(dx) > min) dx = Math.sign(dx) * min;
    if (Math.abs(dy) > min) dy = Math.sign(dy) * min;

    // Calculate the velocity for the object.
    let velX = (dx / dist) * force,
        velY = (dy / dist) * force;

    let velocity = new Vector2d(velX, velY);
    // console.log(velocity);  

    return velocity;
}

/**
 * Given the speed of the player, check collision with the boundary 
 * of the canvas and return the final speed of a player.
 * @param playerX @param playerY: Position of the player object.
 * @param velocity: Expected velocity of the player object.
 * @param limit: Minimum distance from the centre of the player to the boundary. (I.e. radius for circle object)
 * @returns: The final velocity assigned to the payer object.
 */
function checkBound(playerX, playerY, velocity, limit)
{
    let playerVelo = new Vector2d(0, 0);

    // Velocity in x direction
    // Check if the player will exceed the canvas bound in new position.
    if (playerX + velocity.x <= CONFIG.canvasWidth - limit)
    {
        if (playerX + velocity.x >= 0 + limit)
        {
            playerVelo.x = velocity.x;
        }
    }

    // Velocity in y direction
    // Check if the player will exceed the canvas bound in new position.
    if (playerY + velocity.y <= CONFIG.canvasHeight - limit)
    {
        if (playerY + velocity.y >= 0 + limit)
        {
            playerVelo.y = velocity.y;
        }
    }
    // If player will exceed the canvas boundary with the expected velocity, assign is with 0.
    return playerVelo;
}

/**
 * Generate a random valid position for a point object on the canvas
 * @param radius: radius of the point object.
 * @returns: The new position for the point object.
 */
function randomPointPosition(radius)
{
    let x = Math.random() * (CONFIG.canvasWidth - radius),
        y = Math.random() * (CONFIG.canvasHeight - radius);
    return new Vector2d(x, y);
}

export { GamePoint, PlayerLine, PlayerRect, PlayerCir }