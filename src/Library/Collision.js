var Vector2d = require('./Vector.js');  

/**
 * Rotate a point by angle(radius) around a centre point.
 */
function rotatePoint(point, centre, angle){
    let rotatedX = Math.cos(angle) * (point.x-centre.x) - Math.sin(angle) * (point.y-centre.y) + centre.x;
    let rotatedY = Math.sin(angle) * (point.x-centre.x) + Math.cos(angle) * (point.y-centre.y) + centre.y;
    return new Vector2d(rotatedX, rotatedY);
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
 * Detect the collision of line and circle.
 */
function lineCirIntersect(cir, lineHead, lineTail){
    var lineDist = new Vector2d(lineHead.x - lineTail.x, lineHead.y - lineTail.y);
    var centreToLHead = new Vector2d(cir.x - lineTail.x, cir.y - lineTail.y);
    var lineDistSquare = lineDist.dot(lineDist);

    // Find the circle centre projected onto the line.   
    // Assume that projection of the circle centre onto the line
    // will be on line.endPoint + t(lineHead - line.endPoint).
    var t = (lineDist.dot(centreToLHead)) / lineDistSquare;
    var projection = lineTail.add(lineDist.multiply(t));
    //Check if projection lies inside the segment
    if(onSegment(lineHead, lineTail, projection)){
        if(projection.distance(new Vector2d(cir.x, cir.y)) <= cir.radius){
            return true;
        }
    }
    //Handle the case where the projection is not on the segment but one of 
    //the segment end still in the circle.
    if(lineHead.distance(new Vector2d(cir.x, cir.y)) <= cir.radius) return true;
    if(lineTail.distance(new Vector2d(cir.x, cir.y)) <= cir.radius) return true;
    
    return false;
}

function RectCirIntersect(rect, circleCentre, radius){

    //Rotate the circle coordinate in negative angle of the rectangle
    //to assume tht rectangle axis is parallel to the x axis to perform collision detection.
    let unrotatedCircleCentre = rotatePoint(circleCentre, new Vector2d(rect.x, rect.y), -rect.angle);
    
    //Calculate the x and y coordinate which is the closest point on rectangle from the centre of the circle.
    //console.log(circle.x);
    let closest = closestPoint(unrotatedCircleCentre.x, unrotatedCircleCentre.y, rect);

    let dist = closest.distance(unrotatedCircleCentre);
    if(dist < radius) return true; 
    else return false;
}

function collisionRectangles(self, opposite){
    let oppCentre = new Vector2d(opposite.x, opposite.y);

    //Only check collision detection if the distance of two centres are close.
    if(new Vector2d(self.x, self.y).distance(oppCentre) 
       < Math.max(self.width, self.height) + Math.max(opposite.width, opposite.height)){
        
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
        if(lineRectIntersect(self, rotatedOppTL, rotatedOppTR)) return true;
        if(lineRectIntersect(self, rotatedOppTR, rotatedOppBR)) return true;
        if(lineRectIntersect(self, rotatedOppBR, rotatedOppBL)) return true;
        if(lineRectIntersect(self, rotatedOppBL, rotatedOppTL)) return true;
    }
    return false;
}



module.exports = {
    rotatePoint:rotatePoint,
    closestPoint:closestPoint,
    lineIntersect:lineIntersect,
    lineRectIntersect:lineRectIntersect,
    lineCirIntersect:lineCirIntersect,
    RectCirIntersect:RectCirIntersect,
    collisionRectangles:collisionRectangles,
}; 