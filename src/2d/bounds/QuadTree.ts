import { BoundingBox } from './BoundingBox';
import { Vector2d } from '../Vector2d';

export type Item<T> = {
    readonly data: T;
    readonly bounds: BoundingBox;
};

export type Node<T> = {
    readonly bounds: BoundingBox;
    items: Item<T>[];
    nw: Node<T> | null;
    ne: Node<T> | null;
    sw: Node<T> | null;
    se: Node<T> | null;
};

/**
 * Quad-tree, used for increased performance when searching for overlapping rectangular bounds in 2d space.
 */
export class QuadTree<T> {
    private readonly nodeCapacity: number;
    private readonly root: Node<T>;

    public constructor(bounds: BoundingBox, nodeCapacity: number = 20) {
        this.nodeCapacity = nodeCapacity;
        this.root = this.createNode(bounds);
    }

    /**
     * Adds a new data item (with given bounding box) to the quad-tree structure.
     */
    public add(data: T, bounds: BoundingBox): void {
        const item: Item<T> = { data, bounds };
        this.insert(this.root, item);
    }

    public size(): number {
        return this.calcSize(this.root);
    }

    private calcSize(node: Node<T>): number {
        return node.nw === null ? node.items.length : node.items.length + [node.nw, node.ne, node.sw, node.se].map((child) => this.calcSize(child as Node<T>)).reduce((a, b) => a + b, 0);
    }

    private insert(node: Node<T>, item: Item<T>): void {
        if (node.items.length >= this.nodeCapacity && node.nw === null) {
            this.splitNode(node);
        }
        const child: Node<T> | null = this.getChild(node, item.bounds);
        if (child !== null) {
            this.insert(child, item);
        } else {
            node.items.push(item);
        }
    }

    private splitNode(node: Node<T>): void {
        const mid: Vector2d = node.bounds.min.plus(node.bounds.max).multiply(0.5);
        node.nw = this.createNode(new BoundingBox(new Vector2d(node.bounds.min.x, mid.y), new Vector2d(mid.x, node.bounds.max.y)));
        node.ne = this.createNode(new BoundingBox(mid, node.bounds.max));
        node.sw = this.createNode(new BoundingBox(node.bounds.min, mid));
        node.se = this.createNode(new BoundingBox(new Vector2d(mid.x, node.bounds.min.y), new Vector2d(node.bounds.max.x, mid.y)));

        const itemsToKeep: Item<T>[] = [];
        node.items.forEach((item) => {
            const child: Node<T> | null = this.getChild(node, item.bounds);
            if (child !== null) {
                child.items.push(item);
            } else {
                itemsToKeep.push(item);
            }
        });
        node.items = itemsToKeep;
    }

    private createNode(bounds: BoundingBox): Node<T> {
        return {
            bounds,
            items: [],
            nw: null,
            ne: null,
            sw: null,
            se: null
        };
    }

    // Returns the child node which can accommodate the given bounds
    private getChild(node: Node<T>, bounds: BoundingBox): Node<T> | null {
        const mid: Vector2d = node.bounds.min.plus(node.bounds.max).multiply(0.5);
        if (bounds.max.x < mid.x) {
            // west
            if (bounds.min.y > mid.y) {
                // north
                return node.nw;
            } else if (bounds.max.y < mid.y) {
                // south
                return node.sw;
            }
        } else if (bounds.min.x > mid.x) {
            // east
            if (bounds.min.y > mid.y) {
                // north
                return node.ne;
            } else if (bounds.max.y < mid.y) {
                // south
                return node.se;
            }
        }
        return null;
    }

    /**
     * Executes the given callback with all 'data' items with matching bounds, e.g.
     * all data items in the quad-tree structure that may potentially have a bounding box that overlaps the given bounds.
     */
    public forEachMatch(bounds: BoundingBox, callback: (data: T) => void): void {
        this.doForEachMatch(this.root, bounds, callback);
    }

    private doForEachMatch(node: Node<T>, bounds: BoundingBox, callback: (data: T) => void): void {
        node.items.forEach((item) => {
            if (bounds.overlaps(item.bounds)) {
                callback(item.data);
            }
        });
        if (node.nw !== null) {
            const child: Node<T> | null = this.getChild(node, bounds);
            if (child !== null) {
                this.doForEachMatch(child as Node<T>, bounds, callback);
            } else {
                this.doForEachMatch(node.nw as Node<T>, bounds, callback);
                this.doForEachMatch(node.ne as Node<T>, bounds, callback);
                this.doForEachMatch(node.sw as Node<T>, bounds, callback);
                this.doForEachMatch(node.se as Node<T>, bounds, callback);
            }
        }
    }

    // Returns all elements of items with bounds overlapping the given bounding box
    public findMatches(bounds: BoundingBox): T[] {
        const result: T[] = [];
        this.forEachMatch(bounds, (match) => result.push(match));
        return result;
    }

    // Invokes the given callback for each matching pair of items with overlapping bounds in the q-tree
    public forEachMatchingPair(callback: (data1: T, data2: T) => void): void {
        this.doForEachMatchingPair(this.root, callback);
    }

    private doForEachMatchingPair(node: Node<T>, callback: (data1: T, data2: T) => void): void {
        node.items.forEach((item, index) => {
            for (let i = index + 1; i < node.items.length; i++) {
                if (node.items[i].bounds.overlaps(item.bounds)) {
                    callback(item.data, node.items[i].data); // Invoke callback on pairs on the same level
                }
            }
            if (node.nw !== null) {
                const subNodes: Node<T>[] = [node.nw, node.ne, node.sw, node.se] as Node<T>[];

                subNodes.forEach((subnode) => {
                    if (subnode.bounds.overlaps(item.bounds)) {
                        this.doForEachMatch(subnode, item.bounds, (data2) => callback(item.data, data2)); // Invoke callback on matching sublevel items
                    }
                });
            }
        });

        // Call downward recursively if node has children
        if (node.nw !== null) {
            const subNodes: Node<T>[] = [node.nw, node.ne, node.sw, node.se] as Node<T>[];
            subNodes.forEach((subnode) => {
                this.doForEachMatchingPair(subnode, callback);
            });
        }
    }
}
