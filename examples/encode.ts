import { encode, decode, Byte, Short, Int, Float, encodeUnnamed } from "../src"

const buffer = encode("root", {
  byte: new Byte(-1),
  short: new Short(65535),
  int: new Int(-214748364),
  long: 0x7fffffffffffffffn,
  float: new Float(0.75),
  double: 0.1 + 0.2,
  string: "Hello world",
  list: ["item 1", "item 2"],
  compound: {
    byteArray: new Int8Array([0x80, 0x40, 0x20]),
    intArray: new Int32Array([1, 2, 3, 4]),
    longArray: new BigInt64Array([1n, 2n, 3n, 4n])
  },
})

console.log(decode(buffer))

console.log(encode("a", {}))
console.log(encodeUnnamed(""))
