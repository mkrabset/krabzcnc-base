export class Vector2d {
    readonly x: number;
    readonly y: number;

    public constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    public plus(v: Vector2d): Vector2d {
        return new Vector2d(this.x + v.x, this.y + v.y);
    }

    public minus(v: Vector2d): Vector2d {
        return new Vector2d(this.x - v.x, this.y - v.y);
    }

    public dot(v: Vector2d): number {
        return this.x * v.x + this.y * v.y;
    }

    /**
     * Cross product.
     * Note: if (a x b) is positive, then the rotation from a to b is CCW
     */
    public cross(v: Vector2d): number {
        return this.x * v.y - this.y * v.x;
    }

    public lengthSquared(): number {
        return this.x * this.x + this.y * this.y;
    }

    public length(): number {
        return Math.sqrt(this.lengthSquared());
    }

    public static distSquared(p1: Vector2d, p2: Vector2d): number {
        return p2.minus(p1).lengthSquared();
    }

    public static dist(p1: Vector2d, p2: Vector2d): number {
        return Math.sqrt(Vector2d.distSquared(p1, p2));
    }

    public multiply(s: number): Vector2d {
        return new Vector2d(this.x * s, this.y * s);
    }

    public neg(): Vector2d {
        return new Vector2d(-this.x, -this.y);
    }

    public isZero(): boolean {
        return this.x === 0 && this.y === 0;
    }

    public normalize(): Vector2d {
        const length = this.length();
        if (length === 0) {
            throw 'Tried to normalize zero-vector';
        }
        return this.multiply(1 / length);
    }

    public rot90(cw: boolean): Vector2d {
        return cw ? new Vector2d(this.y, -this.x) : new Vector2d(-this.y, this.x);
    }

    public equals(v: Vector2d) {
        return this.x === v.x && this.y === v.y;
    }

    public static lerp(s: Vector2d, e: Vector2d, t: number) {
        return s.plus(e.minus(s).multiply(t));
    }
}
