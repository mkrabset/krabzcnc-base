import { Vector2d } from '../Vector2d';

export class BoundingBox {
    public readonly min: Vector2d;
    public readonly max: Vector2d;

    public constructor(min: Vector2d, max: Vector2d) {
        this.min = min;
        this.max = max;
        if (min.x > max.x || min.y > max.y) {
            throw 'min>max';
        }
    }

    public containsPoint(point: Vector2d): boolean {
        return BoundingBox.isBetween(point.x, this.min.x, this.max.x) && BoundingBox.isBetween(point.y, this.min.y, this.max.y);
    }

    public containsBounds(bounds: BoundingBox): boolean {
        return this.min.x < bounds.min.x && this.min.y < bounds.min.y && this.max.x > bounds.max.x && this.max.y > bounds.max.y;
    }

    public overlaps(bb: BoundingBox): boolean {
        return BoundingBox.rangesOverlap(this.min.x, this.max.x, bb.min.x, bb.max.x) && BoundingBox.rangesOverlap(this.min.y, this.max.y, bb.min.y, bb.max.y);
    }

    public extendWithPoint(point: Vector2d): BoundingBox {
        return new BoundingBox(new Vector2d(Math.min(this.min.x, point.x), Math.min(this.min.y, point.y)), new Vector2d(Math.max(this.max.x, point.x), Math.max(this.max.y, point.y)));
    }

    private static rangesOverlap(r1Min: number, r1Max: number, r2Min: number, r2Max: number) {
        return !(r1Max <= r2Min || r2Max <= r1Min);
    }

    private static isBetween(v: number, min: number, max: number): boolean {
        return min < v && v < max;
    }

    public static merge(bbs: BoundingBox[]): BoundingBox | null {
        if (bbs.length === 0) {
            return null;
        }
        let [xMin, yMin, xMax, yMax]: number[] = [bbs[0].min.x, bbs[0].min.y, bbs[0].max.x, bbs[0].max.y];
        bbs.forEach((bb) => {
            xMin = Math.min(xMin, bb.min.x);
            yMin = Math.min(yMin, bb.min.y);
            xMax = Math.max(xMax, bb.max.x);
            yMax = Math.max(yMax, bb.max.y);
        });
        return new BoundingBox(new Vector2d(xMin, yMin), new Vector2d(xMax, yMax));
    }

    public static fromPoints(p1: Vector2d, p2: Vector2d): BoundingBox {
        return new BoundingBox(new Vector2d(Math.min(p1.x, p2.x), Math.min(p1.y, p2.y)), new Vector2d(Math.max(p1.x, p2.x), Math.max(p1.y, p2.y)));
    }

    public expand(offset: number) {
        return new BoundingBox(new Vector2d(this.min.x - offset, this.min.y - offset), new Vector2d(this.max.x + offset, this.max.y + offset));
    }

    public shortestDistanceTo(point: Vector2d): number {
        if (point.x < this.min.x) {
            // Point is to the west (left) of box
            if (point.y < this.min.y) {
                return Vector2d.dist(point, this.min); // Point is sw of sw corner
            } else if (point.y > this.max.y) {
                return Vector2d.dist(point, new Vector2d(this.min.x, this.max.y)); // Point is nw of nw corner
            } else {
                return this.min.x - point.x; // Point is straight west of box
            }
        } else if (point.x > this.max.x) {
            // Point is east of box
            if (point.y < this.min.y) {
                return Vector2d.dist(point, new Vector2d(this.max.x, this.min.y)); // Point is se of se corner
            } else if (point.y > this.max.y) {
                return Vector2d.dist(point, this.max); // Point is ne of ne corner
            } else {
                return point.x - this.max.x; // Point is straight east of box
            }
        } else {
            // Point is within eastwest bounds of box
            if (point.y < this.min.y) {
                return this.min.y - point.y; // Point is straight south of box
            } else if (point.y > this.max.y) {
                return point.y - this.max.y; // Point is straight north of box
            } else {
                return 0; // Point is inside box
            }
        }
    }

    public largestDistanceTo(point: Vector2d): number {
        const corners = [this.min, this.max, new Vector2d(this.min.x, this.max.y), new Vector2d(this.max.x, this.min.y)];
        return corners.map((corner) => Vector2d.dist(point, corner)).reduce((a, b) => Math.max(a, b));
    }
}
