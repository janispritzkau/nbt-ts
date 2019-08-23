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
const { encode, decode, Byte, Short, Int, Float } = require("nbt-ts")

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
        byteArray: Buffer.from([0x80, 0x40, 0x20]),
        // Int8Array does work here too
        intArray: new Int32Array([1, 2, 3, 4]),
        longArray: new BigInt64Array([1n, 2n, 3n, 4n])
    },
})

decode(Buffer.from("02000973686F7274546573747FFF", "hex"))
// → { name: 'shortTest', value: Short { value: 32767 }, offset: 14 }

// Encode unnamed tag
encode(null, "a")
// → <Buffer 08 00 01 61>

// Decode unnamed tag with `hasName` parameter set to false
decode(Buffer.from("08000161", "hex"), false)
// → { name: null, value: 'a', offset: 4 }

// Decode at offset
decode(Buffer.from("0000010000ff", "hex"), true, 2)
// → { name: '', value: Byte { value: -1 }, offset: 6 }
```

Note that the `encode` function accepts both unsigned numbers such as `255` and signed
numbers like `-1` which are essentially the same in the case of a 8 bit integer.
However when decoded, they will always have the signed representation. If you want
to convert a number to the unsigned representation, you might do something like this:

```js
value & 0xff   // byte
value & 0xffff // short
value | 0      // int
value & 0xffffffffffffffffn // long
// or
BigInt.asUintN(64, value)
```

## SNBT

The NBT format also has a more human readable variant which is called **SNBT**,
short for **stringified NBT**.

The equivalent of the NBT tag shown in the first example would be this in SNBT:

```
{
    byte: -1b,
    short: -1s,
    int: -214748364,
    long: 9223372036854775807l,
    float: 0.75f,
    double: 0.30000000000000004,
    string: "Hello world",
    list: ["item 1", "item 2"],
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

const tag = parse(`{ "Flying": 1b ,} `)
// → { Flying: Byte { value: 1 } }

stringify(tag)
// → '{Flying:1b}'
```
