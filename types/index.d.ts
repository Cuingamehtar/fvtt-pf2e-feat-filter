declare interface IterableIterator<T, TReturn, TNext> {
    filter(f: (e: T) => boolean): this;
    map<R>(f: (e: T) => R): IterableIterator<R, TReturn, TNext>;
}

declare interface Object {
    entries<K extends string, V>(obj: Record<K, V>): [K, V];
}
