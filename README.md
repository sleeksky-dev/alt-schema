# Flat JSON Schema

An alternate JSON schema specification and related utilities methods to define schemas and to validate and shape JSON objects.

# Background

The official [JSON Schema](https://json-schema.org/) and various JSON validation libraries are great but for most of my use cases, I found them pretty verbose. I was looking for a one line solution to most JSON schema verifications.

I came up with this schema initially as a way to catch UI errors when backend APIs changed, but later found it to be very handy for many other use cases as well. Think of "Flat JSON Schema" as a short hand for defining JSON structures.

The fact that it is a shorthand, also means it is lossy in terms of use case coverage. It will not address every use case, but for most practical purposes this might suffice.

# Flat JSON Schema Syntax

Flat JSON schema is a string only representation of schema of any JSON object.

There are few basic elements that form a flat JSON schema:
1. **type**: A type could be any custom or basic data-type. It could be user defined. It is identified by a string. Example: `integer`, `boolean`, etc.
2. **key:type** pairs: A object (hash) schema can be thought of as a list of `key:type` pairs. Thus I could define `{"foo":"bar"}` using a schema `"{foo:string}"`. A data-type that is also optional can be represented by prefixing it with a `?`. Example: `"{foo:?string}"`, which then would be a valid schema for both `{}` and `{"foo":null}`.
3. **type:example**: A `type:example` pair can be used instead of just `type` when shaping JSON, where the _example_ is the default value to fill missing attributes. Example: Shaping `{}` using `"{foo:s:bar}"` would provide a JSON object of `{"foo":"bar"}`.
4. **Objects / Hash**: An `object` is represented using curly braces  `"{}` consiting of `key:type` pairs separated by comma. Example: `"{foo:string,bar:integer}"`
5. **Arrays / Lists**: An `array` is represented using square backet `"[]"` consisting of `type`, separated by comma. Multiple _types_ in an Array is meant to represent Array's with different _types_ at different indexes.

You can use the above elements to define the schema for any arbitrarily complex JSON object. 

_Note: Since flat JSON schema is a shorthand, the schemas will always validate against some variations of the object as well, that in few edge scenarios may be undesirable._

### Flat JSON Schema Example
```JavaScript
let json = {"a":"foo", "b":1, "c": [1,2], "d": {"e": null}}

// A possible schema for the above JSON
let schema = "{a:s, b:i, c:[i], d:{e:?}}";

// Since types can be custom defined, s=string, i=integer

// Spaces/newlines are to be ignored
```

# Installation

```JavaScript
npm install -s flat-json

const {verify, check, shape, toFlatSchema, addType } = require('flat-json')

import { verify, check, shape, toFlatSchema, addType } from 'flat-json';
```
# toFlatSchema
Use this to build a schema automatically for any JSON object.
```JavaScript
const {toFlatSchema} = require('flat-json');

let json = {"a":"foo", "b":1, "c": [1,2], "d": {"e": null}};

let schema = toFlatSchema(json);

console.log(schema); 
// {a:s,b:i,c:[i],d:{e:?}} 
// See section - Built in types
```

# verify
Verify any JSON object against a schema. This method throws an exception when validation fails.
```JavaScript
const { verify } = require("flat-json");

let schema = "{a:i,b:[i],c:?b}";
let object = {"a":1, "b":[1,2,3], "c": 10}
verify(object, schema); 
// Throws error: 'json.c: validation failed'
```

# check
Same as verify except returns boolean instead of throwing error
```JavaScript
const {check} = require("verify-json");

let schema = "{a:i,b:[i],c:?b}";
let object = {"a":1, "b":[1,2,3], "c": 10}
verify(object, schema); 
// false
```

# shape
Returns an object in the shape of the schema, making best effort of using values from the data object.
```JavaScript
const {shape} = require("verify-json");

let schema = "{a:i,b:[i],c:b}";
let object = {"a":1, "b":[1], "d": 1}
shape(object, schema); 
// {"a": 1, "b":[1], "c":true}
```

# addType
Add custom type validators and optionally provide default values when shaping objects
```JavaScript
const {shape, addType} = require("verify-json");

addType('url', (value) => {
  if (value === undefined) return 'https://example.com'; // shape sample
  return value.match(/^http/) ? true : false;
});

shape(null, "{img:url}");
// {"img": "https://example.com"}
```
# Built in types
The following built in types are available for use:
```JavaScript
addType(["string","s"], _.isString);
addType(["number","n"], _.isNumber);
addType(["boolean","b"], _.isBoolean);
addType(["integer","i"], _.isInteger);

// Note: An array for type name is to specify multiple names for same type.
```
# License

MIT © Yusuf Bhabhrawala
