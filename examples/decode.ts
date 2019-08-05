import { readFileSync } from "fs"
import { unzipSync } from "zlib"
import { decode } from "../src"

console.log(decode(Buffer.from("02000973686F7274546573747FFF", "hex")))
console.log(decode(readFileSync("examples/hello_world.nbt")))
console.log(decode(unzipSync(readFileSync("examples/bigtest.nbt"))).value)
