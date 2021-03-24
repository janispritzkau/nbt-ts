export class Byte {
  constructor(public value: number) { }
  valueOf() { return this.value }
}

export class Short {
  constructor(public value: number) { }
  valueOf() { return this.value }
}

export class Int {
  constructor(public value: number) { }
  valueOf() { return this.value }
}

export class Float {
  constructor(public value: number) { }
  valueOf() { return this.value }
}

export interface TagArray extends Array<Tag> { }

export interface TagObject { [key: string]: Tag }

export interface TagMap extends Map<string, Tag> { }

export type Tag = Byte | Short | Int | bigint | Float | number
  | Int8Array | string | TagArray | TagObject | TagMap | Int32Array | BigInt64Array

export function getTagType(tag: Tag): number {
  if (tag instanceof Byte) return 1
  else if (tag instanceof Short) return 2
  else if (tag instanceof Int) return 3
  else if (typeof tag == "bigint") return 4
  else if (tag instanceof Float) return 5
  else if (typeof tag == "number") return 6
  else if (tag instanceof Int8Array) return 7
  else if (typeof tag == "string") return 8
  else if (tag instanceof Array) return 9
  else if (tag.constructor == Object || tag instanceof Map) return 10
  else if (tag instanceof Int32Array) return 11
  else if (tag instanceof BigInt64Array) return 12
  throw new Error("Invalid tag type")
}
