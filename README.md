# NBT

[![npm](https://img.shields.io/npm/v/nbt-ts.svg)](https://www.npmjs.com/package/nbt-ts)
[![downloads](https://img.shields.io/npm/dm/nbt-ts.svg)](https://www.npmjs.com/package/nbt-ts)

An easy to use encoder and decoder for the [NBT format](https://wiki.vg/NBT).

NBT compound tags are represented as plain JavaScript objects. The `Byte`, `Short`,
`Int` and `Float` number types are wrapped in custom classes since JavaScript
does not support them directly.

Node 10.4 or higher is required for BigInts, which are used to represent 64 bit integers.

## Usage

```js
const { encode, encodeUnnamed, decode, decodeUnnamed, Byte, Short, Int, Float } = require("nbt-ts")

const buffer = encode("root", {
    byte: new Byte(-1),
    short: new Short(65535),
    int: new Int(-2147483648),
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

decode(Buffer.from("02000973686F7274546573747FFF", "hex"))
// { name: 'shortTest', tag: Short { value: 32767 }, length: 14 }

encodeUnnamed("a")
// Uint8Array(4) [ 8, 0, 1, 97 ]

decodeUnnamed(Buffer.from("08000161", "hex"))
// { tag: 'a', length: 4 }
```

Note that the `encode` function accepts both unsigned numbers like `255` and signed numbers like `-1`, which are essentially the same in the case of an 8-bit integer. However, when decoded, they always have the signed representation. If you want to convert a number to the unsigned representation, you could do something like this:

```js
// convert byte to unsigned byte
value & 0xff
// convert short to unsigned short
value & 0xffff
// convert int to unsigned int
value >>> 0
// convert long to unsigned long
BigInt.asUintN(64, value)
value & 0xffffffffffffffffn
```

## SNBT

The NBT format also has a more user-friendly variant in plain text. This format
is referred to as **SNBT**, short for **stringified NBT**.
Here are all the types represented in SNBT:

```
{
    byte: 1b, short: 1s, int: 1, long: 1l,
    float: 0.5f, double: 0.5,
    string: "Hello world",
    list: [{}, {}],
    compound: {
        byteArray: [B; 128, 64, 32],
        intArray: [I; 1, 2, 3, 4],
        longArray: [L; 1, 2, 3, 4]
    }
}
```

Here is an example how you can stringify or parse SNBT:

```js
const { stringify, parse } = require("nbt-ts")

const tag = parse(`{'Flying' :1b , unquoted: hello} `)
// → { Flying: Byte { value: 1 }, unquoted: 'hello' }

stringify(tag)
// → '{Flying:1b,unquoted:"hello"}'
```

## Related projects

- [`mc-chat-format`](https://github.com/janispritzkau/mc-chat-format).
    Converts and formats Minecraft's JSON Chat components.
- [`mcproto`](https://github.com/janispritzkau/mcproto) (Minecraft protocol implementation)
- [`rcon-client`](https://github.com/janispritzkau/rcon-client)
