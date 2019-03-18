import { Tag, TagType, Byte, Float, Int, Short, getTagType, TagObject } from "./tag"

function accommodate(buffer: Buffer, offset: number, size: number) {
    if (buffer.length >= offset + size) return buffer
    return Buffer.concat([buffer, Buffer.alloc(buffer.length)])
}


export function decodeTag(buffer: Buffer, offset: number, type: number) {
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
                ({ value, offset } = decodeTag(buffer, offset, type))
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
                ;({ value, offset } = decodeTag(buffer, offset, type))
                object[name] = value
            }
            value = object
            break
        }
        case TagType.IntArray: {
            const len = buffer.readUInt32BE(offset)
            offset += 4
            value = new Int32Array(buffer.buffer.slice(offset, offset += len * 4))
            break
        }
        case TagType.LongArray: {
            const len = buffer.readUInt32BE(offset)
            offset += 4
            value = new BigInt64Array(buffer.buffer.slice(offset, offset += len * 8))
            break
        }
        default: throw new Error(`Tag type ${type} not implemented`)
    }
    return { value: <Tag>value, offset }
}

interface DecodeResult {
    name?: string
    value?: Tag
    offset: number
}

export function decode(buffer: Buffer, offset = 0): DecodeResult {
    const type = buffer.readUInt8(offset)
    offset += 1
    if (type == TagType.End) return { offset }
    const len = buffer.readUInt16BE(offset)
    offset += 2
    const name = buffer.toString("utf-8", offset, offset += len)
    return { name, ...decodeTag(buffer, offset, type) }
}

function writeString(text: string, buffer: Buffer, offset: number) {
    const data = Buffer.from(text)
    buffer = accommodate(buffer, offset, data.length + 2)
    offset = buffer.writeUInt16BE(data.length, offset)
    data.copy(buffer, offset), offset += data.length
    return { buffer, offset }
}

export function encodeTag(tag: Tag, buffer = Buffer.alloc(1024), offset = 0) {
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
    } else if (tag instanceof Buffer) {
        offset = buffer.writeUInt32BE(tag.length, offset)
        buffer = accommodate(buffer, offset, tag.length)
        tag.copy(buffer, offset), offset += tag.length
    } else if (tag instanceof Array) {
        const type = tag.length > 0 ? getTagType(tag[0]) : TagType.End
        offset = buffer.writeUInt8(type, offset)
        offset = buffer.writeUInt32BE(tag.length, offset)
        for (const item of tag) {
            if (getTagType(item) != type) throw new Error("Odd tag type in list");
            ({ buffer, offset } = encodeTag(item, buffer, offset))
        }
    } else if (typeof tag == "string") {
        ({ buffer, offset } = writeString(tag, buffer, offset))
    } else if (tag instanceof Int32Array) {
        offset = buffer.writeUInt32BE(tag.length, offset)
        buffer = accommodate(buffer, offset, tag.buffer.byteLength)
        Buffer.from(tag.buffer).copy(buffer, offset)
        offset += tag.buffer.byteLength
    } else if (tag instanceof BigInt64Array) {
        offset = buffer.writeUInt32BE(tag.length, offset)
        buffer = accommodate(buffer, offset, tag.buffer.byteLength)
        Buffer.from(tag.buffer).copy(buffer, offset)
        offset += tag.buffer.byteLength
    } else {
        for (const [key, value] of Object.entries(tag)) {
            offset = buffer.writeUInt8(getTagType(value), offset);
            ({ buffer, offset } = writeString(key, buffer, offset));
            ({ buffer, offset } = encodeTag(value, buffer, offset))
        }
        buffer = accommodate(buffer, offset, 1)
        offset = buffer.writeUInt8(0, offset)
    }
    return { buffer, offset }
}

export function encode(name = "", tag: Tag) {
    let buffer = Buffer.alloc(1024), offset = 0
    offset = buffer.writeUInt8(getTagType(tag), offset);
    ({ buffer, offset } = writeString(name, buffer, offset));
    ({ buffer, offset } = encodeTag(tag, buffer, offset))
    return buffer.slice(0, offset)
}

export { Tag, TagObject, TagType, Byte, Short, Int, Float, getTagType }
