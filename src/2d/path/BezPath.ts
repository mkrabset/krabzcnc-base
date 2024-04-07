import {LBSeg} from './segment/Seg';
import {Matrix3x3} from '../Matrix3x3';
import {BezSeg, LineSeg, SegType} from "./segment";

export class BezPath {
    public readonly segs: LBSeg[];

    constructor(segs: LBSeg[]) {
        this.segs = segs.filter(seg => !(seg.segType === SegType.LINE && seg.start.equals(seg.end)));  // Remove empty lines

        // Check continuity
        this.segs.forEach((seg, index) => {
            const prev = this.segs[index - 1]
            if (index > 0 && !seg.start.equals(prev.end)) {
                throw 'Path is not continuous, disruption at index ' + index;
            }
        });
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

    public fromJson(segs: object[]): BezPath {
        return new BezPath(segs.map((seg: any) => {
            return (seg.type === 'line')
                ? LineSeg.fromJson(seg)
                : BezSeg.fromJson(seg)
        }))
    }
}
