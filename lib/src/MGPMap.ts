import { MGPOptional } from './MGPOptional';
import { Comparable, comparableEquals } from './Comparable';
import { Set } from './Set';
import { Utils } from './Utils';

export class MGPMap<K extends NonNullable<Comparable>, V extends NonNullable<unknown>> {

    public static from<Key extends string | number, Value extends NonNullable<unknown>>(record: Record<Key, Value>)
    : MGPMap<Key, Value>
    {
        const keys: Key[] = Object.keys(record) as Key[];
        const map: MGPMap<Key, Value> = new MGPMap();
        for (const key of keys) {
            map.set(key, record[key]);
        }
        return map;
    }

    public constructor(private map: {key: K, value: V}[] = [],
                       private isImmutable: boolean = false)
    {
    }

    public makeImmutable(): void {
        this.isImmutable = true;
    }

    public get(key: K): MGPOptional<V> {
        for (const keymap of this.map) {
            if (comparableEquals(keymap.key, key)) {
                return MGPOptional.of(keymap.value);
            }
        }
        return MGPOptional.empty();
    }

    public getAnyPair(): MGPOptional<{key: K, value: V}> {
        if (this.size() > 0) {
            return MGPOptional.of(this.map[0]);
        } else {
            return MGPOptional.empty();
        }
    }

    public forEach(callback: (item: {key: K, value: V}) => void): void {
        for (const element of this.map) {
            callback(element);
        }
    }

    // TODO: remove forEach and use this!
    [Symbol.iterator](): IterableIterator<[K, V]> {
        const entries: {key: K, value: V}[] = this.map; // cache the current entries
        let index: number = 0;

        return {
            /* istanbul ignore next */
            [Symbol.iterator](): IterableIterator<[K, V]> {
                // No idea how this can be covered, because
                return this;
            },
            next(): IteratorResult<[K, V]> {
                if (index < entries.length) {
                    const entry: {key: K, value: V} = entries[index];
                    index += 1;
                    return { value: [entry.key, entry.value], done: false };
                }
                return { value: undefined as unknown as [K, V], done: true };
            },
        };
    }

    public clear(): void {
        this.assertImmutability('clear');
        this.map = [];
    }

    public putAll(m: MGPMap<K, V>): void {
        this.assertImmutability('putAll');
        for (const entry of m.map) {
            this.put(entry.key, entry.value);
        }
    }

    public assertImmutability(methodCalled: string): void {
        Utils.assert(this.isImmutable === false,
                     'Cannot call ' + methodCalled + ' on immutable map!');
    }

    public put(key: K, value: V): MGPOptional<V> {
        this.assertImmutability('put');
        for (const entry of this.map) {
            if (comparableEquals(entry.key, key)) {
                const oldValue: V = entry.value;
                entry.value = value;
                return MGPOptional.of(oldValue);
            }
        }
        this.map.push({ key, value });
        return MGPOptional.empty();
    }

    public containsKey(key: K): boolean {
        return this.map.some((entry: {key: K, value: V}) => comparableEquals(entry.key, key));
    }

    public size(): number {
        return this.map.length;
    }

    public getKeyList(): K[] {
        return this.map.map((entry: {key: K, value: V}) => entry.key);
    }

    public getValueList(): V[] {
        return this.map.map((entry: {key: K, value: V}) => entry.value);
    }

    public getKeySet(): Set<K> {
        return new Set<K>(this.getKeyList());
    }

    public filter(predicate: (key: K, value: V) => boolean): MGPMap<K, V> {
        const filtered: MGPMap<K, V> = new MGPMap();
        for (const keyValue of this.map) {
            if (predicate(keyValue.key, keyValue.value)) {
                filtered.set(keyValue.key, keyValue.value);
            }
        }
        return filtered;
    }

    public replace(key: K, newValue: V): V {
        this.assertImmutability('replace');
        const oldValue: MGPOptional<V> = this.get(key);
        if (oldValue.isAbsent()) {
            throw new Error('No Value to replace for key '+ key.toString() + '!');
        } else {
            this.put(key, newValue);
            return newValue;
        }
    }

    public set(key: K, firstValue: V): void {
        this.assertImmutability('set');
        if (this.containsKey(key)) {
            throw new Error('Key ' + key.toString() + ' already exists in map!');
        } else {
            this.map.push({ key, value: firstValue });
        }
    }

    public delete(key: K): V {
        this.assertImmutability('delete');
        for (let i: number = 0; i < this.map.length; i++) {
            const entry: {key: K, value: V} = this.map[i];
            if (comparableEquals(entry.key, key)) {
                const oldValue: V = this.map[i].value;
                const beforeDeleted: {key: K, value: V}[] = this.map.slice(0, i);
                const afterDeleted: {key: K, value: V}[] = this.map.slice(i + 1);
                this.map = beforeDeleted.concat(afterDeleted);
                return oldValue;
            }
        }
        throw new Error('No value to delete for key "'+ key.toString() +'"!');
    }

    public getCopy(): this {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const newMap: this = new (<any> this.constructor)();
        for (const key of this.getKeyList()) {
            newMap.set(key, this.get(key).get());
        }
        return newMap;
    }

    public equals(other: MGPMap<K, V>): boolean {
        const thisKeySet: Set<K> = this.getKeySet();
        const otherKeySet: Set<K> = other.getKeySet();
        if (thisKeySet.equals(otherKeySet) === false) {
            return false;
        }
        for (const key of thisKeySet) {
            const thisValue: V = this.get(key).get();
            const otherValue: MGPOptional<V> = other.get(key);
            Utils.assert(otherValue.isPresent(), 'value is absent in a map even though its key is present!');
            if (comparableEquals(thisValue, otherValue.get()) === false) {
                return false;
            }
        }
        return true;
    }
}

export class ReversibleMap<K extends NonNullable<Comparable>, V extends NonNullable<Comparable>> extends MGPMap<K, V> {

    public reverse(): ReversibleMap<V, Set<K>> {
        const reversedMap: ReversibleMap<V, Set<K>> = new ReversibleMap<V, Set<K>>();
        for (const key of this.getKeyList()) {
            const value: V = this.get(key).get();
            if (reversedMap.containsKey(value)) {
                const newSet: Set<K> = reversedMap.get(value).get().addElement(key);
                reversedMap.put(value, newSet);
            } else {
                const newSet: Set<K> = new Set<K>([key]);
                reversedMap.set(value, newSet);
            }
        }
        return reversedMap;
    }
}
