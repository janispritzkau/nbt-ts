const { unzipSync } = require("zlib")
const assert = require("assert")
const fs = require("fs")
const nbt = require("..")

const bigtestBuffer = unzipSync(fs.readFileSync("examples/bigtest.nbt"))

// NBT

const { name, value } = nbt.decode(bigtestBuffer)

assert(nbt.encode(name, value).equals(bigtestBuffer))

assert.throws(() => nbt.encode(null, [1, "a"]))
assert.throws(() => nbt.decode(Buffer.from("99", "hex"), { unnamed: true }))
assert.throws(() => nbt.decode(Buffer.from("00000b00000001", "hex").slice(2), { unnamed: true }))

nbt.decode(Buffer.from([0]), false)

// SNBT

assert.deepStrictEqual(value, nbt.parse(nbt.stringify(value)))
assert.deepStrictEqual(value, nbt.parse(nbt.stringify(value, { pretty: true })))

assert.doesNotThrow(() => {
    nbt.parse("{ a: 1f, b: 2.0, }")
    nbt.parse("[1, 2,]")
}, "trailing comma")

assert.doesNotThrow(() => {
    nbt.parse(`'"'`)
    nbt.parse(`{'a': 1, "b": 'c'}`)
}, "single quotes")

// Whitespace (Java's Character.isWhitespace)

const expected = { a: new nbt.Int(1), b: [new nbt.Int(2), new nbt.Int(3)] }

assert.deepStrictEqual(nbt.parse("{\ta:\t1,\tb:\t[2,\t3]\t}"), expected, "tabs")
assert.deepStrictEqual(nbt.parse("{\r\n  a: 1,\r\n  b: [\r\n    2,\r\n    3\r\n  ]\r\n}"), expected, "CRLF")
assert.deepStrictEqual(nbt.parse("{ \t\r\n\u000B\fa\u001C:\u001D1\u001E,\u001Fb\u2003:\u3000[2\u2028,\u20293\u205F]\u1680}"), expected, "mixed whitespace")
assert.deepStrictEqual(nbt.parse("\t\r\n[I;\t1,\r\n2\t]"), Int32Array.from([1, 2]), "whitespace in typed arrays")

// Non-breaking spaces are not whitespace in Java
for (const nbsp of ["\u00A0", "\u2007", "\u202F"]) {
    assert.throws(() => nbt.parse(`{${nbsp}a: 1}`), `non-breaking space U+${nbsp.charCodeAt(0).toString(16)}`)
}

assert.throws(() => nbt.parse(`{a: `))
assert.throws(() => nbt.parse(`{,a: 1}`))
assert.throws(() => nbt.parse(`[1,,]`))
assert.throws(() => nbt.parse(`[,""]`))

assert.strictEqual(typeof nbt.parse("1bb"), "string")
assert.strictEqual(typeof nbt.parse("1.0.0"), "string")
