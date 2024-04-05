import { ArcSeg, LASeg, LineSeg, SegType } from './segment';
import { Circle, Line } from '../shapes';
import { Vector2d } from '../Vector2d';
import { BoundingBox } from '../bounds';

export class ArcPath {
    public readonly segs: LASeg[];
    private cachedBounds: BoundingBox | null;
    private cachedArea: number | null;

    constructor(segs: LASeg[]) {
        this.segs = segs.filter((seg) => !seg.start.equals(seg.end));
        this.cachedBounds = null;
        this.cachedArea = null;

        // Assert continuous
        this.segs.forEach((seg, index) => {
            if (!seg.end.equals(this.segs[(index + 1) % this.segs.length].start)) {
                throw 'err';
            }
        });
    }

    public first(): LASeg {
        return this.segs[0];
    }

    public last(): LASeg {
        return this.segs[this.segs.length - 1];
    }

    public isClosed(): boolean {
        return this.segs.length > 1 && this.first().start.equals(this.last().end);
    }

    /**
     * Invokes the given callback for each segment in the path
     */
    public forEachSegment(callback: (seg: LASeg) => any): void {
        this.segs.forEach((seg) => callback(seg));
    }

    public allSegmentsSatisfies(predicate: (seg: LASeg) => boolean): boolean {
        return this.segs.every((seg) => predicate(seg));
    }

    public asLines(tolerance: number): ArcPath {
        return new ArcPath(
            this.segs
                .map((seg) => {
                    if (seg.segType === SegType.LINE) {
                        return [seg];
                    } else {
                        return (seg as ArcSeg).toLineSegs(tolerance);
                    }
                })
                .reduce((a, b) => [...a, ...b], [])
        );
    }

    public getArea(tolerance: number): number {
        if (this.cachedArea === null) {
            this.cachedArea =
                0.5 *
                this.asLines(tolerance)
                    .segs.map((s) => s.start.cross(s.end))
                    .reduce((a, b) => a + b, 0);
        }
        return this.cachedArea;
    }

    public getBounds(): BoundingBox {
        if (this.cachedBounds === null) {
            this.cachedBounds = BoundingBox.merge(this.segs.map((seg) => seg.getBounds()));
        }
        return this.cachedBounds as BoundingBox;
    }

    public reversed(): ArcPath {
        let result = new ArcPath(this.segs.map((seg) => seg.reversed()).reverse());
        result.cachedBounds = this.cachedBounds;
        result.cachedArea = this.cachedArea === null ? null : -this.cachedArea;
        return result;
    }

    public simplify(tolerance: number): ArcPath {
        const tmp1: LASeg[] = this.segs.map((seg) => {
            if (seg.segType === SegType.ARC) {
                const arcSeg: ArcSeg = seg as ArcSeg;
                if (Circle.getLineError(arcSeg.start, arcSeg.end, arcSeg.center, arcSeg.radius, arcSeg.clockwise) < tolerance / 2) {
                    return new LineSeg(seg.start, seg.end);
                }
            }
            return seg;
        });
        const result: LASeg[] = [];
        let currLines: LineSeg[] = [];
        tmp1.forEach((seg) => {
            if (seg.segType === SegType.LINE) {
                currLines.push(seg as LineSeg);
            } else {
                if (currLines.length > 0) {
                    ArcPath.simplifyLines(currLines, tolerance).forEach((seg) => result.push(seg));
                }
                result.push(seg);
                currLines = [];
            }
        });
        if (currLines.length > 0) {
            ArcPath.simplifyLines(currLines, tolerance).forEach((seg) => result.push(seg));
        }
        return new ArcPath(result);
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

    public toJson(): object[] {
        return this.segs.map((seg) => seg.toJson());
    }
}
