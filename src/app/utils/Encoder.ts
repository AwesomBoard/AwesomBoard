import { JSONValue, JSONValueWithoutArray, Utils } from 'src/app/utils/utils';
import { assert } from 'src/app/utils/assert';

export abstract class Encoder<T> {
    public abstract encode(t: T): JSONValue;

    public abstract decode(encoded: JSONValue): T;
}

// Used internally. If T = [A, B, C], then
// EncoderArray<T> = [Encoder<A>, Encoder<B>, Encoder<C>]
type EncoderArray<T> = { [P in keyof T]: Encoder<T[P]> };

export abstract class MoveEncoder<T> extends Encoder<T> {
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
                    assert(encoded[key] != null, 'Invalid encoded value');
                    const field: JSONValue = encoded[key] as NonNullable<JSONValue>;
                    fields[key] = encoders[key].decode(field);
                });
                return decode(Object.values(fields) as Fields);
            }
        };
    }

    public static disjunction3<T1, T2, T3>(encoder1: MoveEncoder<T1>,
                                           encoder2: MoveEncoder<T2>,
                                           encoder3: MoveEncoder<T3>,
                                           isT1: (v: T1 | T2 | T3) => v is T1,
                                           isT2: (v: T1 | T2 | T3) => v is T2)
    : MoveEncoder<T1 | T2 | T3> {
        return new class extends MoveEncoder<T1 | T2 | T3> {
            public encodeMove(value: T1 | T2 | T3): JSONValueWithoutArray {
                if (isT1(value)) {
                    return {
                        type: 'T1',
                        encoded: encoder1.encode(value),
                    };
                } else if (isT2(value)) {
                    return {
                        type: 'T2',
                        encoded: encoder2.encode(value),
                    };
                } else {
                    return {
                        type: 'T3',
                        encoded: encoder3.encode(value),
                    };
                }
            }
            public decodeMove(encoded: JSONValueWithoutArray): T1 | T2 | T3 {
                // eslint-disable-next-line dot-notation
                const type_: string = Utils.getNonNullable(encoded)['type'];
                // eslint-disable-next-line dot-notation
                const content: JSONValue = Utils.getNonNullable(encoded)['encoded'] as JSONValue;
                if (type_ === 'T1') {
                    return encoder1.decode(content);
                } else if (type_ === 'T2') {
                    return encoder2.decode(content);
                } else {
                    return encoder3.decode(content);
                }
            }
        };
    }

    public encode(t: T): JSONValue {
        return this.encodeMove(t);
    }
    public abstract encodeMove(t: T): JSONValueWithoutArray;

    public decode(n: JSONValue): T {
        assert(Array.isArray(n) === false, 'MoveEncoder.decode called with an array');
        return this.decodeMove(n as JSONValueWithoutArray);
    }
    public abstract decodeMove(encoded: JSONValueWithoutArray): T;
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
     *  This creates a "product" encoder that encodes a type T as all of its fields
     *  i.e., if T = (a, b), then it does encode(a) << shiftForA + encode(b)
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
     * This creates a "sum" encoder, i.e., it encodes values of either type T1 and T2
     */
    public static disjunction<T1, T2>(encoder1: NumberEncoder<T1>,
                                      encoder2: NumberEncoder<T2>,
                                      isT1: (v: T1 | T2) => v is T1)
    : NumberEncoder<T1 | T2> {
        return new class extends NumberEncoder<T1 | T2> {
            public maxValue(): number {
                return Math.max(encoder1.maxValue() * 2,
                                (encoder2.maxValue() * 2) + 1);
            }
            public encodeNumber(value: T1 | T2): number {
                if (isT1(value)) {
                    return encoder1.encodeNumber(value) * 2;
                } else {
                    return (encoder2.encodeNumber(value) * 2) + 1;
                }
            }
            public decodeNumber(encoded: number): T1 | T2 {
                if (encoded % 2 === 0) {
                    return encoder1.decodeNumber(encoded / 2);
                } else {
                    return encoder2.decodeNumber((encoded - 1) / 2);
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

