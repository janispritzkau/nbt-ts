const assert = require("assert")
const nbt = require("..")

let tag = [{ string: "abc" }, { short: new nbt.Short(5) }, { big: 9990469871923500n }]
let buffer = nbt.encode(null, tag)

assert.deepStrictEqual(nbt.decode(buffer, false).value, tag)

assert.throws(() => nbt.encode(null, [1, "a"]))
assert.throws(() => nbt.decode(Buffer.from("00", "hex")))
assert.throws(() => nbt.decode(Buffer.from("99", "hex"), false))
assert.throws(() => nbt.encode(new Map))
assert.throws(() => nbt.decode(Buffer.from("00000b00000001", "hex").slice(2), false))
