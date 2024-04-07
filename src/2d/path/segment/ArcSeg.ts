import { Vector2d } from '../../Vector2d';
import { Circle } from '../../shapes';
import { BoundingBox } from '../../bounds';
import { LASeg, Seg } from './Seg';
import { LineSeg } from './LineSeg';
import { SegType } from './SegType';

/**
 * Circular arc segment
 */
export class ArcSeg implements Seg {
    public readonly segType: SegType = SegType.ARC;
    public readonly start: Vector2d;
    public readonly end: Vector2d;
    public readonly center: Vector2d;
    public readonly radius: number;
    public readonly clockwise: boolean;

    // Try to restrict usage of these angles to rendering. Would be nice to get rid of them
    private startAngle?: number;
    private endAngle?: number;

    public constructor(start: Vector2d, end: Vector2d, radius: number, clockwise: boolean) {
        this.start = start;
        this.end = end;
        this.radius = radius;
        this.clockwise = clockwise;

        const center: Vector2d | null = Circle.findCenter(start, end, radius, clockwise);
        if (center === null) {
            throw 'radius too small';
        }
        this.center = center;
        //this.getBounds()
    }

    public createOffset(offset: number, tolerance: number): LASeg {
        const newRadius = this.clockwise ? this.radius + offset : this.radius - offset;
        const start = this.center.plus(this.start.minus(this.center).multiply(newRadius / this.radius));
        const end = this.center.plus(this.end.minus(this.center).multiply(newRadius / this.radius));

        if (newRadius <= 0) {
            return new LineSeg(start, end);
        } else if (Vector2d.dist(start, end) < tolerance / 4) {
            return new LineSeg(start, end);
        } else {
            return new ArcSeg(start, end, newRadius, this.clockwise);
        }
    }

    // Returns an ArcSeg with an adjusted start-position.
    // Note: Adjustments cannot be large relative to radius, or we might get 'radius too small'-error
    public withAdjustedStart(newStart: Vector2d): ArcSeg {
        return new ArcSeg(newStart, this.end, this.radius, this.clockwise);
    }

    public getStartAngle(): number {
        if (!this.startAngle) {
            this.startAngle = ArcSeg.angle(this.start.minus(this.center));
        }
        return this.startAngle;
    }

    public getEndAngle(): number {
        if (!this.endAngle) {
            this.endAngle = ArcSeg.angle(this.end.minus(this.center));
        }
        return this.endAngle;
    }

    public getBounds(): BoundingBox {
        const startWest: boolean = this.start.x < this.center.x;
        const endWest: boolean = this.end.x < this.center.x;
        const startSouth: boolean = this.start.y < this.center.y;
        const endSouth: boolean = this.end.y < this.center.y;

        const defaultBounds: BoundingBox = BoundingBox.fromPoints(this.start, this.end);
        if (startWest === endWest) {
            if (startSouth === endSouth) {
                // Same quadrant
                return defaultBounds;
            } else {
                // Crossing x-axis east or west
                const extension = startWest ? this.center.minus(new Vector2d(this.radius, 0)) : this.center.plus(new Vector2d(this.radius, 0));
                return defaultBounds.extendWithPoint(extension);
            }
        } else {
            if (startSouth === endSouth) {
                // Crossing y-axis north or south
                const extension = startSouth ? this.center.minus(new Vector2d(0, this.radius)) : this.center.plus(new Vector2d(0, this.radius));
                return defaultBounds.extendWithPoint(extension);
            } else {
                // Arc spans more than two quadrants, eg. angle is more than 90 degrees. Illegal!
                throw 'startWest!==endWest && startSouth!==endSouth';
            }
        }
    }

    public toLineSegs(tolerance: number): LineSeg[] {
        return ArcSeg.toLines(this.start, this.end, this.center, this.radius, this.clockwise, tolerance);
    }

    static toLines(start: Vector2d, end: Vector2d, center: Vector2d, radius: number, clockwise: boolean, tolerance: number): LineSeg[] {
        if (Circle.getLineError(start, end, center, radius, clockwise) < tolerance) {
            return [new LineSeg(start, end)];
        } else {
            const cs: Vector2d = start.minus(center);
            const ce: Vector2d = end.minus(center);
            const mid: Vector2d = center.plus(cs.plus(ce).normalize().multiply(radius));
            return [...this.toLines(start, mid, center, radius, clockwise, tolerance), ...this.toLines(mid, end, center, radius, clockwise, tolerance)];
        }
    }

    public reversed(): ArcSeg {
        return new ArcSeg(this.end, this.start, this.radius, !this.clockwise);
    }

    private static angle(v: Vector2d): number {
        const a: number = Math.acos(v.normalize().x);
        return v.y < 0 ? Math.PI * 2 - a : a;
    }

    public midpoint(): Vector2d {
        const cs = this.start.minus(this.center);
        const ce = this.end.minus(this.center);
        return cs.plus(ce).normalize().multiply(this.radius).plus(this.center);
    }

    static oneOrMore(start: Vector2d, end: Vector2d, radius: number, center: Vector2d, clockwise: boolean, tolerance: number): LASeg[] {
        const cs = start.minus(center);
        const ce = end.minus(center);
        if (cs.dot(ce) <= 0) {
            // More than 90 deg
            const midVec: Vector2d = ArcSeg.getMidVec(cs, ce, clockwise);
            const midPoint: Vector2d = center.plus(midVec);
            return [...ArcSeg.oneOrMore(start, midPoint, radius, center, clockwise, tolerance), ...ArcSeg.oneOrMore(midPoint, end, radius, center, clockwise, tolerance)];
        } else {
            if (Circle.getLineError(start, end, center, radius, clockwise) > tolerance / 2) {
                return start.equals(end) ? [] : [new ArcSeg(start, end, radius, clockwise)];
            } else {
                return start.equals(end) ? [] : [new LineSeg(start, end)];
            }
        }
    }

    private static getMidVec(cs: Vector2d, ce: Vector2d, clockwise: boolean): Vector2d {
        const radius = cs.length();
        const cw: boolean = cs.cross(ce) < 0;
        return cw === clockwise ? cs.plus(ce).normalize().multiply(radius) : cs.plus(ce).normalize().multiply(-radius);
    }

    static deltaAngle(startAngle: number, endAngle: number, clockwise: boolean): number {
        if (clockwise) {
            return startAngle > endAngle ? endAngle - startAngle : endAngle - 2 * Math.PI - startAngle;
        } else {
            return endAngle > startAngle ? endAngle - startAngle : 2 * Math.PI - startAngle + endAngle;
        }
    }

    public splitAt(p: Vector2d): [ArcSeg, ArcSeg] {
        return [new ArcSeg(this.start, p, this.radius, this.clockwise), new ArcSeg(p, this.end, this.radius, this.clockwise)];
    }

    public toJson(): { type: string; s: [number, number]; e: [number, number]; r: number; cw: boolean } {
        return {
            type: 'arc',
            s: [this.start.x, this.start.y],
            e: [this.end.x, this.end.y],
            r: this.radius,
            cw: this.clockwise
        };
    }

    public static fromJson(json: { type: string; s: [number, number]; e: [number, number]; r: number; cw: boolean }): ArcSeg {
        return new ArcSeg(new Vector2d(json.s[0], json.s[1]), new Vector2d(json.e[0], json.e[1]), json.r, json.cw);
    }
}
