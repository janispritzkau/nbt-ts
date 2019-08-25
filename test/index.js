const { unzipSync } = require("zlib")
const assert = require("assert")
const fs = require("fs")
const nbt = require("..")

const bigtestBuffer = unzipSync(fs.readFileSync("examples/bigtest.nbt"))

// NBT

const { name, value } = nbt.decode(bigtestBuffer)

assert(nbt.encode(name, value).equals(bigtestBuffer))

assert.throws(() => nbt.encode(null, [1, "a"]))
assert.throws(() => nbt.decode(Buffer.from("00", "hex")))
assert.throws(() => nbt.decode(Buffer.from("99", "hex"), false))
assert.throws(() => nbt.decode(Buffer.from("00000b00000001", "hex").slice(2), false))

nbt.decode(Buffer.from([0]), false)

// SNBT

assert.deepStrictEqual(value, nbt.parse(nbt.stringify(value)))
assert.deepStrictEqual(value, nbt.parse(nbt.stringify(value, true)))

assert.doesNotThrow(() => {
    nbt.parse("{ a: 1f, b: 2.0, }")
    nbt.parse("[1, 2,]")
}, "trailing comma")

assert.doesNotThrow(() => {
    nbt.parse(`'"'`)
    nbt.parse(`{'a': 1, "b": 'c'}`)
}, "single quotes")

assert.throws(() => nbt.parse(`{a: `))
assert.throws(() => nbt.parse(`{,a: 1}`))
assert.throws(() => nbt.parse(`[1,,]`))
assert.throws(() => nbt.parse(`[,""]`))

assert.strictEqual(typeof nbt.parse("1bb"), "string")
assert.strictEqual(typeof nbt.parse("1.0.0"), "string")
