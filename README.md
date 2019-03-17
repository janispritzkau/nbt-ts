# NBT

An easy to use encoder and decoder for the [NBT format](https://wiki.vg/NBT).
It represents NBT tags close to plain JSON objects with the exception for
some number types that JavaScript does not support.

It represents NBT tags as close as possible to plain JSON objects, with the
exception of some number types that JavaScript does not directly support.
Those types are wrapped in classes, e.g. `Byte`, `Float`.

Node 10.4 or higher is required for BigInts, which are used to represent Longs.

## Example

```js
import { encode, decode, Int, Float } from "mc-nbt"

const buffer = encode("root tag name", {
    int: new Int(123456),
    long: 1040120600380n,
    float: new Float(0.75),
    double: 0.1 + 0.2,
    text: "Hello world",
    longList: [1n, 2n, 3n],
    nested: {
        byteArray: Buffer.from([0x80, 0x40, 0x20])
    }
})

decode(Buffer.from("02000973686F7274546573747FFF", "hex"))
// ⮡ { name: 'shortTest', value: Short { value: 32767 }, offset: 14 }
```
