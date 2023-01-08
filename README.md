# Alt JSON Schema

Easily verify and even shape JSON objects using a simplified alternative JSON schema syntax

# Installation

```JavaScript
npm install -s @sleeksky/alt-schema

const {verify, check, shape, toAltSchema, extendTypes } = require('@sleeksky/alt-schema')

import { verify, check, shape, toAltSchema, extendTypes } from '@sleeksky/alt-schema';
```
# Background

The official [JSON Schema](https://json-schema.org/) and various JSON validation libraries are great but for most of my use cases, I found them pretty verbose. I was looking for a one line solution for my JSON schema verifications.

I came up with this schema initially as a way to catch UI errors when backend APIs changed, but later found it to be very handy for many other use cases as well. Think of "Alt JSON Schema" as a short hand for defining JSON schemas.

The fact that it is a shorthand, also means it is lossy in terms of use case coverage. It will not address every use case, but for most practical purposes this might suffice.

# Alt JSON Schema Syntax

Alt JSON schema is a string only representation of schema of any JSON.

There are few basic elements that form a alt JSON schema:
1. **type**: A type could be any custom or basic data-type. It could be user defined. It is identified by a string. Example: `integer`, `boolean`, etc.
2. **key:type** pairs: A object (hash) schema can be thought of as a list of `key:type` pairs. Thus I could define `{"foo":"bar"}` using a schema `"{foo:string}"`. A data-type that is also optional can be represented by prefixing it with a `?`. Example: `"{foo:?string}"`, which then would be a valid schema for both `{}` and `{"foo":null}`.
3. **type:example**: A `type:example` pair can be used instead of just `type` when shaping JSON, where the _example_ is the default value to fill missing attributes. Example: Shaping `{}` using `"{foo:s:bar}"` would provide a JSON object of `{"foo":"bar"}`.
4. **Objects / Hash**: An `object` is represented using curly braces  `"{}` consiting of `key:type` pairs separated by comma. Example: `"{foo:string,bar:integer}"`
5. **Arrays / Lists**: An `array` is represented using square backet `"[]"` consisting of `type`, separated by comma. Multiple _types_ in an Array is meant to represent Array's with different _types_ at different indexes.

You can use the above elements to define the schema for any arbitrarily complex JSON object. 

_Note: Since alt JSON schema is a shorthand, the schemas will always validate against some variations of the object as well, that in few edge scenarios may be undesirable._

### Alt JSON Schema Example
```JavaScript
let json = {"a":"foo", "b":1, "c": [1,2], "d": {"e": null}}

// A possible schema for the above JSON
let schema = "{a:s, b:i, c:[i], d:{e:?}}";

// Since types can be custom defined, s=string, i=integer

// Spaces/newlines are to be ignored
```

# toAltSchema
Use this to build a schema automatically for any JSON object.
```JavaScript
const {toAltSchema} = require('@sleeksky/alt-schema');

let json = {"a":"foo", "b":1, "c": [1,2], "d": {"e": null}};

let schema = toAltSchema(json);

console.log(schema); 
// {a:s,b:i,c:[i],d:{e:?}} 
// See section - Built in types
```

# verify
Verify any JSON object against a schema. This method throws an exception when validation fails.
```JavaScript
const { verify } = require("@sleeksky/alt-schema");

let schema = "{a:i,b:[i],c:?b}";
let object = {"a":1, "b":[1,2,3], "c": 10}
verify(object, schema); 
// Throws error: 'json.c: validation failed'
```
For complex json validation, you can get a list of path's where validation failed via `errros` attribute of the error thrown -
```JavaScript
const { verify } = require("@sleeksky/alt-schema");
try {
  verify({}, '{a:i, b:i}')
} catch (e) {
  console.log(e.message); // validation failed: 2 errors
  console.log(e.errors); // [['json.a', 'validation failed'],['json.b', 'validation failed']]
}
```

You can use verify as an alternative to TypeScript in ES5/ES6 code by using setEnv. Calling `verify()` will not do anything when the env is not `development`
```JavaScript
const { verify, setEnv } = require("@sleeksky/alt-schema");

setEnv("development");
verify({a:1}, "{a:s}"); // Throws an error

setEnv("production");
verify({a:1}, "{a:s}") // returns undefined

```

# check
Same as verify except returns boolean instead of throwing error
```JavaScript
const {check} = require("@sleeksky/alt-schema");

let schema = "{a:i,b:[i],c:?b}";
let object = {"a":1, "b":[1,2,3], "c": 10}
check(object, schema); 
// false
```

# shape
Returns an object in the shape of the schema, making best effort of using values from the data object.
```JavaScript
const {shape} = require("@sleeksky/alt-schema");

let schema = "{a:i,b:[i],c:b}";
let object = {"a":1, "b":[1], "d": 1}
shape(object, schema); 
// {"a": 1, "b":[1], "c":true}
```

# extendTypes
Add custom type validators and optionally provide default values when shaping objects
```JavaScript
const {shape, extendTypes} = require("@sleeksky/alt-schema");

extendTypes({
  'url': (value) => {
    if (value === undefined) return 'https://example.com'; // shape sample
    return value.match(/^http/) ? true : false;
  }
});

shape(null, "{img:url}");
// {"img": "https://example.com"}
```
# Built in types
The following built in types are available for use:
```JavaScript
"string" or "s": _.isString
"number" or "n": _.isNumber
"boolean" or "b": _.isBoolean
"integer" or "i": _.isInteger

```

# other options
The following config options are supported:
```JavaScript
verify({a:1},"{a:s}", {_path: 'my_property'})

// Throws error: 'my_property.a: validation failed'

shape({},"{a:?s}")
// {a:null}

shape({},"{a?s}", {_optional:true});
// {a: ""}
```

# License

MIT © Yusuf Bhabhrawala, SleekSky LLC
