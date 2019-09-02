import { readFileSync } from "fs"
import { unzipSync } from "zlib"
import { decode, encode } from "../src"

console.log(decode(readFileSync("examples/hello_world.nbt")))

const bigTestBuffer = unzipSync(readFileSync("examples/bigtest.nbt"))
const result = decode(bigTestBuffer)

console.log(result)

// Buffer should be the same after encoding again.
console.log(encode(result.name, result.value).equals(bigTestBuffer))

console.log(decode(Buffer.from("01ff", "hex"), { unnamed: true }))

console.log(decode(Buffer.from("0a0000010000ff00", "hex"), { useMaps: true }))
