import { readFileSync } from "fs"
import { unzipSync } from "zlib"
import { decode, encode } from "../src"

console.log(decode(readFileSync("examples/hello_world.nbt")))

const bigTestBuffer = unzipSync(readFileSync("examples/bigtest.nbt"))
const result = decode(bigTestBuffer)

console.log(result)
console.log(encode(result.name, result.value).equals(bigTestBuffer))
