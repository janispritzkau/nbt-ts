import { stringify } from "../src"

console.log(stringify({ a: `{"b": "c"}` }))
console.log(stringify({ a: `It's me` }))
console.log(stringify({ a: "", b: .1 + .2, c: new Int32Array(16) }, { quote: "single", pretty: true }))
