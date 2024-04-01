// A collection of functions related to circles
import { Vector2d } from '../Vector2d';

/**
 * Some functions related to circles
 */
export class Circle {
    /**
     * Returns the center of a circle where the perimeter goes through the given points in the given order
     * having the given radius, and going in the given direction.
     * The distance between the given points needs to be less than two times the radius, otherwise no center
     * is possible, and null is returned.
     */
    public static findCenter(p1: Vector2d, p2: Vector2d, radius: number, clockwise: boolean): Vector2d | null {
        const qVec: Vector2d = p2.minus(p1);
        const q: number = qVec.length();
        if (q >= radius * 2) {
            return null;
        }
        const midPoint: Vector2d = p1.plus(p2).multiply(0.5);
        const a: number = Math.sqrt(radius * radius - (q * q) / 4);
        const nVec: Vector2d = qVec.multiply(1 / q).rot90(clockwise);
        return midPoint.plus(nVec.multiply(a));
    }

    /**
     * Given a start and end of a circular arc and also a arc-center, radius and cw/ccw direction, return the error
     * introduced by replacing the arc by a straight line
     */
    public static getLineError(start: Vector2d, end: Vector2d, center: Vector2d, radius: number, clockwise: boolean): number {
        const lineMidpoint: Vector2d = start.plus(end).multiply(0.5);
        const distToCenter: number = Vector2d.dist(lineMidpoint, center);
        const centerToStart: Vector2d = start.minus(center);
        const centerToEnd: Vector2d = end.minus(center);
        const opposite: boolean = centerToStart.cross(centerToEnd) < 0 !== clockwise;
        return opposite ? radius + distToCenter : radius - distToCenter;
    }

    /**
     * Calculates a t-value for a given point p on an arc going from start to end with given center.
     * The value is based on sine of the angles involved, retrieved from cross-products.
     * The range will be between 0 (if p is at start) to 1 (if p is at end)
     * If p is outside the arc-range, null is returned
     */
    public static getTValueForArcPos(p: Vector2d, start: Vector2d, end: Vector2d, center: Vector2d): number | null {
        const cs: Vector2d = start.minus(center);
        const cp: Vector2d = p.minus(center);
        if (cs.dot(cp) <= 0) {
            return null; // More than 90 deg angle between cs and cp ==> P cannot be between s and e
        }

        const ce: Vector2d = end.minus(center);

        const csxcp: number = cs.cross(cp);
        const cpxce: number = cp.cross(ce);

        if (csxcp === 0) {
            return 0;
        } else if (cpxce === 0) {
            return 1;
        } else if (csxcp > 0 === cpxce > 0) {
            // Cross products for cs x cp and cp x ce have same sign, so p is between s and e
            const csn: Vector2d = cs.normalize();
            const cpn: Vector2d = cp.normalize();
            const cen: Vector2d = ce.normalize();
            return csn.cross(cpn) / csn.cross(cen); // Actually this is sin(scp) / sin(sce)
        } else {
            return null;
        }
    }
}
