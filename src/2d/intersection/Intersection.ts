import { Vector2d } from '../Vector2d';

export type LineSegIntersection = {
    inRange: boolean; // True if crossing is between endpoints of both line-segments
    t1: number; // T-value for cross point in first segment
    t2: number; // T-value for cross point in second segment
    p: Vector2d; // The cross point
};

// Functions for finding intersection points between lines and arcs
export class Intersection {
    /**
     * Given two line segments, find the point where these cross.
     * If line segments are non-parallel, a LineSegIntersection is returned, otherwise null
     */
    public static line2line(seg1: [Vector2d, Vector2d], seg2: [Vector2d, Vector2d]): LineSegIntersection | null {
        const delta1: Vector2d = seg1[1].minus(seg1[0]);
        const delta2: Vector2d = seg2[1].minus(seg2[0]);
        const det: number = delta1.x * delta2.y - delta1.y * delta2.x;
        if (Math.abs(det) < 0.000000001) {
            return null;
        }
        const t1: number = (delta2.y * (seg2[0].x - seg1[0].x) - delta2.x * (seg2[0].y - seg1[0].y)) / det;
        const t2: number = (delta1.y * (seg2[0].x - seg1[0].x) - delta1.x * (seg2[0].y - seg1[0].y)) / det;
        return {
            inRange: t1 > 0 && t1 < 1 && t2 > 0 && t2 < 1,
            t1,
            t2,
            p: seg1[0].plus(delta1.multiply(t1))
        };
    }

    /**
     * Returns intersections between line given by endpoints [p1,p2] and circle given by center and radius
     * Each intersection is represented by a t-value (for the line segment), and a vector for the intersection point
     */
    public static line2arc(p1: Vector2d, p2: Vector2d, center: Vector2d, radius: number): { t: number; p: Vector2d }[] {
        const p1p2: Vector2d = p2.minus(p1);
        const cp1 = p1.minus(center);
        const A = p1p2.lengthSquared();
        const B = 2 * cp1.dot(p1p2);
        const C = cp1.lengthSquared() - radius * radius;
        return Intersection.solveQuadraticEquation(A, B, C).map((t) => ({ t: t, p: p1.plus(p1p2.multiply(t)) }));
    }

    /**
     * Returns the zero, one or two intersection points between the given two circles.
     * @param c1 Circle 1 center point
     * @param r1 Circle 1 radius
     * @param c2 Circle 2 center point
     * @param r2 Circle 2 radius
     */
    public static arc2arc(c1: Vector2d, r1: number, c2: Vector2d, r2: number): [] | [Vector2d] | [Vector2d, Vector2d] {
        const c1c2 = c2.minus(c1);
        const d = c1c2.length();
        if (d === 0) {
            return []; // Circles have same center point, so no intersection
        }
        if (d > r1 + r2) {
            return []; // Circles are too far apart, so no intersection
        }

        const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
        const h2 = r1 * r1 - a * a;

        if (h2 < 0) {
            return [];
        }

        const m: Vector2d = c1.plus(c2.minus(c1).multiply(a / d));
        if (h2 === 0) {
            return [m];
        } else {
            const h = Math.sqrt(h2);
            const q = c1c2.multiply(h / d);

            return [new Vector2d(m.x + q.y, m.y - q.x), new Vector2d(m.x - q.y, m.y + q.x)];
        }
    }

    private static solveQuadraticEquation(a: number, b: number, c: number): [] | [number] | [number, number] {
        const determinant = b * b - 4 * a * c;
        if (determinant < 0) {
            return [];
        } else if (determinant === 0) {
            return [-b / (2 * a)];
        } else {
            const sqrtDeterminant = Math.sqrt(determinant);
            return [(-b + sqrtDeterminant) / (2 * a), (-b - sqrtDeterminant) / (2 * a)];
        }
    }
}
