import { Tag, TagType, Byte, Float, Int, Short, getTagType, TagObject } from "./tag"

export * from "./tag"

/** Doubles the size of the buffer until the required amount is reached. */
function accommodate(buffer: Buffer, offset: number, size: number) {
    while (buffer.length < offset + size) {
        buffer = Buffer.concat([buffer, Buffer.alloc(buffer.length)])
    }
    return buffer
}

interface DecodeResult {
    name: string | null
    value: Tag
    offset: number
}

/**
 * Decodes a nbt tag
 *
 * @param hasName Expect nbt tag to have a name. For example, Minecraft uses unnamed
 * tags in slots in its network protocol.
 * @param offset Start decoding at this offset in the buffer
*/
export function decode(buffer: Buffer, hasName?: boolean | null, offset = 0): DecodeResult {
    if (hasName == null) hasName = true

    const type = buffer.readUInt8(offset)
    offset += 1

    let name: string | null = null
    if (hasName) {
        const len = buffer.readUInt16BE(offset)
        offset += 2
        name = buffer.toString("utf-8", offset, offset += len)
    }

    return { name, ...decodeTagValue(buffer, offset, type) }
}

/** Encodes a nbt tag. If the name is `null` the nbt tag will be unnamed. */
export function encode(name: string | null = "", tag: Tag | null) {
    let buffer = Buffer.alloc(1024), offset = 0

    // write tag type
    offset = buffer.writeUInt8(tag == null ? TagType.End : getTagType(tag), offset)

    // write tag name
    if (name != null) ({ buffer, offset } = writeString(name, buffer, offset))

    // write tag value
    if (tag != null) ({ buffer, offset } = encodeTagValue(tag, buffer, offset))

    return buffer.slice(0, offset)
}

/** Encodes a string with it's length prefixed as unsigned 16 bit integer */
function writeString(text: string, buffer: Buffer, offset: number) {
    const data = Buffer.from(text)
    buffer = accommodate(buffer, offset, data.length + 2)
    offset = buffer.writeUInt16BE(data.length, offset)
    data.copy(buffer, offset), offset += data.length
    return { buffer, offset }
}

export function decodeTagValue(buffer: Buffer, offset: number, type: number) {
    let value: Tag
    switch (type) {
        case TagType.Byte: value = new Byte(buffer.readInt8((offset += 1) - 1)); break
        case TagType.Short: value = new Short(buffer.readInt16BE((offset += 2) - 2)); break
        case TagType.Int: value = new Int(buffer.readInt32BE((offset += 4) - 4)); break
        case TagType.Long: {
            value = (BigInt(buffer.readUInt32BE(offset)) << 32n) | BigInt(buffer.readUInt32BE(offset + 4))
            offset += 8
            break
        }
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
                ({ value, offset } = decodeTagValue(buffer, offset, type))
                items.push(value)
            }
            value = items
            break
        }
        case TagType.Compound: {
            let object: TagObject = {}
            while (true) {
                const type = buffer.readUInt8(offset)
                offset += 1
                if (type == TagType.End) break
                const len = buffer.readUInt16BE(offset)
                offset += 2
                const name = buffer.toString("utf-8", offset, offset += len)
                ;({ value, offset } = decodeTagValue(buffer, offset, type))
                object[name] = value
            }
            value = object
            break
        }
        case TagType.IntArray: {
            const len = buffer.readUInt32BE(offset)
            offset += 4
            if (offset + len * 4 > buffer.length) throw new RangeError("Out of bounds")
            const dataview = new DataView(buffer.buffer, offset + buffer.byteOffset)
            const array = new Int32Array(len)
            for (let i = 0; i < len; i++) {
                array[i] = dataview.getInt32(i * 4, false)
            }
            offset += array.buffer.byteLength
            value = array
            break
        }
        case TagType.LongArray: {
            const len = buffer.readUInt32BE(offset)
            offset += 4
            if (offset + len * 8 > buffer.length) throw new RangeError("Out of bounds")
            const dataview = new DataView(buffer.buffer, offset + buffer.byteOffset)
            const array = new BigInt64Array(len)
            for (let i = 0; i < len; i++) {
                array[i] = dataview.getBigInt64(i * 8, false)
            }
            offset += array.buffer.byteLength
            value = array
            break
        }
        default: throw new Error(`Tag type ${type} not implemented`)
    }
    return { value: <Tag>value, offset }
}

export function encodeTagValue(tag: Tag, buffer = Buffer.alloc(1024), offset = 0) {
    // since most of the data types are smaller than 8 bytes, allocate this amount
    buffer = accommodate(buffer, offset, 8)

    if (tag instanceof Byte) {
        offset = buffer.writeInt8(tag.value, offset)
    } else if (tag instanceof Short) {
        offset = buffer.writeInt16BE(tag.value, offset)
    } else if (tag instanceof Int) {
        offset = buffer.writeInt32BE(tag.value, offset)
    } else if (typeof tag == "bigint") {
        offset = buffer.writeUInt32BE(Number(tag >> 32n), offset)
        offset = buffer.writeUInt32BE(Number(tag & 0xffffffffn), offset)
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
        const dataview = new DataView(buffer.buffer, offset + buffer.byteOffset)
        for (let i = 0; i < tag.length; i++) {
            dataview.setInt32(i * 4, tag[i], false)
        }
        offset += tag.byteLength
    } else if (tag instanceof BigInt64Array) {
        offset = buffer.writeUInt32BE(tag.length, offset)
        buffer = accommodate(buffer, offset, tag.byteLength)
        const dataview = new DataView(buffer.buffer, offset + buffer.byteOffset)
        for (let i = 0; i < tag.length; i++) {
            dataview.setBigInt64(i * 8, tag[i], false)
        }
        offset += tag.byteLength
    } else {
        for (const [key, value] of Object.entries(tag)) {
            offset = buffer.writeUInt8(getTagType(value), offset);
            ({ buffer, offset } = writeString(key, buffer, offset));
            ({ buffer, offset } = encodeTagValue(value, buffer, offset))
        }
        buffer = accommodate(buffer, offset, 1)
        offset = buffer.writeUInt8(0, offset)
    }

    return { buffer, offset }
}
