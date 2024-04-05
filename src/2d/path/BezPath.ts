import { LBSeg } from './segment/Seg';

export class BezPath {
    public readonly segs: LBSeg[];

    constructor(segs: LBSeg[]) {
        this.segs = segs;
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
}
