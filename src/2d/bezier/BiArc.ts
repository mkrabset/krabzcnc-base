import { Vector2d } from '../Vector2d';
import { BezPoints, CubicBezier } from './CubicBezier';
import { Intersection, LineSegIntersection } from '../intersection';
import { Circle } from '../shapes';

export type biarcSeg = {
    arc: boolean;
    start: Vector2d;
    end: Vector2d;
    center?: Vector2d;
    radius?: number;
    clockwise?: boolean;
};

export class BiArc {
    static fromBezier(p1: Vector2d, c1: Vector2d, c2: Vector2d, p2: Vector2d, tolerance: number): biarcSeg[] {
        try {
            // Split if bezier starts and ends in same point
            if (p1.equals(p2)) {
                const [bez1, bez2] = CubicBezier.split(p1, c1, c2, p2, 0.5);
                return [...BiArc.fromMonotoneBezier(...bez1, tolerance), ...BiArc.fromMonotoneBezier(...bez2, tolerance)];
            }

            // Split if handles are crossing
            const handleCrossing = Intersection.line2line([p1, c1], [p2, c2]);
            if (handleCrossing != null && handleCrossing.inRange) {
                const [bez1, bez2]: BezPoints[] = CubicBezier.split(p1, c1, c2, p2, 0.5);

                // TODO: This is sketchy I think.
                // Isn't it possible to have inflection points even if the bezier was split in half?
                // How do we know this?
                // Call fromBezier instead??

                return [...BiArc.fromMonotoneBezier(...bez1, tolerance), ...BiArc.fromMonotoneBezier(...bez2, tolerance)];
            }

            // Use line if curve is flat
            if (CubicBezier.isFlat(p1, c1, c2, p2, tolerance)) {
                return [BiArc.line(p1, p2)];
            }

            // Check for inflection points, and split at them
            const ip: number[] = CubicBezier.inflectionPoints(p1, c1, c2, p2);
            if (ip.length === 1) {
                const [bez1, bez2]: BezPoints[] = CubicBezier.split(p1, c1, c2, p2, ip[0]);
                return [...BiArc.fromMonotoneBezier(...bez1, tolerance), ...BiArc.fromMonotoneBezier(...bez2, tolerance)];
            } else if (ip.length === 2) {
                const ipMin = Math.min(ip[0], ip[1]);
                const ipMax = Math.max(ip[0], ip[1]);

                // TODO:
                // This is sketchy, we need to remap ipMax into the [0..1] range.

                const [bez1, bezTmp]: BezPoints[] = CubicBezier.split(p1, c1, c2, p2, ipMin);
                const [bez2, bez3]: BezPoints[] = CubicBezier.split(...bezTmp, ipMax);
                return [...BiArc.fromMonotoneBezier(...bez1, tolerance), ...BiArc.fromMonotoneBezier(...bez2, tolerance), ...BiArc.fromMonotoneBezier(...bez3, tolerance)];
            } else {
                return BiArc.fromMonotoneBezier(p1, c1, c2, p2, tolerance);
            }
        } catch (e) {
            console.log(e);
            console.log('entry-params:');
            console.log(JSON.stringify([p1, c1, c2, p2]));
            throw e;
        }
    }

    static fromMonotoneBezier(p1: Vector2d, c1: Vector2d, c2: Vector2d, p2: Vector2d, tolerance: number, depth: number = 0): biarcSeg[] {
        if (depth > 50) {
            throw 'too deep';
        }

        // Make line instead if bezier is flat
        if (CubicBezier.isFlat(p1, c1, c2, p2, tolerance)) {
            return [BiArc.line(p1, p2)];
        }

        // If distance between p1 and p2 is very small ( < tolerance), replace with line
        const p1p2: Vector2d = p2.minus(p1);
        if (p1p2.length() < tolerance) {
            // TODO: Use tolerance squared instead?
            return [BiArc.line(p1, p2)];
        }

        // Find v (intersection between p1c1 and p2c2), or split in half if not found
        const p1c1: Vector2d = c1.minus(p1); //Vector.subtract(c1, p1)
        const crossing = Intersection.line2line([p1, c1], [p2, c2]);
        if (crossing === null) {
            return BiArc.splitInHalf(p1, c1, c2, p2, tolerance, depth);
        }
        const v: Vector2d = crossing.p;

        // Split in half if p1v is in the opposite direction of p1c1
        const p1v: Vector2d = v.minus(p1); // Vector.subtract(v, p1)
        if (p1c1.dot(p1v) < 0) {
            return BiArc.splitInHalf(p1, c1, c2, p2, tolerance, depth);
        }

        // Find g (incenter-point of triangle p1,p2,v)
        // https://en.wikipedia.org/wiki/Incenter
        const dp1v: number = p1v.length(); // Vector.len(p1v)
        const dp2v: number = v.minus(p2).length(); // Vector.len(Vector.subtract(v, p2))
        const dp1p2: number = p2.minus(p1).length(); // Vector.len(Vector.subtract(p2, p1))
        const g: Vector2d = new Vector2d((dp2v * p1.x + dp1v * p2.x + dp1p2 * v.x) / (dp2v + dp1v + dp1p2), (dp2v * p1.y + dp1v * p2.y + dp1p2 * v.y) / (dp2v + dp1v + dp1p2));

        // Find arc centers
        const s1: Vector2d | null = BiArc.findCenter(p1, c1, g);
        const s2: Vector2d | null = BiArc.findCenter(p2, c2, g);
        if (s1 === null || s2 === null) {
            return BiArc.splitInHalf(p1, c1, c2, p2, tolerance, depth);
        }

        // Find radiuses
        const r1: number = s1.minus(p1).length(); // Vector.len(Vector.subtract(s1, p1))
        const r2: number = s2.minus(p2).length(); // Vector.len(Vector.subtract(s2, p2))

        // If g is very close to p1 or p2, we can return one single arc instead
        const p1g: number = p1.minus(g).length(); // Vector.len(Vector.subtract(p1, g))
        if (p1g < tolerance) {
            return BiArc.singleArcOrLine(p1, p2, s2, r2, tolerance);
        }
        const p2g: number = p2.minus(g).length(); // Vector.len(Vector.subtract(p2, g))
        if (p2g < tolerance) {
            return BiArc.singleArcOrLine(p1, p2, s1, r1, tolerance);
        }

        if (r1 < tolerance || r2 < tolerance) {
            return BiArc.splitInHalf(p1, c1, c2, p2, tolerance, depth);
        }

        // Evaluate error at some points along the bezier (tvalues 0.2 0.4 0.6 0.8)
        var results = [];
        for (let tt = 0.2; tt < 0.9; tt += 0.2) {
            // TODO: Make this a constant array of t-values
            results.push([tt, BiArc.calcError(p1, c1, c2, p2, tt, s1, r1, s2, r2)]);
        }
        const [maxT, maxErr]: number[] = results.reduce((p, v) => (p[1] > v[1] ? p : v), [0, 0]);
        if (maxErr > tolerance) {
            // split
            const [bez1, bez2]: BezPoints[] = CubicBezier.split(p1, c1, c2, p2, maxT);
            return [...BiArc.fromMonotoneBezier(...bez1, tolerance, depth + 1), ...BiArc.fromMonotoneBezier(...bez2, tolerance, depth + 1)];
        } else {
            const clockwise: boolean = CubicBezier.isClockwise(p1, c1, c2, p2);
            return [BiArc.arcOrLine(p1, g, s1, r1, clockwise, tolerance), BiArc.arcOrLine(g, p2, s2, r2, clockwise, tolerance)];
        }
    }

    static singleArcOrLine(p1: Vector2d, p2: Vector2d, inaccurateCenter: Vector2d, radius: number, tolerance: number): biarcSeg[] {
        const centerCandidates: Vector2d[] = Intersection.arc2arc(p1, radius, p2, radius);
        if (centerCandidates.length === 2) {
            const l1: number = Vector2d.dist(centerCandidates[0], inaccurateCenter);
            const l2: number = Vector2d.dist(centerCandidates[1], inaccurateCenter);
            const center: Vector2d = l1 < l2 ? centerCandidates[0] : centerCandidates[1];
            const clockwise: boolean = p1.minus(center).cross(p2.minus(center)) < 0;
            return [BiArc.arcOrLine(p1, p2, center, radius, clockwise, tolerance)];
        } else {
            return [BiArc.line(p1, p2)];
        }
    }

    static arcOrLine(start: Vector2d, end: Vector2d, center: Vector2d, radius: number, clockwise: boolean, tolerance: number): biarcSeg {
        if (Circle.getLineError(start, end, center, radius, clockwise) < tolerance / 2) {
            return BiArc.line(start, end);
        } else {
            return {
                arc: true,
                start: start,
                end: end,
                center: center,
                radius: radius,
                clockwise: clockwise
            };
        }
    }

    static splitInHalf(p1: Vector2d, c1: Vector2d, c2: Vector2d, p2: Vector2d, tolerance: number, depth: number): biarcSeg[] {
        const [bez1, bez2]: BezPoints[] = CubicBezier.split(p1, c1, c2, p2, 0.5);
        return [...BiArc.fromMonotoneBezier(...bez1, tolerance, depth), ...BiArc.fromMonotoneBezier(...bez2, tolerance, depth)];
    }

    // Given endpoint p, closest controlpoint c and arc joinpoint g, find center of circle going through p and g, where pc is a tangent
    static findCenter(p: Vector2d, c: Vector2d, g: Vector2d): Vector2d | null {
        const pgmid: Vector2d = p.plus(g).multiply(0.5);
        const pPlusPCnorm: Vector2d = p.plus(c.minus(p).rot90(true));
        const pgmidPlusPGnorm: Vector2d = pgmid.plus(g.minus(p).rot90(true));
        const crossing: LineSegIntersection | null = Intersection.line2line([p, pPlusPCnorm], [pgmid, pgmidPlusPGnorm]);
        return crossing === null ? null : crossing.p;
    }

    // Given bezier params (p1,c1,c2,p2), parameter t, circle-center s, and arc-radius r,
    // calculate difference between bezier-distance (at t) to s and arc-radius
    static calcError(p1: Vector2d, c1: Vector2d, c2: Vector2d, p2: Vector2d, t: number, center1: Vector2d, radius1: number, center2: Vector2d, radius2: number): number {
        const bt: Vector2d = CubicBezier.calculate(p1, c1, c2, p2, t);
        const error1: number = Math.abs(Vector2d.dist(center1, bt) - radius1);
        const error2: number = Math.abs(Vector2d.dist(center2, bt) - radius2);
        return Math.min(error1, error2);
    }

    static line(start: Vector2d, end: Vector2d): biarcSeg {
        return {
            arc: false,
            start: start,
            end: end
        };
    }
}
