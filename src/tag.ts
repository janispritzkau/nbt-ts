export enum TagType {
    End = 0,
    Byte = 1,
    Short = 2,
    Int = 3,
    Long = 4,
    Float = 5,
    Double = 6,
    ByteArray = 7,
    String = 8,
    List = 9,
    Compound = 10,
    IntArray = 11,
    LongArray = 12
}

export class Byte { constructor(public value: number) {} }
export class Short { constructor(public value: number) {} }
export class Int { constructor(public value: number) {} }
export class Float { constructor(public value: number) {} }

export interface TagArray extends Array<Tag> {}
export interface TagObject { [key: string]: Tag }
export type Tag = number | string | bigint | Byte | Short | Int | Float
    | Buffer | Int32Array | BigInt64Array | TagArray | TagObject

export function getTagType(tag: Tag): TagType {
    if (tag == null) return TagType.End
    if (tag instanceof Byte) return TagType.Byte
    if (tag instanceof Short) return TagType.Short
    if (tag instanceof Int) return TagType.Int
    if (typeof tag == "bigint") return TagType.Long
    if (tag instanceof Float) return TagType.Float
    if (typeof tag == "number") return TagType.Double
    if (tag instanceof Buffer) return TagType.ByteArray
    if (typeof tag == "string") return TagType.String
    if (tag instanceof Array) return TagType.List
    if (tag.constructor == Object) return TagType.Compound
    if (tag instanceof Int32Array) return TagType.IntArray
    if (tag instanceof BigInt64Array) return TagType.LongArray
    throw new Error("Invalid tag value")
}
