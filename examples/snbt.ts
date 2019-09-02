import { stringify, parse } from "../src"

console.log(stringify({ json: `{"text":"Hello"}` }))

console.log(stringify({ $: `Hellow` }))

console.log(stringify({
    a: [1/4, 1 / 3],
    b: new Int32Array(8)
}, { quote: "single", pretty: true }))

console.log(parse(`{id:"minecraft:diamond_sword",Count:1b,tag:{ench:[{lvl:5s,id:16s},{lvl:3s,id:21s}],RepairCost:6,display:{Name:"Resilience"}},Damage:0s}`))
