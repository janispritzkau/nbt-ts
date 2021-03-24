import assert from "assert"
import zlib from "zlib"
import fs from "fs"
import { decode, decodeUnnamed, encode, encodeUnnamed, parse, stringify } from ".."

const bigtestBuffer = zlib.unzipSync(fs.readFileSync("examples/bigtest.nbt"))

// NBT

const { name, tag } = decode(bigtestBuffer)

assert.ok(Buffer.from(encode(name, tag)).equals(bigtestBuffer))

assert.throws(() => encodeUnnamed([1, "a"]))
assert.throws(() => decodeUnnamed(Buffer.from("99", "hex")))
assert.throws(() => decodeUnnamed(Buffer.from("00000b00000001", "hex").slice(2)))

// SNBT

assert.deepStrictEqual(tag, parse(stringify(tag)))
assert.deepStrictEqual(tag, parse(stringify(tag, { pretty: true })))

assert.doesNotThrow(() => {
  parse("{ a: 1f, b: 2.0, }")
  parse("[1, 2,]")
}, "trailing comma")

assert.doesNotThrow(() => {
  parse(`'"'`)
  parse(`{'a': 1, "b": 'c'}`)
}, "single quotes")

assert.throws(() => parse(`{a: `))
assert.throws(() => parse(`{,a: 1}`))
assert.throws(() => parse(`[1,,]`))
assert.throws(() => parse(`[,""]`))

assert.strictEqual(typeof parse("1bb"), "string")
assert.strictEqual(typeof parse("1.0.0"), "string")
