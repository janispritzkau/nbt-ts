import * as nbt from "."

export function stringify(tag: nbt.Tag, pretty = false): string {
    const space = " ".repeat(4)

    function stringify(tag: nbt.Tag, depth: number): string {
        if (tag instanceof nbt.Byte) return `${tag.value}b`
        else if (tag instanceof nbt.Short) return `${tag.value}s`
        else if (tag instanceof nbt.Int) return `${tag.value | 0}`
        else if (typeof tag == "bigint") return `${tag}l`
        else if (tag instanceof nbt.Float) return `${tag.value}f`
        else if (typeof tag == "number") return Number.isInteger(tag) ? `${tag}.0` : tag.toString()
        else if (typeof tag == "string") return `"${tag.replace('"', '\\"')}"`
        else if (tag instanceof Buffer || tag instanceof Int8Array) return `[B;${[...tag].join(",")}]`
        else if (tag instanceof Int32Array) return `[I;${[...tag].join(",")}]`
        else if (tag instanceof BigInt64Array) return `[L;${[...tag].join(",")}]`
        else if (tag instanceof Array) {
            const list = tag.map(tag => stringify(tag, depth + 1))
            if (list.reduce((acc, x) => acc + x.length, 0) > 70 || list.some(text => text.includes("\n"))) {
                return `[\n${list.map(text => space.repeat(depth) + text).join(",\n")}\n${space.repeat(depth - 1)}]`
            } else {
                return `[${list.join(pretty ? ", " : ",")}]`
            }
        } else {
            const pairs = (tag instanceof Map ? [...tag] : Object.entries(tag)).map(([key, tag]) => {
                if (!/^[a-zA-Z0-9._+-]+$/.test(key)) {
                    key = `"${key.replace('"', '\\"')}"`
                }
                return `${key}:${pretty ? " " : ""}${stringify(tag, depth + 1)}`
            })
            if (pretty && pairs.reduce((acc, x) => acc + x.length, 0) > 70) {
                return `{\n${pairs.map(text => space.repeat(depth) + text).join(",\n")}\n${space.repeat(depth - 1)}}`
            } else {
                return pretty ? `{ ${pairs.join(", ")} }` : `{${pairs.join(",")}}`
            }
        }
    }
    return stringify(tag, 1)
}

export function parse(text: string) {
    let index = 0, i = 0, char = ""

    const unexpectedEnd = () => new Error("Unexpected end")
    const unexpectedChar = (i?: number) => {
        if (i == null) i = index
        return new Error(`Unexpected character ${text[index]} at position ${index}`)
    }

    function skipWhitespace() {
        while (index < text.length) {
            if (text[index] != " " && text[index] != "\n") return
            index += 1
        }
    }

    function parseNumber() {
        if (!"-0123456789".includes(text[index])) return null
        i = index++
        let hasFloatingPoint = false
        while (index < text.length) {
            char = text[index++]
            if ("0123456789".includes(char)) {
                continue
            } else if (char == ".") {
                if (hasFloatingPoint) return (index-- , null)
                hasFloatingPoint = true
            } else if (char == "f") {
                return new nbt.Float(+text.slice(i, index - 1))
            } else if (char == "d") {
                return +text.slice(i, index - 1)
            } else if (char == "b") {
                return new nbt.Byte(+text.slice(i, index - 1))
            } else if (char == "s") {
                return new nbt.Short(+text.slice(i, index - 1))
            } else if (char == "l") {
                return BigInt(text.slice(i, index - 1))
            } else if (hasFloatingPoint) {
                return +text.slice(i, --index)
            } else return new nbt.Int(+text.slice(i, --index))
        }
        if (hasFloatingPoint) return +text.slice(i, index)
        else return new nbt.Int(+text.slice(i, index))
    }

    function parseUnquotedString(fail = false) {
        i = index
        while (index < text.length) {
            if (!/^[a-zA-Z0-9._+-]$/.test(text[index])) break
            index++
        }
        if (index - i == 0) throw index == text.length ? unexpectedEnd() : unexpectedChar()
        return text.slice(i, index)
    }

    function parseQuotedString() {
        i = ++index
        let string = ""
        while (index < text.length) {
            char = text[index++]
            if (char == "\\") {
                string += text.slice(i, index - 1) + text[index]
                i = ++index
            } else if (char == '"') return string + text.slice(i, index - 1)
        }
        throw unexpectedEnd()
    }

    function parseString() {
        if (text[index] == '"') return parseQuotedString()
        else return parseUnquotedString()
    }

    function skipCommas(isFirst: boolean, end: string) {
        skipWhitespace()
        if (text[index] == ",") {
            if (isFirst) throw unexpectedChar()
            else index++ , skipWhitespace()
        } else if (!isFirst && text[index] != end) {
            throw unexpectedChar()
        }
    }

    function parseCompound() {
        const object: nbt.TagObject = {}
        let first = true
        while (true) {
            skipCommas(first, "}"), first = false
            if (text[index] == "}") return (index++ , object)
            const key = parseString()
            if (text[index++] != ":") throw unexpectedChar()
            object[key] = parse() as any
        }
    }

    function parseArray(type: string) {
        const array: string[] = []
        while (index < text.length) {
            skipCommas(array.length == 0, "]")
            if (text[index] == "]") {
                index++
                if (type == "B") return Buffer.from(array.map(v => +v))
                else if (type == "I") return Int32Array.from(array.map(v => +v))
                else if (type == "L") return BigInt64Array.from(array.map(v => BigInt(v)))
            }
            i = index
            if (text[index] == "-") index++
            while (index < text.length) {
                if (!"0123456789".includes(text[index])) break
                index++
            }
            if (index - i == 0) throw unexpectedChar()
            if (!"\n ],".includes(text[index])) throw unexpectedChar()
            array.push(text.slice(i, index))
        }
        throw unexpectedEnd()
    }

    function parseList() {
        if ("BIL".includes(text[index]) && text[index + 1] == ";") {
            return parseArray(text[(index += 2) - 2])
        }
        const array: nbt.TagArray = []
        while (index < text.length) {
            skipWhitespace()
            if (text[index] == ",") {
                if (array.length == 0) throw unexpectedChar()
                else index++ , skipWhitespace()
            } else if (array.length > 0 && text[index] != "]") {
                throw unexpectedChar(index - 1)
            }
            if (text[index] == "]") return (index++ , array)
            array.push(parse() as any)
        }
        throw unexpectedEnd()
    }

    function parse() {
        skipWhitespace()
        i = index, char = text[index]
        if (char == "{") return (index++ , parseCompound())
        else if (char == "[") return (index++ , parseList())
        else if (char == '"') return parseQuotedString()
        const value = parseNumber()
        if (value != null && (index == text.length || "\n ,]}".includes(text[index]))) return value
        return text.slice(i, index) + parseUnquotedString(true)
    }

    const value = parse()
    return value
}
