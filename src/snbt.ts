import * as nbt from "."

const unquotedRegExp = /^[0-9A-Za-z.+_-]+$/

export interface StringifyOptions {
    pretty?: boolean
    breakLength?: number
    quote?: "single" | "double"
}

export function stringify(tag: nbt.Tag, options: StringifyOptions = {}): string {
    const pretty = !!options.pretty, breakLength = options.breakLength || 70
    const quoteChar = options.quote == "single" ? "'" : options.quote == "double" ? '"' : null
    const spaces = " ".repeat(4)

    function escapeString(text: string) {
        const q = quoteChar != null
            ? quoteChar
            : text.split('"', 4).length > text.split("'", 4).length ? "'" : '"'
        return `${q}${text.replace(q, `\\${q}`)}${q}`
    }

    function stringify(tag: nbt.Tag, depth: number): string {
        const space = pretty ? " " : "", sep = pretty ? ", " : ","
        if (tag instanceof nbt.Byte) return `${tag.value}b`
        else if (tag instanceof nbt.Short) return `${tag.value}s`
        else if (tag instanceof nbt.Int) return `${tag.value | 0}`
        else if (typeof tag == "bigint") return `${tag}l`
        else if (tag instanceof nbt.Float) return `${tag.value}f`
        else if (typeof tag == "number")
            return Number.isInteger(tag) ? `${tag}.0` : tag.toString()
        else if (typeof tag == "string") return escapeString(tag)
        else if (tag instanceof Buffer
            || tag instanceof Int8Array) return `[B;${space}${[...tag].join(sep)}]`
        else if (tag instanceof Int32Array) return `[I;${space}${[...tag].join(sep)}]`
        else if (tag instanceof BigInt64Array) return `[L;${space}${[...tag].join(sep)}]`
        else if (tag instanceof Array) {
            const list = tag.map(tag => stringify(tag, depth + 1))
            if (list.reduce((acc, x) => acc + x.length, 0) > breakLength
                || list.some(text => text.includes("\n"))) {
                return `[\n${list.map(text => spaces.repeat(depth)
                    + text).join(",\n")}\n${spaces.repeat(depth - 1)}]`
            } else {
                return `[${list.join(sep)}]`
            }
        } else {
            const pairs = (tag instanceof Map ? [...tag] : Object.entries(tag))
                .map(([key, tag]) => {
                    if (!unquotedRegExp.test(key)) key = escapeString(key)
                    return `${key}:${space}${stringify(tag, depth + 1)}`
                })
            if (pretty && pairs.reduce((acc, x) => acc + x.length, 0) > breakLength) {
                return `{\n${pairs.map(text => spaces.repeat(depth)
                    + text).join(",\n")}\n${spaces.repeat(depth - 1)}}`
            } else {
                return `{${space}${pairs.join(sep)}${space}}`
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

    function readNumber() {
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
            } else if (char == "f" || char == "F") {
                return new nbt.Float(+text.slice(i, index - 1))
            } else if (char == "d" || char == "D") {
                return +text.slice(i, index - 1)
            } else if (char == "b" || char == "B") {
                return new nbt.Byte(+text.slice(i, index - 1))
            } else if (char == "s" || char == "S") {
                return new nbt.Short(+text.slice(i, index - 1))
            } else if (char == "l" || char == "L") {
                return BigInt(text.slice(i, index - 1))
            } else if (hasFloatingPoint) {
                return +text.slice(i, --index)
            } else return new nbt.Int(+text.slice(i, --index))
        }
        if (hasFloatingPoint) return +text.slice(i, index)
        else return new nbt.Int(+text.slice(i, index))
    }

    function readUnquotedString() {
        i = index
        while (index < text.length) {
            if (!unquotedRegExp.test(text[index])) break
            index++
        }
        if (index - i == 0) throw index == text.length ? unexpectedEnd() : unexpectedChar()
        return text.slice(i, index)
    }

    function readQuotedString() {
        const quoteChar = text[index]
        i = ++index
        let string = ""
        while (index < text.length) {
            char = text[index++]
            if (char == "\\") {
                string += text.slice(i, index - 1) + text[index]
                i = ++index
            } else if (char == quoteChar) return string + text.slice(i, index - 1)
        }
        throw unexpectedEnd()
    }

    function readString() {
        if (text[index] == '"' || text[index] == "'") return readQuotedString()
        else return readUnquotedString()
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

    function readCompound() {
        const object: nbt.TagObject = {}
        let first = true
        while (true) {
            skipCommas(first, "}"), first = false
            if (text[index] == "}") return (index++ , object)
            const key = readString()
            skipWhitespace()
            if (text[index++] != ":") throw unexpectedChar()
            object[key] = parse() as any
        }
    }

    function readArray(type: string) {
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
            if (unquotedRegExp.test(text[index])) throw unexpectedChar()
            array.push(text.slice(i, index))
        }
        throw unexpectedEnd()
    }

    function readList() {
        if ("BILbil".includes(text[index]) && text[index + 1] == ";") {
            return readArray(text[(index += 2) - 2].toUpperCase())
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
        if (char == "{") return (index++ , readCompound())
        else if (char == "[") return (index++ , readList())
        else if (char == '"' || char == "'") return readQuotedString()

        const value = readNumber()
        if (value != null && (index == text.length || !unquotedRegExp.test(text[index]))) {
            return value
        }
        return text.slice(i, index) + readUnquotedString()
    }

    const value = parse()
    return value
}
