import fs from "fs"
import zlib from "zlib"
import { decode, decodeUnnamed, encode } from "../src"

console.log(decode(fs.readFileSync("examples/hello_world.nbt")))

const bigTestBuffer = zlib.unzipSync(fs.readFileSync("examples/bigtest.nbt"))
const result = decode(bigTestBuffer)

console.log(result)

// Buffer should be the same after encoding again.
console.log(Buffer.from(encode(result.name, result.tag)).equals(bigTestBuffer))

console.log(decodeUnnamed(Buffer.from("01ff", "hex")))

console.log(decode(Buffer.from("0a0000010000ff00", "hex"), { useMaps: true }))
