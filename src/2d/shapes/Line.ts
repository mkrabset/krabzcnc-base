// A collection of functions related to lines, line segments and poly-lines
import { Vector2d } from '../Vector2d';

export class Line {
    public static lineEquation(p1: Vector2d, p2: Vector2d): [number, number, number] {
        return [p1.y - p2.y, p2.x - p1.x, p1.x * p2.y - p1.y * p2.x];
    }

    // Returns the point where the normal from the point (x,y) intersects with the line given by ax+by+c=0
    public static pointToLine(p: Vector2d, a: number, b: number, c: number): Vector2d {
        const x: number = p.x;
        const y: number = p.y;
        const den: number = a * a + b * b;
        return new Vector2d((b * (b * x - a * y) - a * c) / den, (a * (-b * x + a * y) - b * c) / den);
    }

    // Returns the shortest distance between a point and a line-segment (given by two endpoints)
    // If the normal from the point down to the line ends up outside the segment
    // , the distance to the closest endpoint is returned.
    public static pointToSegmentDist(point: Vector2d, start: Vector2d, end: Vector2d) {
        if (start.equals(end)) {
            return Vector2d.dist(point, start);
        }
        const [a, b, c] = Line.lineEquation(start, end);
        const q: Vector2d = Line.pointToLine(point, a, b, c);
        const t = Math.abs(start.x - end.x) > 0.00000001 ? (q.x - start.x) / (end.x - start.x) : (q.y - start.y) / (end.y - start.y);
        if (t <= 0) {
            return Vector2d.dist(point, start);
        } else if (t >= 1) {
            return Vector2d.dist(point, end);
        } else {
            return Vector2d.dist(point, q);
        }
    }

    /**
     * Simple Ramer Douglas Peucker implementation
     * TODO: Simplify and improve performance
     */
    public static rdp(points: Vector2d[], tolerance: number): Vector2d[] {
        return [points[0], ...Line.rdpInternal(points, tolerance), points[points.length - 1]];
    }

    private static rdpInternal(points: Vector2d[], tolerance: number): Vector2d[] {
        if (points.length <= 2) {
            return [];
        } else {
            const start: Vector2d = points[0];
            const end: Vector2d = points[points.length - 1];
            let maxDist: number = -1;
            let maxIdx: number = -1;
            for (let i = 1; i < points.length - 1; i++) {
                const dist: number = Line.pointToSegmentDist(points[i], start, end);
                if (dist > maxDist) {
                    maxDist = dist;
                    maxIdx = i;
                }
            }
            if (maxDist > tolerance) {
                let pointsBefore: Vector2d[] = points.slice(0, maxIdx + 1);
                let pointsAfter: Vector2d[] = points.slice(maxIdx, points.length);
                return [...Line.rdpInternal(pointsBefore, tolerance), points[maxIdx], ...Line.rdpInternal(pointsAfter, tolerance)];
            } else {
                return points.slice(1, points.length - 2);
            }
        }
    }
}
