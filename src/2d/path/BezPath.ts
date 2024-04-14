import { LBSeg } from './segment/Seg';
import { Matrix3x3 } from '../Matrix3x3';
import { BezSeg, LineSeg, SegType } from './segment';
import { Vector2d } from '../Vector2d';
import { BoundingBox } from '../bounds';

export class BezPath {
    public readonly segs: LBSeg[];
    private cachedBounds: BoundingBox | null;

    constructor(segs: LBSeg[]) {
        this.segs = segs.filter((seg) => !(seg.segType === SegType.LINE && seg.start.equals(seg.end))); // Remove empty lines

        // Check continuity
        this.segs.forEach((seg, index) => {
            const prev = this.segs[index - 1];
            if (index > 0 && !seg.start.equals(prev.end)) {
                throw 'Path is not continuous, disruption at index ' + index;
            }
        });
        this.cachedBounds = null;
    }

    public first(): LBSeg {
        return this.segs[0];
    }

    public last(): LBSeg {
        return this.segs[this.segs.length - 1];
    }

    public isClosed(): boolean {
        return this.segs.length > 1 && this.first().start.equals(this.last().end);
    }

    public length(tolerance: number): number {
        return this.segs.map((seg) => seg.length(tolerance)).reduce((a, b) => a + b, 0);
    }

    public transformed(matrix: Matrix3x3): BezPath {
        return new BezPath(this.segs.map((seg) => seg.transformed(matrix)));
    }

    public toJson(): object[] {
        return this.segs.map((seg) => seg.toJson());
    }

    public static fromJson(segs: object[]): BezPath {
        return new BezPath(
            segs.map((seg: any) => {
                return seg.type === 'line' ? LineSeg.fromJson(seg) : BezSeg.fromJson(seg);
            })
        );
    }

    public simplify(tolerance: number): BezPath {
        const tmp: LBSeg[] = this.segs.map((seg) => {
            if (seg.segType === SegType.BEZ) {
                const bezSeg: BezSeg = seg as BezSeg;
                const maxBounds = BoundingBox.merge([BoundingBox.fromPoints(bezSeg.start, bezSeg.end), BoundingBox.fromPoints(bezSeg.c1, bezSeg.c2)]) as BoundingBox;
                if (Vector2d.dist(maxBounds.min, maxBounds.max) < tolerance / 2) {
                    return new LineSeg(seg.start, seg.end);
                }
            }
            return seg;
        });
        return new BezPath(LineSeg.simplifyLineSequences(tmp, tolerance) as LBSeg[]);
    }

    // Simple bounding box implementation, only using the control points
    public getBounds(): BoundingBox {
        if (this.cachedBounds === null) {
            this.cachedBounds = BoundingBox.merge(
                this.segs.map((seg) => {
                    if (seg.segType === SegType.LINE) {
                        return BoundingBox.fromPoints(seg.start, seg.end) as BoundingBox;
                    } else {
                        const bez: BezSeg = seg as BezSeg;
                        return BoundingBox.merge([BoundingBox.fromPoints(bez.start, bez.c1), BoundingBox.fromPoints(bez.c2, bez.end)]) as BoundingBox;
                    }
                })
            ) as BoundingBox;
        }
        return this.cachedBounds;
    }
}
