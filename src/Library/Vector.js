class Vector2d{
    constructor(x, y){
        this.x = x;
        this.y = y;
    }

    add(vector){
        this.x += vector.x;
        this.y += vector.y;
    }
    distance(vector){
        let dx = this.x - vector.x,
            dy = this.y - vector.y;
        return Math.sqrt(dx*dx + dy*dy);
    }
    normalise(){
        var dist = this.distance(new Vector2d(0,0));
        this.x = this.x / dist;
        this.y = this.y / dist;
        return this;
    }
    dot(vector){
        return this.x * vector.x + this.y * vector.y;
    }
}

module.exports = Vector2d;
