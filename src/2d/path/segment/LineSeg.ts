import { Vector2d } from '../../Vector2d';
import { BoundingBox } from '../../bounds';
import { Seg } from './Seg';
import { SegType } from './SegType';
import { Matrix3x3 } from '../../Matrix3x3';

/**
 * Straight line segment
 */
export class LineSeg implements Seg {
    public readonly segType: SegType = SegType.LINE;
    public readonly start: Vector2d;
    public readonly end: Vector2d;

    public constructor(start: Vector2d, end: Vector2d) {
        this.start = start;
        this.end = end;
    }

    public createOffset(offset: number, tolerance: number): LineSeg {
        const offsetVec = this.end.minus(this.start).rot90(false).normalize().multiply(offset);
        return new LineSeg(this.start.plus(offsetVec), this.end.plus(offsetVec));
    }

    public withAdjustedStart(newStart: Vector2d): LineSeg {
        return new LineSeg(newStart, this.end);
    }

    public getBounds(): BoundingBox {
        return BoundingBox.fromPoints(this.start, this.end);
    }

    public splitAt(p: Vector2d): [LineSeg, LineSeg] {
        return [new LineSeg(this.start, p), new LineSeg(p, this.end)];
    }

    public reversed(): LineSeg {
        return new LineSeg(this.end, this.start);
    }

    public midpoint(): Vector2d {
        return this.start.plus(this.end).multiply(0.5);
    }

    public length(tolerance?: number): number {
        return Vector2d.dist(this.start, this.end);
    }

    public transformed(matrix: Matrix3x3): LineSeg {
        return new LineSeg(matrix.transform(this.start), matrix.transform(this.end));
    }

    public toJson(): { type: string, s: [number, number], e: [number, number] } {
        return {
            type: 'line',
            s: [this.start.x, this.start.y],
            e: [this.end.x, this.end.y]
        };
    }

    public static fromJson(json: { type: string, s: [number, number], e: [number, number] }): LineSeg {
        return new LineSeg(new Vector2d(json.s[0], json.s[1]), new Vector2d(json.e[0], json.e[1]))
    }
}
