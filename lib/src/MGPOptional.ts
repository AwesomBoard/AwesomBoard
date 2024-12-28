import { comparableEquals } from './Comparable';
import { Encoder } from './Encoder';
import { JSONValue } from './JSON';

export class MGPOptional<T> {

    public static of<U>(value: U): MGPOptional<U> {
        return new MGPOptional(value);
    }

    public static ofNullable<T>(value: T | null | undefined): MGPOptional<T> {
        if (value == null) {
            return MGPOptional.empty();
        } else {
            return MGPOptional.of(value);
        }
    }

    public static empty<T>(): MGPOptional<T> {
        return new MGPOptional(null as T | null);
    }

    /**
     * Encodes a MGPOptional<T> using an encoder of T.
     * It will use the same encoding as T, and use null to encode an empty optional.
     */
    public static getEncoder<U>(encoderT: Encoder<U>): Encoder<MGPOptional<U>> {
        return new class extends Encoder<MGPOptional<U>> {
            public encode(opt: MGPOptional<U>): JSONValue {
                if (opt.isPresent()) {
                    return encoderT.encode(opt.get());
                } else {
                    return null;
                }
            }
            public decode(encoded: JSONValue): MGPOptional<U> {
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

    public orElse(other: MGPOptional<T>): MGPOptional<T> {
        if (this.isPresent()) {
            return this;
        } else {
            return other;
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
