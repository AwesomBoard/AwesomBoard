import { JSONValue, JSONValueWithoutArray, Utils } from 'src/app/utils/utils';
import { assert } from 'src/app/utils/assert';

export abstract class Encoder<T> {
    public abstract encode(move: T): JSONValue;

    public abstract decode(encodedMove: JSONValue): T;
}

// Used internally. If T = [A, B, C], then
// EncoderArray<T> = [Encoder<A>, Encoder<B>, Encoder<C>]
type EncoderArray<T> = { [P in keyof T]: Encoder<T[P]> };

export abstract class MoveEncoder<T> extends Encoder<T> {
    public static identity<U extends JSONValueWithoutArray>(): MoveEncoder<U> {
        return new class extends MoveEncoder<U> {
            public encodeMove(value: U): JSONValueWithoutArray {
                return value;
            }
            public decodeMove(encoded: NonNullable<JSONValueWithoutArray>): U {
                return encoded as U;
            }
        }
    }
    public static tuple<T, Fields extends object>(encoders: EncoderArray<Fields>,
                                                  encode: (t: T) => Fields,
                                                  decode: (fields: Fields) => T): MoveEncoder<T> {
        return new class extends MoveEncoder<T> {
            public encodeMove(value: T): JSONValueWithoutArray {
                const fields: Fields = encode(value);
                const encoded: JSONValueWithoutArray = {};
                Object.keys(fields).forEach((key: string): void => {
                    encoded[key] = encoders[key].encode(fields[key]);
                });
                return encoded;
            }
            public decodeMove(encoded: NonNullable<JSONValueWithoutArray>): T {
                const fields: Record<string, unknown> = {};
                Object.keys(encoders).reverse().forEach((key: string): void => {
                    const field: JSONValue = encoded[key] as NonNullable<JSONValue>;
                    fields[key] = encoders[key].decode(field);
                });
                return decode(Object.values(fields) as Fields);
            }
        };
    }
    /**
     * This creates a "sum" encoder, i.e., it encodes values of either type T and U
     */
    public static disjunction<T, U>(encoderT: Encoder<T>,
                                    encoderU: Encoder<U>,
                                    isT: (v: T | U) => v is T)
    : MoveEncoder<T | U>
    {
        return new class extends MoveEncoder<T | U> {
            public encodeMove(value: T | U): JSONValueWithoutArray {
                if (isT(value)) {
                    return {
                        type: 'T',
                        encoded: encoderT.encode(value),
                    };
                } else {
                    return {
                        type: 'U',
                        encoded: encoderU.encode(value),
                    };
                }
            }
            public decodeMove(encoded: JSONValueWithoutArray): T | U {
                // eslint-disable-next-line dot-notation
                const type_: string = Utils.getNonNullable(encoded)['type'];
                // eslint-disable-next-line dot-notation
                const content: JSONValue = Utils.getNonNullable(encoded)['encoded'] as JSONValue;
                if (type_ === 'T') {
                    return encoderT.decode(content);
                } else {
                    return encoderU.decode(content);
                }
            }
        };
    }
    public static disjunction3<T, U, V>(encoderT: MoveEncoder<T>,
                                        encoderU: MoveEncoder<U>,
                                        encoderV: MoveEncoder<V>,
                                        isT: (v: T | U | V) => v is T,
                                        isU: (v: T | U | V) => v is U)
    : MoveEncoder<T | U | V> {
        return new class extends MoveEncoder<T | U | V> {
            public encodeMove(value: T | U | V): JSONValueWithoutArray {
                if (isT(value)) {
                    return {
                        type: 'T',
                        encoded: encoderT.encode(value),
                    };
                } else if (isU(value)) {
                    return {
                        type: 'U',
                        encoded: encoderU.encode(value),
                    };
                } else {
                    return {
                        type: 'V',
                        encoded: encoderV.encode(value),
                    };
                }
            }
            public decodeMove(encoded: JSONValueWithoutArray): T | U | V {
                // eslint-disable-next-line dot-notation
                const type_: string = Utils.getNonNullable(encoded)['type'];
                // eslint-disable-next-line dot-notation
                const content: JSONValue = Utils.getNonNullable(encoded)['encoded'] as JSONValue;
                if (type_ === 'T') {
                    return encoderT.decode(content);
                } else if (type_ === 'U') {
                    return encoderU.decode(content);
                } else {
                    return encoderV.decode(content);
                }
            }
        };
    }

    public encode(move: T): JSONValue {
        return this.encodeMove(move);
    }

    public abstract encodeMove(move: T): JSONValueWithoutArray;

    public decode(encodedMove: JSONValue): T {
        assert(Array.isArray(encodedMove) === false, 'MoveEncoder.decode called with an array');
        return this.decodeMove(encodedMove as JSONValueWithoutArray);
    }
    public abstract decodeMove(encodedMove: JSONValueWithoutArray): T;
}

// Used internally. If T = [A, B, C], then
// NumberEncoderArray<T> = [NumberEncoder<A>, NumberEncoder<B>, NumberEncoder<C>]
type NumberEncoderArray<T> = { [P in keyof T]: NumberEncoder<T[P]> };

export abstract class NumberEncoder<T> extends MoveEncoder<T> {

    public static ofN<T>(max: number,
                         encodeNumber: (t: T) => number,
                         decodeNumber: (n: number) => T)
    : NumberEncoder<T>
    {
        return new class extends NumberEncoder<T> {
            public maxValue(): number {
                return max;
            }
            public encodeNumber(t: T): number {
                return encodeNumber(t);
            }
            public decodeNumber(n: number): T {
                return decodeNumber(n);
            }
        };
    }
    public static booleanEncoder: NumberEncoder<boolean> = new class extends NumberEncoder<boolean> {
        public maxValue(): number {
            return 1;
        }
        public encodeNumber(b: boolean): number {
            if (b) {
                return 1;
            } else {
                return 0;
            }
        }
        public decodeNumber(n: number): boolean {
            if (n === 0) return false;
            if (n === 1) return true;
            throw new Error('Invalid encoded boolean');
        }
    };

    /**
     * This creates a "product" encoder that encodes a type T as all of its fields
     * i.e., if T = (a, b), then it does encode(a) << shiftForA + encode(b)
     */
    public static tuple<T, Fields extends object>(encoders: NumberEncoderArray<Fields>,
                                                  encode: (t: T) => Fields,
                                                  decode: (fields: Fields) => T): NumberEncoder<T> {
        return new class extends NumberEncoder<T> {
            public maxValue(): number {
                let max: number = 0;
                Object.keys(encoders).forEach((key: string): void => {
                    max = max * encoders[key].shift() + encoders[key].maxValue();
                });
                return max;
            }
            public encodeNumber(t: T): number {
                const fields: Fields = encode(t);
                let n: number = 0;
                Object.keys(fields).forEach((key: string): void => {
                    n = n * encoders[key].shift() + encoders[key].encode(fields[key]);
                });
                return n;
            }
            public decodeNumber(n: number): T {
                const fields: Record<string, unknown> = {};
                let encoded: number = n;
                Object.keys(encoders).reverse().forEach((key: string): void => {
                    const fieldN: number = encoded % encoders[key].shift();
                    encoded = (encoded - fieldN) / encoders[key].shift();
                    fields[key] = encoders[key].decode(fieldN);
                });
                return decode(Object.values(fields) as Fields);
            }
        };
    }
    /**
     * This creates a "sum" encoder, i.e., it encodes values of either type T and U
     */
    public static disjunction<T, U>(encoderT: NumberEncoder<T>,
                                    encoderU: NumberEncoder<U>,
                                    isT: (v: T | U) => v is T)
    : NumberEncoder<T | U> {
        return new class extends NumberEncoder<T | U> {
            public maxValue(): number {
                return Math.max(encoderT.maxValue() * 2,
                                (encoderU.maxValue() * 2) + 1);
            }
            public encodeNumber(value: T | U): number {
                if (isT(value)) {
                    return encoderT.encodeNumber(value) * 2;
                } else {
                    return (encoderU.encodeNumber(value) * 2) + 1;
                }
            }
            public decodeNumber(encoded: number): T | U {
                if (encoded % 2 === 0) {
                    return encoderT.decodeNumber(encoded / 2);
                } else {
                    return encoderU.decodeNumber((encoded - 1) / 2);
                }
            }
        };
    }

    public static numberEncoder(max: number): NumberEncoder<number> {
        return new class extends NumberEncoder<number> {

            public maxValue(): number {
                return max;
            }
            public encodeNumber(n: number): number {
                if (n > max) {
                    throw new Error('Cannot encode number bigger than the max with numberEncoder');
                }
                return n;
            }
            public decodeNumber(encoded: number): number {
                if (encoded > max) {
                    throw new Error('Cannot decode number bigger than the max with numberEncoder');
                }
                return encoded;
            }
        };
    }

    public abstract maxValue(): number

    public shift(): number {
        return this.maxValue() + 1;
    }
    public abstract encodeNumber(t: T): number

    public encodeMove(t: T): JSONValueWithoutArray {
        return this.encodeNumber(t);
    }
    public abstract decodeNumber(n: number): T

    public decodeMove(n: JSONValueWithoutArray): T {
        assert(typeof n === 'number', 'Invalid encoded number');
        return this.decodeNumber(n as number);
    }
}

