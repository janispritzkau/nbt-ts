import { Byte, Float, getTagType, Int, Short, Tag } from "./tag"

export class TagWriter {
  private buffer: Uint8Array
  private view: DataView
  private pos = 0
  private textEncoder = new TextEncoder()

  constructor() {
    this.buffer = new Uint8Array(32)
    this.view = new DataView(this.buffer.buffer)
  }

  private ensureCapacity(size: number) {
    let newLength = this.buffer.length
    while (newLength < this.pos + size) newLength *= 2

    if (newLength != this.buffer.length) {
      const oldBuffer = this.buffer
      this.buffer = new Uint8Array(newLength)
      this.buffer.set(oldBuffer)
      this.view = new DataView(this.buffer.buffer)
    }
  }

  writeByte(value: number) {
    this.ensureCapacity(1)
    this.view.setInt8(this.pos, value)
    this.pos += 1
  }

  writeShort(value: number) {
    this.ensureCapacity(2)
    this.view.setInt16(this.pos, value)
    this.pos += 2
  }

  writeInt(value: number) {
    this.ensureCapacity(4)
    this.view.setInt32(this.pos, value)
    this.pos += 4
  }

  writeLong(value: bigint) {
    this.ensureCapacity(8)
    this.view.setBigInt64(this.pos, value)
    this.pos += 8
  }

  writeFloat(value: number) {
    this.ensureCapacity(4)
    this.view.setFloat32(this.pos, value)
    this.pos += 4
  }

  writeDouble(value: number) {
    this.ensureCapacity(8)
    this.view.setFloat64(this.pos, value)
    this.pos += 8
  }

  writeBuffer(value: Uint8Array) {
    this.ensureCapacity(value.length)
    this.buffer.set(value, this.pos)
    this.pos += value.length
  }

  writeString(value: string) {
    const buffer = this.textEncoder.encode(value)
    this.writeShort(buffer.length)
    this.writeBuffer(buffer)
  }

  write(tag: Tag) {
    this.ensureCapacity(8)
    if (tag instanceof Byte) {
      this.writeByte(tag.value)
    } else if (tag instanceof Short) {
      this.writeShort(tag.value)
    } else if (tag instanceof Int) {
      this.writeInt(tag.value)
    } else if (typeof tag == "bigint") {
      this.writeLong(tag)
    } else if (tag instanceof Float) {
      this.writeFloat(tag.value)
    } else if (typeof tag == "number") {
      this.writeDouble(tag)
    } else if (tag instanceof Int8Array) {
      this.writeInt(tag.length)
      this.writeBuffer(new Uint8Array(tag.buffer, tag.byteOffset, tag.byteLength))
    } else if (typeof tag == "string") {
      this.writeString(tag)
    } else if (tag instanceof Array) {
      const type = tag.length == 0 ? 0 : getTagType(tag[0])
      this.writeByte(type)
      this.writeInt(tag.length)
      for (const value of tag) {
        this.write(value)
      }
    } else if (tag instanceof Map) {
      for (const [key, value] of tag) {
        this.writeByte(getTagType(value))
        this.writeString(key)
        this.write(value)
      }
      this.writeByte(0)
    } else if (tag instanceof Int32Array) {
      this.writeInt(tag.length)
      this.ensureCapacity(tag.length * 4)
      for (let i = 0; i < tag.length; i++) {
        this.view.setInt32(this.pos, tag[i])
        this.pos += 4
      }
    } else if (tag instanceof BigInt64Array) {
      this.writeInt(tag.length)
      this.ensureCapacity(tag.length * 8)
      for (let i = 0; i < tag.length; i++) {
        this.view.setBigInt64(this.pos, tag[i])
        this.pos += 8
      }
    } else {
      for (const key in tag) {
        this.writeByte(getTagType(tag[key]))
        this.writeString(key)
        this.write(tag[key])
      }
      this.writeByte(0)
    }
  }

  finish() {
    return this.buffer.subarray(0, this.pos)
  }
}
