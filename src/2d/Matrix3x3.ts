import { Vector2d } from './Vector2d';

export type m3x3 = [[number, number, number], [number, number, number], [number, number, number]];

export class Matrix3x3 {
    private static readonly IDENTITY: Matrix3x3 = new Matrix3x3([
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1]
    ]);

    private readonly v: number[][];

    public constructor(v: number[][]) {
        this.v = v;
    }

    public toArray(): m3x3 {
        return this.v as m3x3;
    }

    private static mul3x3(v1: number[][], v2: number[][]): number[][] {
        return [
            [
                v1[0][0] * v2[0][0] + v1[0][1] * v2[1][0] + v1[0][2] * v2[2][0],
                v1[0][0] * v2[0][1] + v1[0][1] * v2[1][1] + v1[0][2] * v2[2][1],
                v1[0][0] * v2[0][2] + v1[0][1] * v2[1][2] + v1[0][2] * v2[2][2]
            ],
            [
                v1[1][0] * v2[0][0] + v1[1][1] * v2[1][0] + v1[1][2] * v2[2][0],
                v1[1][0] * v2[0][1] + v1[1][1] * v2[1][1] + v1[1][2] * v2[2][1],
                v1[1][0] * v2[0][2] + v1[1][1] * v2[1][2] + v1[1][2] * v2[2][2]
            ],
            [
                v1[2][0] * v2[0][0] + v1[2][1] * v2[1][0] + v1[2][2] * v2[2][0],
                v1[2][0] * v2[0][1] + v1[2][1] * v2[1][1] + v1[2][2] * v2[2][1],
                v1[2][0] * v2[0][2] + v1[2][1] * v2[1][2] + v1[2][2] * v2[2][2]
            ]
        ];
    }

    public static multiply(m1: Matrix3x3, m2: Matrix3x3): Matrix3x3 {
        return new Matrix3x3(Matrix3x3.mul3x3(m1.v, m2.v));
    }

    public static identity(): Matrix3x3 {
        return Matrix3x3.IDENTITY;
    }

    public static translate(v: Vector2d): Matrix3x3 {
        return new Matrix3x3([
            [1, 0, v.x],
            [0, 1, v.y],
            [0, 0, 1]
        ]);
    }

    public static scale(xFactor: number, yFactor: number): Matrix3x3 {
        return new Matrix3x3([
            [xFactor, 0, 0],
            [0, yFactor, 0],
            [0, 0, 1]
        ]);
    }

    public static rotate(angle: number): Matrix3x3 {
        return new Matrix3x3([
            [Math.cos(angle), -Math.sin(angle), 0],
            [Math.sin(angle), Math.cos(angle), 0],
            [0, 0, 1]
        ]);
    }

    public static chain(chain: Matrix3x3[]): Matrix3x3 {
        return chain.reduce((acc, m) => Matrix3x3.multiply(acc, m), Matrix3x3.IDENTITY);
    }

    public static scaleAt(xFactor: number, yFactor: number, center: Vector2d): Matrix3x3 {
        return Matrix3x3.chain([Matrix3x3.translate(center), Matrix3x3.scale(xFactor, yFactor), Matrix3x3.translate(center.neg())]);
    }

    public static rotateAt(angle: number, center: Vector2d): Matrix3x3 {
        return Matrix3x3.chain([Matrix3x3.translate(center), Matrix3x3.rotate(angle), Matrix3x3.translate(center.neg())]);
    }

    public transform(vector: Vector2d): Vector2d {
        return new Vector2d(vector.x * this.v[0][0] + vector.y * this.v[0][1] + this.v[0][2], vector.x * this.v[1][0] + vector.y * this.v[1][1] + this.v[1][2]);
    }

    private static cofactor(v: number[][]): number[][] {
        return [
            [+(v[1][1] * v[2][2] - v[2][1] * v[1][2]), -(v[1][0] * v[2][2] - v[2][0] * v[1][2]), +(v[1][0] * v[2][1] - v[2][0] * v[1][1])],
            [-(v[0][1] * v[2][2] - v[2][1] * v[0][2]), +(v[0][0] * v[2][2] - v[2][0] * v[0][2]), -(v[0][0] * v[2][1] - v[2][0] * v[0][1])],
            [+(v[0][1] * v[1][2] - v[1][1] * v[0][2]), -(v[0][0] * v[1][2] - v[1][0] * v[0][2]), +(v[0][0] * v[1][1] - v[1][0] * v[0][1])]
        ];
    }

    private static det(v: number[][]): number {
        return v[0][0] * (v[1][1] * v[2][2] - v[2][1] * v[1][2]) - v[0][1] * (v[1][0] * v[2][2] - v[2][0] * v[1][2]) + v[0][2] * (v[1][0] * v[2][1] - v[2][0] * v[1][1]);
    }

    private static transpose(v: number[][]): number[][] {
        return [
            [v[0][0], v[1][0], v[2][0]],
            [v[0][1], v[1][1], v[2][1]],
            [v[0][2], v[1][2], v[2][2]]
        ];
    }

    public invert(): Matrix3x3 | null {
        const det = Matrix3x3.det(this.v);
        if (det === 0) {
            return null;
        }
        const rows: number[][] = Matrix3x3.transpose(Matrix3x3.cofactor(this.v)).map((row) => row.map((col) => col / det));
        return new Matrix3x3(rows);
    }

    public ctxArgs(): [number, number, number, number, number, number] {
        return [this.v[0][0], this.v[1][0], this.v[0][1], this.v[1][1], this.v[0][2], this.v[1][2]];
    }
}
