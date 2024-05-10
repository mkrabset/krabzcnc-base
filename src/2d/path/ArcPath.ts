import { ArcSeg, LASeg, LineSeg, SegType } from './segment';
import { Circle } from '../shapes';
import { BoundingBox } from '../bounds';
import { Vector2d } from '../Vector2d';

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
                throw 'Path is not continuous, disruption after index ' + index;
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
        // Replace arcs with small lineerror with lines
        const tmp: LASeg[] = this.segs.map((seg) => {
            if (seg.segType === SegType.ARC) {
                const arcSeg: ArcSeg = seg as ArcSeg;
                if (Circle.getLineError(arcSeg.start, arcSeg.end, arcSeg.center, arcSeg.radius, arcSeg.clockwise) < tolerance / 2) {
                    return new LineSeg(seg.start, seg.end);
                }
            }
            return seg;
        });

        // Remove tiny segments
        const tmp2 = (LineSeg.simplifyLineSequences(tmp, tolerance) as LASeg[]).filter((seg) => !ArcPath.segTooTiny(seg));

        // Make continuous again after tiny seg removal
        const tmp3 = tmp2.map((seg, idx) => {
            const next = tmp2[(idx + 1) % tmp2.length];
            if (seg.end.equals(next.start)) {
                return seg;
            } else {
                return seg.segType === SegType.LINE ? new LineSeg(seg.start, next.start) : new ArcSeg(seg.start, next.start, (seg as ArcSeg).radius, (seg as ArcSeg).clockwise);
            }
        });
        return new ArcPath(tmp3);
    }

    static segTooTiny(seg: LASeg): boolean {
        return Math.abs(seg.start.x - seg.end.x) < 0.0000000001 && Math.abs(seg.start.y - seg.end.y) < 0.0000000001;
    }

    public getSegmentClosestTo(point: Vector2d): { segIndex: number; point: Vector2d } {
        let bestIdx: number = 0;
        let bestDistSquared: number = -1;
        let bestPoint: Vector2d = this.segs[0].start;
        this.segs.forEach((seg: LASeg, idx: number) => {
            const p: Vector2d = seg.getClosestPointTo(point);
            const distSquared = Vector2d.distSquared(p, point);
            if (bestDistSquared === -1 || distSquared < bestDistSquared) {
                bestIdx = idx;
                bestDistSquared = distSquared;
                bestPoint = p;
            }
        });
        return { segIndex: bestIdx, point: bestPoint };
    }

    /**
     * Returns a copy of this *CLOSED!* ArcPath where the entrypoint is moved to the given location
     * @param splitSegIndex Index of the segment where the new entrypoint is located
     * @param newEntyPoint The new entrypoint
     */
    public withNewEntryPoint(splitSegIndex: number, newEntryPoint: Vector2d, tolerance: number): ArcPath {
        if (!this.isClosed()) {
            throw 'ArcPath is not closed';
        }
        const before: LASeg[] = this.segs.slice(0, splitSegIndex);
        const after: LASeg[] = this.segs.slice(splitSegIndex + 1);
        const splitSeg = this.segs[splitSegIndex];
        if (Vector2d.dist(newEntryPoint, splitSeg.start) < tolerance / 2) {
            return new ArcPath([splitSeg, ...after, ...before]);
        } else if (Vector2d.dist(newEntryPoint, splitSeg.end)) {
            return new ArcPath([...before, ...after, splitSeg]);
        } else {
            const splitted = this.segs[splitSegIndex].splitAt(newEntryPoint);
            return new ArcPath([splitted[1], ...after, ...before, splitted[0]]);
        }
    }

    public toJson(): object[] {
        return this.segs.map((seg) => seg.toJson());
    }

    public static fromJson(segs: object[]): ArcPath {
        return new ArcPath(
            segs.map((seg: any) => {
                return seg.type === 'line' ? LineSeg.fromJson(seg) : ArcSeg.fromJson(seg);
            })
        );
    }
}
