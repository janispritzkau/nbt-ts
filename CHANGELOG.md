# Changelog

All notable changes to this library will be documented here.

## 1.2.5

- Fixed bug with encoding and decoding `null` tags.

## 1.2.1

- Fixed a few bugs with SNBT parsing and serialization.

## 1.2.0

- Added support for stringified NBT tags.

## 1.1.0

- Added support for `Int8Array`s in encode function.
- Switched to using node's buffer bigint methods with temporary shim until
node 12 reaches _active LTS_ stage.

## 1.0.5

- Fixed bug with dataview in array conversion.

## 1.0.4

- Added basic tests for encoding and decoding.

## 1.0.0

- First major release since the API is mostly stable.
- Allow `null` as tag value in encode function.

## 0.1.2

- Added support for int arrays and long arrays.

## 0.1.0

- Initial release
