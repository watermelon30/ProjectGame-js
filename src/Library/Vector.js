/**
 * Vector class for creating 2D vector.
 */
class Vector2d
{
    constructor(x, y)
    {
        this.x = x;
        this.y = y;
    }

    // Adding another 2d vector.
    add(vector)
    {
        return new Vector2d(this.x + vector.x, this.y + vector.y);
    }

    // Multiplying a number.
    multiply(scaler)
    {
        return new Vector2d(this.x * scaler, this.y * scaler);
    }

    // Calculate the distance between two vectors.
    distance(vector)
    {
        let dx = this.x - vector.x,
            dy = this.y - vector.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // Vector normalisation.
    normalise()
    {
        var dist = this.distance(new Vector2d(0, 0));
        this.x = this.x / dist;
        this.y = this.y / dist;
        return this;
    }

    // Calculating the dot product of two vectors.
    dot(vector)
    {
        return this.x * vector.x + this.y * vector.y;
    }
}

export { Vector2d }