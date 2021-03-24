import { TagWriter } from "./writer"
import { TagReader } from "./reader"
import { getTagType, Tag } from "./tag"

export * from "./tag"

export function encode(name: string, tag: Tag): Uint8Array {
  const writer = new TagWriter()
  writer.writeByte(getTagType(tag))
  writer.writeString(name)
  writer.write(tag)
  return writer.finish()
}

export function encodeUnnamed(tag: Tag): Uint8Array {
  const writer = new TagWriter()
  writer.writeByte(getTagType(tag))
  writer.write(tag)
  return writer.finish()
}

export interface DecodeOptions {
  useMaps: boolean
}

export function decode(buffer: Uint8Array, options?: DecodeOptions) {
  const reader = new TagReader(buffer, options)
  const type = reader.readByte()

  return {
    name: reader.readString(),
    tag: reader.read(type),
    length: reader.getBytesRead()
  }
}

export function decodeUnnamed(buffer: Uint8Array, options?: DecodeOptions) {
  const reader = new TagReader(buffer, options)
  const type = reader.readByte()

  return {
    tag: reader.read(type),
    length: reader.getBytesRead()
  }
}
