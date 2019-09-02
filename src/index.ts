import { Tag, TagType, Byte, Float, Int, Short, getTagType, TagObject, TagMap } from "./tag"

if (!Buffer.prototype.readBigInt64BE) require("../buffer-bigint.shim")

export * from "./tag"
export * from "./snbt"

export interface DecodeResult {
    name: string | null
    value: Tag | null
    length: number
}

export interface DecodeOptions {
    /** Use ES6 `Map`s for compound tags instead of plain objects. */
    useMaps?: boolean
    /** Whether the root tag has a name. */
    unnamed?: boolean
}

/**
 * Decode a nbt tag from buffer.
 *
 * The result contains the decoded nbt value, the tag's name, if present,
 * and the length of how much was read from the buffer.
 */
export function decode(buffer: Buffer, options: DecodeOptions = {}): DecodeResult {
    const tagType = buffer.readUInt8(0)

    if (tagType == TagType.End) return { name: null, value: null, length: 1 }

    let name: string | null = null
    let offset = 1

    if (!options.unnamed) {
        const len = buffer.readUInt16BE(offset)
        offset += 2
        name = buffer.toString("utf-8", offset, offset += len)
    }

    const result = decodeTagValue(tagType, buffer, offset, !!options.useMaps)
    return { name, value: result.value, length: result.offset }
}

/**
 * Encode a nbt tag into a buffer.
 *
 * @param name Resulting tag will be unnamed if name is `null`.
 * @param tag If tag is `null`, only a zero byte is returned.
 */
export function encode(name: string | null, tag: Tag | null): Buffer {
    let buffer = Buffer.alloc(1024), offset = 0

    // write tag type
    offset = buffer.writeUInt8(tag == null ? TagType.End : getTagType(tag), offset)

    // write tag name
    if (tag != null && name != null) ({ buffer, offset } = writeString(name, buffer, offset))

    // write tag value
    if (tag != null) ({ buffer, offset } = encodeTagValue(tag, buffer, offset))

    return buffer.slice(0, offset)
}

/** Encode a string with it's length prefixed as unsigned 16 bit integer */
function writeString(text: string, buffer: Buffer, offset: number) {
    const data = Buffer.from(text)
    buffer = accommodate(buffer, offset, data.length + 2)
    offset = buffer.writeUInt16BE(data.length, offset)
    data.copy(buffer, offset), offset += data.length
    return { buffer, offset }
}

/** Double the size of the buffer until the required amount is reached. */
function accommodate(buffer: Buffer, offset: number, size: number) {
    while (buffer.length < offset + size) {
        buffer = Buffer.concat([buffer, Buffer.alloc(buffer.length)])
    }
    return buffer
}

function decodeTagValue(type: number, buffer: Buffer, offset: number, useMaps: boolean) {
    let value: Tag
    switch (type) {
        case TagType.Byte: value = new Byte(buffer.readInt8((offset += 1) - 1)); break
        case TagType.Short: value = new Short(buffer.readInt16BE((offset += 2) - 2)); break
        case TagType.Int: value = new Int(buffer.readInt32BE((offset += 4) - 4)); break
        case TagType.Long: value = buffer.readBigInt64BE((offset += 8) - 8); break
        case TagType.Float: value = new Float(buffer.readFloatBE((offset += 4) - 4)); break
        case TagType.Double: value = buffer.readDoubleBE((offset += 8) - 8); break
        case TagType.ByteArray: {
            const len = buffer.readUInt32BE(offset)
            offset += 4
            value = buffer.slice(offset, offset += len)
            break
        }
        case TagType.String: {
            const len = buffer.readUInt16BE(offset)
            value = (offset += 2, buffer.toString("utf-8", offset, offset += len))
            break
        }
        case TagType.List: {
            const type = buffer.readUInt8(offset)
            const len = buffer.readUInt32BE(offset + 1)
            offset += 5
            const items: Tag[] = []
            for (let i = 0; i < len; i++) {
                ({ value, offset } = decodeTagValue(type, buffer, offset, useMaps))
                items.push(value)
            }
            value = items
            break
        }
        case TagType.Compound: {
            const object = useMaps ? new Map : {}
            while (true) {
                const type = buffer.readUInt8(offset)
                offset += 1
                if (type == TagType.End) break
                const len = buffer.readUInt16BE(offset)
                offset += 2
                const name = buffer.toString("utf-8", offset, offset += len);
                ({ value, offset } = decodeTagValue(type, buffer, offset, useMaps))
                if (useMaps) (<TagMap>object).set(name, value)
                else (<TagObject>object)[name] = value
            }
            value = object
            break
        }
        case TagType.IntArray: {
            const length = buffer.readUInt32BE(offset)
            offset += 4
            const array = value = new Int32Array(length)
            for (let i = 0; i < length; i++) {
                array[i] = buffer.readInt32BE(offset + i * 4)
            }
            offset += array.buffer.byteLength
            break
        }
        case TagType.LongArray: {
            const length = buffer.readUInt32BE(offset)
            offset += 4
            const array = value = new BigInt64Array(length)
            for (let i = 0; i < length; i++) {
                array[i] = buffer.readBigInt64BE(offset + i * 8)
            }
            offset += array.buffer.byteLength
            break
        }
        default: throw new Error(`Tag type ${type} not implemented`)
    }
    return { value: <Tag>value, offset }
}

function encodeTagValue(tag: Tag, buffer: Buffer, offset: number) {
    // since most of the data types are smaller than 8 bytes, allocate this amount
    buffer = accommodate(buffer, offset, 8)

    if (tag instanceof Byte) {
        offset = tag.value < 0
            ? buffer.writeInt8(tag.value, offset)
            : buffer.writeUInt8(tag.value, offset)
    } else if (tag instanceof Short) {
        offset = tag.value < 0
            ? buffer.writeInt16BE(tag.value, offset)
            : buffer.writeUInt16BE(tag.value, offset)
    } else if (tag instanceof Int) {
        offset = tag.value < 0
            ? buffer.writeInt32BE(tag.value, offset)
            : buffer.writeUInt32BE(tag.value, offset)
    } else if (typeof tag == "bigint") {
        offset = tag < 0
            ? buffer.writeBigInt64BE(tag, offset)
            : buffer.writeBigUInt64BE(tag, offset)
    } else if (tag instanceof Float) {
        offset = buffer.writeFloatBE(tag.value, offset)
    } else if (typeof tag == "number") {
        offset = buffer.writeDoubleBE(tag, offset)
    } else if (tag instanceof Buffer || tag instanceof Int8Array) {
        offset = buffer.writeUInt32BE(tag.length, offset)
        buffer = accommodate(buffer, offset, tag.length);
        (tag instanceof Buffer ? tag : Buffer.from(tag)).copy(buffer, offset)
        offset += tag.length
    } else if (tag instanceof Array) {
        const type = tag.length > 0 ? getTagType(tag[0]) : TagType.End
        offset = buffer.writeUInt8(type, offset)
        offset = buffer.writeUInt32BE(tag.length, offset)
        for (const item of tag) {
            if (getTagType(item) != type) throw new Error("Odd tag type in list");
            ({ buffer, offset } = encodeTagValue(item, buffer, offset))
        }
    } else if (typeof tag == "string") {
        ({ buffer, offset } = writeString(tag, buffer, offset))
    } else if (tag instanceof Int32Array) {
        offset = buffer.writeUInt32BE(tag.length, offset)
        buffer = accommodate(buffer, offset, tag.byteLength)
        for (let i = 0; i < tag.length; i++) {
            buffer.writeInt32BE(tag[i], offset + i * 4)
        }
        offset += tag.byteLength
    } else if (tag instanceof BigInt64Array) {
        offset = buffer.writeUInt32BE(tag.length, offset)
        buffer = accommodate(buffer, offset, tag.byteLength)
        for (let i = 0; i < tag.length; i++) {
            buffer.writeBigInt64BE(tag[i], offset + i * 8)
        }
        offset += tag.byteLength
    } else {
        for (const [key, value] of tag instanceof Map ? tag : Object.entries(tag)) {
            offset = buffer.writeUInt8(getTagType(value), offset);
            ({ buffer, offset } = writeString(key, buffer, offset));
            ({ buffer, offset } = encodeTagValue(value, buffer, offset))
        }
        buffer = accommodate(buffer, offset, 1)
        offset = buffer.writeUInt8(0, offset)
    }

    return { buffer, offset }
}
