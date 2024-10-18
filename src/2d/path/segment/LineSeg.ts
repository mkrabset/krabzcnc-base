import { Vector2d } from '../../Vector2d';
import { BoundingBox } from '../../bounds';
import { Seg } from './Seg';
import { SegType } from './SegType';
import { Matrix3x3 } from '../../Matrix3x3';
import { Line } from '../../shapes';

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

    public getLength(): number {
        return Vector2d.dist(this.start, this.end);
    }

    public getTValue(p: Vector2d): number {
        const d1 = Vector2d.dist(this.start, p);
        const d2 = Vector2d.dist(p, this.end);
        return d1 / (d1 + d2);
    }

    public getPosition(tValue: number): Vector2d {
        return this.start.plus(this.end.minus(this.start).multiply(tValue));
    }

    public transformed(matrix: Matrix3x3): LineSeg {
        return new LineSeg(matrix.transform(this.start), matrix.transform(this.end));
    }

    public getClosestPointTo(point: Vector2d): Vector2d {
        const [a, b, c] = Line.lineEquation(this.start, this.end);
        const q: Vector2d = Line.pointToLine(point, a, b, c);
        const t: number = Line.tValue(q, this.start, this.end);
        if (t < 0) {
            return this.start;
        } else if (t > 1) {
            return this.end;
        } else {
            return q;
        }
    }

    public toJson(): { type: string; s: [number, number]; e: [number, number] } {
        return {
            type: 'line',
            s: [this.start.x, this.start.y],
            e: [this.end.x, this.end.y]
        };
    }

    public static fromJson(json: { type: string; s: [number, number]; e: [number, number] }): LineSeg {
        return new LineSeg(new Vector2d(json.s[0], json.s[1]), new Vector2d(json.e[0], json.e[1]));
    }

    public static simplifyLineSequences(segs: Seg[], tolerance: number): Seg[] {
        const result: Seg[] = [];
        let currLines: LineSeg[] = [];
        segs.forEach((seg) => {
            if (seg.segType === SegType.LINE) {
                currLines.push(seg as LineSeg);
            } else {
                if (currLines.length > 0) {
                    LineSeg.simplifyLines(currLines, tolerance).forEach((seg) => result.push(seg));
                }
                result.push(seg);
                currLines = [];
            }
        });
        if (currLines.length > 0) {
            LineSeg.simplifyLines(currLines, tolerance).forEach((seg) => result.push(seg));
        }
        return result;
    }

    private static simplifyLines(lines: LineSeg[], tolerance: number): LineSeg[] {
        if (lines.length === 1) {
            return lines;
        } else {
            const points: Vector2d[] = lines.map((line) => line.start);
            points.push(lines[lines.length - 1].end);

            const simpPoints: Vector2d[] = Line.rdp(points, tolerance);
            const result: LineSeg[] = [];
            simpPoints.forEach((point, index) => {
                if (index < simpPoints.length - 1) {
                    result.push(new LineSeg(point, simpPoints[index + 1]));
                }
            });
            return result;
        }
    }
}
