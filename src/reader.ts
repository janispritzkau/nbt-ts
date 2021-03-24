import { Byte, Float, Int, Short, Tag, TagArray, TagMap, TagObject } from "./tag"

export interface TagReaderOptions {
  useMaps?: boolean
}

export class TagReader {
  private buffer: Uint8Array
  private view: DataView
  private pos = 0
  private textDecoder = new TextDecoder()
  private readCompound: () => TagObject | TagMap

  constructor(buffer: Uint8Array, options: TagReaderOptions = {}) {
    this.buffer = buffer
    this.view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
    this.readCompound = options.useMaps ? this.readTagMap : this.readTagObject
  }

  getBytesRead() {
    return this.pos
  }

  readByte(): number {
    const value = this.view.getInt8(this.pos)
    this.pos += 1
    return value
  }

  readShort(): number {
    const value = this.view.getInt16(this.pos)
    this.pos += 2
    return value
  }

  readInt(): number {
    const value = this.view.getInt32(this.pos)
    this.pos += 4
    return value
  }

  readLong(): bigint {
    const value = this.view.getBigInt64(this.pos)
    this.pos += 8
    return value
  }

  readFloat(): number {
    const value = this.view.getFloat32(this.pos)
    this.pos += 4
    return value
  }

  readDouble(): number {
    const value = this.view.getFloat64(this.pos)
    this.pos += 8
    return value
  }

  readString() {
    const length = this.readShort()
    return this.textDecoder.decode(this.buffer.subarray(this.pos, this.pos += length))
  }

  readTagObject() {
    const value: TagObject = {}
    while (true) {
      const type = this.readByte()
      if (type == 0) break
      const key = this.readString()
      value[key] = this.read(type)
    }
    return value
  }

  readTagMap() {
    const value: TagMap = new Map()
    while (true) {
      const type = this.readByte()
      if (type == 0) break
      const key = this.readString()
      value.set(key, this.read(type))
    }
    return value
  }

  read(type: number): Tag {
    if (type == 1) {
      return new Byte(this.readByte())
    } else if (type == 2) {
      return new Short(this.readShort())
    } else if (type == 3) {
      return new Int(this.readInt())
    } else if (type == 4) {
      return this.readLong()
    } else if (type == 5) {
      return new Float(this.readFloat())
    } else if (type == 6) {
      return this.readDouble()
    } else if (type == 7) {
      const length = this.readInt()
      return new Int8Array(this.buffer.subarray(this.pos, this.pos += length))
    } else if (type == 8) {
      return this.readString()
    } else if (type == 9) {
      const type = this.readByte()
      const length = this.readInt()
      const value: TagArray = []
      for (let i = 0; i < length; i++) {
        value.push(this.read(type))
      }
      return value
    } else if (type == 10) {
      return this.readCompound()
    } else if (type == 11) {
      const length = this.readInt()
      const value = new Int32Array(length)
      for (let i = 0; i < length; i++) {
        value[i] = this.readInt()
      }
      return value
    } else if (type == 12) {
      const length = this.readInt()
      const value = new BigInt64Array(length)
      for (let i = 0; i < length; i++) {
        value[i] = this.readLong()
      }
      return value
    } else {
      throw new Error(`Invalid tag type ${type}`)
    }
  }
}
