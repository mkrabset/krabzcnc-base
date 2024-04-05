import { Vector2d } from '../../Vector2d';
import { BezPoints, BiArc, CubicBezier } from '../../bezier';
import { ArcSeg } from './ArcSeg';
import { LASeg, Seg } from './Seg';
import { LineSeg } from './LineSeg';
import { SegType } from './SegType';

/**
 * Cubic bezier segment
 */
export class BezSeg implements Seg {
    segType: SegType = SegType.BEZ;
    start: Vector2d;
    c1: Vector2d;
    c2: Vector2d;
    end: Vector2d;

    constructor(start: Vector2d, c1: Vector2d, c2: Vector2d, end: Vector2d) {
        this.start = start;
        this.c1 = c1;
        this.c2 = c2;
        this.end = end;
    }

    public toLASegs(tolerance: number, disableArcs: boolean, maxRadius: number): LASeg[] {
        if (disableArcs) {
            return BezSeg.toLines(this.start, this.c1, this.c2, this.end, tolerance);
        } else {
            return BiArc.fromBezier(this.start, this.c1, this.c2, this.end, tolerance)
                .map((seg) => {
                    if (seg.arc) {
                        // Arc
                        if ((seg.radius as number) > maxRadius) {
                            return seg.start.equals(seg.end) ? [] : [new LineSeg(seg.start, seg.end)];
                        } else {
                            return ArcSeg.oneOrMore(seg.start, seg.end, seg.radius as number, seg.center as Vector2d, seg.clockwise as boolean, tolerance);
                        }
                    } else {
                        // Line
                        return seg.start.equals(seg.end) ? [] : [new LineSeg(seg.start, seg.end)];
                    }
                })
                .reduce((a, b) => [...a, ...b], []);
        }
    }

    private static toLines(s: Vector2d, c1: Vector2d, c2: Vector2d, e: Vector2d, tolerance: number): LineSeg[] {
        if (CubicBezier.isFlat(s, c1, c2, e, tolerance)) {
            return s.equals(e) ? [] : [new LineSeg(s, e)];
        } else {
            const [bez1, bez2]: BezPoints[] = CubicBezier.split(s, c1, c2, e, 0.5);
            return [...BezSeg.toLines(...bez1, tolerance), ...BezSeg.toLines(...bez2, tolerance)];
        }
    }

    public length(tolerance: number): number {
        return BezSeg.toLines(this.start, this.c1, this.c2, this.end, tolerance)
            .map((lineSeg) => lineSeg.length())
            .reduce((a, b) => a + b, 0);
    }

    public reversed(): BezSeg {
        return new BezSeg(this.end, this.c2, this.c1, this.start);
    }
}
