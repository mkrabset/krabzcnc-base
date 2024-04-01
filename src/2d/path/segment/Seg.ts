import { LineSeg } from './LineSeg';
import { ArcSeg } from './ArcSeg';
import { Vector2d } from '../../Vector2d';
import { SegType } from './SegType';
import { BezSeg } from './BezSeg';

export type LASeg = LineSeg | ArcSeg;

export type LBSeg = LineSeg | BezSeg;

export interface Seg {
    segType: SegType;
    start: Vector2d;
    end: Vector2d;
}
