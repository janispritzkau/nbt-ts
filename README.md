# NBT

An easy to use encoder and decoder for the [NBT format](https://wiki.vg/NBT).

NBT compound tags are represented as plain JavaScript objects. Some types
are wrapped in custom classes since JavaScript does not support different integer
types directly, e.g. `Byte`, `Short`, `Int`, `Float`.

Node 10.4 or higher is required for BigInts, which are used to represent 64 bit integers.

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
