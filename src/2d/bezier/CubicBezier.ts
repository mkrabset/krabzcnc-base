import { Vector2d } from '../Vector2d';

export type BezPoints = [Vector2d, Vector2d, Vector2d, Vector2d];

// Functions related to cubic Bézier curves
export class CubicBezier {
    /**
     * Calculates point on Bézier curve, given its control-points and a t-value
     */
    public static calculate(s: Vector2d, c1: Vector2d, c2: Vector2d, e: Vector2d, t: number): Vector2d {
        return new Vector2d(CubicBezier.calc(s.x, c1.x, c2.x, e.x, t), CubicBezier.calc(s.y, c1.y, c2.y, e.y, t));
    }

    // Calculates single bezier value, given control values and t-value
    private static calc(s: number, c1: number, c2: number, e: number, t: number): number {
        const omt: number = 1 - t;
        const omt2: number = omt * omt;
        const omt3: number = omt2 * omt;
        const t2: number = t * t;
        const t3: number = t2 * t;
        return omt3 * s + 3 * omt2 * t * c1 + 3 * omt * t2 * c2 + t3 * e;
    }

    /**
     * Splits a Bézier curve on the given t-value, and returns BezValues (control-points) for the two new curves
     */
    public static split(s: Vector2d, c1: Vector2d, c2: Vector2d, e: Vector2d, t: number): [BezPoints, BezPoints] {
        const c11: Vector2d = Vector2d.lerp(s, c1, t);
        const c22: Vector2d = Vector2d.lerp(c2, e, t);
        const _p1: Vector2d = Vector2d.lerp(c1, c2, t);
        const c21: Vector2d = Vector2d.lerp(c11, _p1, t);
        const c12: Vector2d = Vector2d.lerp(_p1, c22, t);
        const dp: Vector2d = Vector2d.lerp(c21, c12, t);
        return [
            [s, c11, c21, dp],
            [dp, c12, c22, e]
        ];
    }

    /**
     * Returns t-values (zero, one or two) for the inflection-points of the given Bézier curve.
     */
    public static inflectionPoints(s: Vector2d, c1: Vector2d, c2: Vector2d, e: Vector2d): number[] {
        const aVec = c1.minus(s);
        const bVec = c2.minus(c1).minus(aVec);
        const cVec = e.minus(c2).minus(aVec).minus(bVec.multiply(2));

        const a: number = bVec.cross(cVec);
        const b: number = aVec.cross(cVec);
        const c: number = aVec.cross(bVec);

        const det: number = b * b - 4 * a * c;

        if (det < 0) {
            return [];
        } else if (det === 0) {
            const t: number = -b / (2 * a);
            return t > 0 && t < 1 ? [t] : [];
        } else {
            return [(-b + Math.sqrt(det)) / (2 * a), (-b - Math.sqrt(det)) / (2 * a)].filter((t) => t > 0 && t < 1);
        }
    }

    /**
     * Returns true if the given Bézier curve can be considered 'flat', given the provided tolerance value.
     */
    public static isFlat(p1: Vector2d, c1: Vector2d, c2: Vector2d, p2: Vector2d, tolerance: number): boolean {
        const tolSquared: number = tolerance * tolerance;
        if (Vector2d.distSquared(p1, c1) < tolSquared && Vector2d.distSquared(p2, c2) < tolSquared) {
            return true;
        }

        const [a, b, c] = CubicBezier.lineEquation(p1, p2);
        return CubicBezier.controlPointDistanceWithinToleranceFromLine(c1, p1, p2, a, b, c, tolSquared) && CubicBezier.controlPointDistanceWithinToleranceFromLine(c2, p1, p2, a, b, c, tolSquared);
    }

    // Return coefficients for the standard form line equation (Ax+By+C=0) for the line going through
    // the given points p1 and p2 as an array [A,B,C].
    private static lineEquation(p1: Vector2d, p2: Vector2d): number[] {
        const delta = p2.minus(p1);
        return [-delta.y, delta.x, p1.cross(p2)];
    }

    // Returns the point where the normal from the point (x,y) intersects with the line given by ax+by+c=0
    private static pointToLine(p: Vector2d, a: number, b: number, c: number): Vector2d {
        const den: number = a * a + b * b;
        return new Vector2d((b * (b * p.x - a * p.y) - a * c) / den, (a * (-b * p.x + a * p.y) - b * c) / den);
    }

    // Checks if given control point cp is within tolerance distance of line given by line equation ax+by+c=0
    // , and that the intersection-point between the normal of cp and the line lies between the line endpoints p1 and p2.
    private static controlPointDistanceWithinToleranceFromLine(cp: Vector2d, p1: Vector2d, p2: Vector2d, a: number, b: number, c: number, tolSquared: number): boolean {
        const c1Hat: Vector2d = CubicBezier.pointToLine(cp, a, b, c);
        const cpDistSquared: number = Vector2d.distSquared(cp, c1Hat);
        if (cpDistSquared > tolSquared) {
            return false;
        }
        if (!CubicBezier.isBetween(c1Hat.x, p1.x, p2.x)) {
            return false;
        }
        if (!CubicBezier.isBetween(c1Hat.y, p1.y, p2.y)) {
            return false;
        }
        return true;
    }

    // Returns true if the given value is between v1 and v2
    private static isBetween(value: number, v1: number, v2: number): boolean {
        if (v1 <= v2) {
            return v1 <= value && value <= v2;
        } else {
            return v2 <= value && value <= v1;
        }
    }

    // Determines if bezier is considered 'clockwise'. (If this makes sense)
    // A bit sketchy this one! It uses the shoelace-formula on the polygon given by s,c1,c2,e.
    // Will be used by BiArc to determine cw/ccw-direction on generated arcs.
    // TODO: This haven't caused problems so far, but should be revisited
    static isClockwise(s: Vector2d, c1: Vector2d, c2: Vector2d, e: Vector2d): boolean {
        var sum: number = 0;
        sum += (c1.x - s.x) * (c1.y + s.y);
        sum += (c2.x - c1.x) * (c2.y + c1.y);
        sum += (e.x - c2.x) * (e.y + c2.y);
        sum += (s.x - e.x) * (s.y + e.y);
        return sum >= 0;
    }

    /**
     * Calculate cubic bezier control points from quadratic bezier control points.
     */
    static fromQuadratic(s: Vector2d, c: Vector2d, e: Vector2d): BezPoints {
        const c1: Vector2d = s.plus(c.minus(s).multiply(2 / 3));
        const c2: Vector2d = e.plus(c.minus(e).multiply(2 / 3));
        return [s, c1, c2, e];
    }
}
