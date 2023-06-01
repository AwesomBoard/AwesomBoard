import { comparableEquals } from './Comparable';
import { Encoder } from './Encoder';
import { JSONValue, JSONValueWithoutArray } from './utils';

export class MGPOptional<T> {

    public static of<T>(value: T): MGPOptional<T> {
        return new MGPOptional(value);
    }
    public static ofNullable<T>(value: T | null | undefined): MGPOptional<T> {
        if (value == null) return MGPOptional.empty();
        return MGPOptional.of(value);
    }
    public static empty<T>(): MGPOptional<T> {
        return new MGPOptional(null as T | null);
    }
    /**
     * Encodes a MGPOptional<T> using an encoder of T.
     * It will use the same encoding as T, and use null to encode an empty optional.
     */
    public static getEncoder<T>(encoderT: Encoder<T>): Encoder<MGPOptional<T>> {
        return new class extends Encoder<MGPOptional<T>> {
            public encode(opt: MGPOptional<T>): JSONValueWithoutArray {
                if (opt.isPresent()) {
                    // TODO FOR REVIEW: c'est-ce-tu correct lo ?
                    return encoderT.encode(opt.get()) as JSONValueWithoutArray;
                } else {
                    return null;
                }
            }
            public decode(encoded: JSONValue): MGPOptional<T> {
                if (encoded === null) {
                    return MGPOptional.empty();
                } else {
                    return MGPOptional.of(encoderT.decode(encoded));
                }
            }
        };
    }
    private constructor(private readonly value: T | null) {}

    public isPresent(): boolean {
        return this.value != null;
    }
    public isAbsent(): boolean {
        return this.value == null;
    }
    public get(): T {
        if (this.isPresent()) {
            return this.value as T;
        } else {
            throw new Error('Value is absent');
        }
    }
    public getOrElse(defaultValue: T): T {
        if (this.isPresent()) {
            return this.value as T;
        } else {
            return defaultValue;
        }
    }
    public equals(other: MGPOptional<T>): boolean {
        if (this.isAbsent()) {
            return other.isAbsent();
        }
        if (other.isAbsent()) {
            return false;
        }
        return comparableEquals(this.value, other.value);
    }
    public equalsValue(other: T): boolean {
        return this.equals(MGPOptional.of(other));
    }
    public toString(): string {
        if (this.isAbsent()) {
            return 'MGPOptional.empty()';
        } else {
            return `MGPOptional.of(${this.value as T})`;
        }
    }
    public map<U>(f: (value: T) => U): MGPOptional<U> {
        if (this.isPresent()) {
            return MGPOptional.of(f(this.get()));
        } else {
            return MGPOptional.empty();
        }
    }
}
