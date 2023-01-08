/**
 * Author: Yusuf Bhabhrawala
 */

/* eslint-disable nonblock-statement-body-position */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-cond-assign */
import {isArray, isObject} from "lodash";
import AltTypes from "./types";
import AltError from "./alt-error";

const RX = {
  FLAT_ARRAY: /(\[([^\[\]\{\}]*)\])/,
  FLAT_OBJECT: /(\{([^\{\}\[\]]*)\})/,
  MALFORMED: /[\[\]\{\}]/,
  FLAT_SCALAR: /^[^\[\]\{\}]*$/,
  OPTIONAL: /^[\?]/,
  LOOKUP: /^[0-9]+$/,
  DEFAULTS: /^\$([0-9]+)$/
}

let env = null;
const setEnv = (e) => {
  env = e;
}

const _flatten = (schema) => {
  let lookups = [];

  let default_strings = [];
  let m;
  // convert "hello world" to $0. remote " (quotes)
  while(m = schema.match(/"([^"]+)"/)) {
    schema = schema.substr(0, m.index) + `$${default_strings.length}` + schema.substr(m.index + m[0].length);
    default_strings.push(m[1]);
  }
  if (schema.match(/"/)) throw new Error("Missing closing quote");

  // strip all white spaces
  schema = schema.replace(/\s/g, "");

  function reduce(schema) {
    let m;
    let found = false;
    while ((m = schema.match(RX.FLAT_ARRAY)) || (m = schema.match(RX.FLAT_OBJECT))) {
      schema = schema.substr(0, m.index) + lookups.length + schema.substr(m.index + m[0].length);
      lookups.push(m[0]);
      found = true;
    }

    if (found) reduce(schema);
    if (!found && schema.match(RX.MALFORMED) ) {
      throw new Error("Schema error: probably invalid braces or brackets");
    }
    return schema;
  }

  schema = reduce(schema);
  return [schema, lookups, default_strings];
};

function splitOnce(str, delim) {
  let parts = str.split(delim);
  let first = parts.shift();
  return [first, parts.join(delim)];
}

// Set leaf types to format "optional:type:default_value" tuple. Eg. "?:boolean:false" or ":integer:"
const typeShape = (schema) => {
  let [sch, lookups, default_strings] = _flatten(schema);

  function traverse(sch) {
    if (!sch) return "";
    let m;
    if (sch.match(RX.LOOKUP)) return traverse(lookups[sch*1]);
    if (m = sch.match(RX.FLAT_ARRAY)) {
      sch = m[2];
      let schema_parts = sch.split(",");
      return schema_parts.length > 0 ? [traverse(schema_parts[0])] : [traverse("")];
    }
    if (m = sch.match(RX.FLAT_OBJECT)) {
      sch = m[2];
      return sch.split(",").reduce((acc, name) => {
        let [k,v] = splitOnce(name, ":");
        acc[k] = traverse(v);
        return acc;
      }, {});
    }
    if (sch.match(RX.FLAT_SCALAR)) {
      let [type, def] = sch.split(":");
      if (!def) def = "";
      if (def && def.match(RX.DEFAULTS)) def = default_strings[def.substr(1)*1];
      let optional = '';
      if (type.match(RX.OPTIONAL)) {
        optional = '?';
        type = type.substr(1);
      }
      let type_lookup = {i: "integer", n: "number", b: "boolean", s: "string"};
      if (type_lookup[type]) type = type_lookup[type];
      return [optional, type, def].join(':');
    }
  }
  return traverse(sch);
}

const toAltSchema = (json) => {
  function traverse(obj) {
    let type = AltTypes.toSchema(obj);
    if (type === "array") {
      let sch = obj.length > 0 ? traverse(obj[0]) : "";
      return `[${sch}]`;
    }
    if (type === "object") {
      return '{' + Object.keys(obj).map((k,i) => {
        return `${k}:${traverse(obj[k])}`;
      }).join(",") + '}';      
    }
    return type;
  }
  return traverse(json);
};

const shape = (json, schema, options = {}) => {
  const types = new AltTypes(options);
  
  options._optional = options._optional || false;
  let lookups, default_strings;
  [schema, lookups, default_strings] = _flatten(schema);

  const getValue = (type, value, def) => {
    let m;
    if (def && (m = def.match(RX.DEFAULTS))) def = default_strings[m[1] * 1];

    if (types.has(type)) return (value && types.check(type, value)) ? value : (def !== undefined) ? types.cast(type, def) : types.sample(type);

    return value || def || "Not defined!";
  };
  
    // flat validator value = {k:t:d,..} [t:d,..] t:d
  function traverse({ value, schema }) {
    //console.log('traverse', value, schema);
    if (!schema) schema = "";
    let m;
    let optional = false;
    if (schema.match(RX.OPTIONAL)) {
      schema = schema.substr(1);
      optional = true;
    }

    // if lookup, validate further
    if ((m = schema.match(RX.LOOKUP))) return traverse({ value, schema: `${optional?'?':''}${lookups[schema * 1]}` });

    if ((value === null || value === undefined) && optional && !options._optional) return null;

    if (schema.match(RX.FLAT_SCALAR)) {
      // if scalar
      let type, def;
      [type, def] = schema.split(":");
      return getValue(type, value, def);

    } else if ((m = schema.match(RX.FLAT_ARRAY))) {
      // if array
      schema = m[2];
      let schema_parts = schema.split(",");
      if (!isArray(value)) value = schema_parts.map(s => null);
      if (value.length < schema_parts.length) {
        value = value.concat(schema_parts.slice(value.length).map(s => null));
      }
      
      return value.map((v,i) => traverse({ value: v, schema: schema_parts[i % schema_parts.length] }));

    } else if ((m = schema.match(RX.FLAT_OBJECT))) {
      // if object
      if (!isObject(value) || isArray(value)) {
        value = {};
      }
      schema = m[2];
      if (schema === "") return value;

      let wildcard = false;
      let shp = schema.split(",").reduce((acc, name) => {
        let [k, t, d] = name.split(":");
        if (!t) t = "";
        if (d) t += ":" + d;
        if (k === "*") wildcard = t;
        else acc[k] = traverse({ value: value[k], schema: t });
        return acc;
      }, {});
      if (wildcard !== false) {
        for (let k in value) if (shp[k] === undefined) shp[k] = traverse({ value: value[k], schema: wildcard });
      }
      return shp;
      
    }

  }

  let result = traverse({ value: json, schema });
  return result;
};

const verify = (json, schema, options={}) => {
  if (env && env !== "development") return;
  const types = new AltTypes(options);
  let errors = [];
  let jsonPath = options._path || 'json';

  let lookups;
  [schema, lookups] = _flatten(schema);

  //console.log("lookups", lookups);

  // flat validator value = {k:t:d,..} [t:d,..] t:d
  function validate({ path, value, schema, parent = null }) {
    //console.log("validate", value, schema);
    let m;
    let type = null;

    let optional = false;
    if (schema.match(RX.OPTIONAL)) {
      schema = schema.substr(1);
      if (value === undefined || value === null) return true;
      optional = true;
    }

    // if lookup, validate further
    if ((m = schema.match(RX.LOOKUP))) return validate({ path: `${path}`, value, schema: `${optional?'?':''}${lookups[schema * 1]}`, parent: parent });

    if (schema.match(RX.FLAT_SCALAR)) {
      // if scalar
      let def;
      [schema, def] = schema.split(":");
      if (value === undefined || value === null) {
        errors.push([path, 'is required']);
        return false;
      }

      if (schema === "") return true; // no validation needed

      if (!types.has(schema)) throw new Error(`Schema error: Validator - ${schema} - not found`);
      else if (types.check(schema, value, { path, json, parent })) return true;
      else {
        errors.push([path, 'validation failed']);
        return false;
      }
    } else if ((m = schema.match(RX.FLAT_ARRAY))) {
      // if array
      if (!isArray(value)) {
        errors.push([path, 'should be array']);
        return false;
      }
      schema = m[2];
      let schema_parts = schema.split(",");
      for (let i in value) {
        validate({ path: `${path}.${i}`, value: value[i], schema: schema_parts[i % schema_parts.length], parent: value });
      }
    } else if ((m = schema.match(RX.FLAT_OBJECT))) {
      // if object
      if (!isObject(value) || isArray(value)) {
        errors.push([path, 'should be object']);
        return false;
      }
      schema = m[2];
      let wildcard = false;
      if (schema !== "") {
        let keys = schema.split(",").reduce((acc, name) => {
          let [k, t] = name.split(":");
          if (!t) t = "";
          if (k === '*') wildcard = t;
          else acc[k] = t;
          return acc;
        }, {});

        if (wildcard !== false) for (let k in value) if (keys[k] === undefined) keys[k] = wildcard;
  
        // if object, validate for all k-v
        for (let k in keys) validate({ path: `${path}.${k}`, value: value[k], schema: keys[k], parent: value });
      }
    }

  }

  validate({ path: jsonPath, value: json, schema });
  if (errors.length > 0) throw new AltError(errors);

  return true;
};

// same as verify. returns boolean. won't throw.
const check = (json, schema, options) => {
  try {
    verify(json, schema, options);
    return true;
  } catch (error) {
    if (error.message.match(/^Schema error/)) throw error;
    return false;
  }
};
const extendTypes = (types) => { 
  AltTypes.extend(types);
}

exports = module.exports = { verify, check, shape, toAltSchema, _flatten, typeShape, extendTypes, setEnv };

export { verify, check, shape, toAltSchema, _flatten, typeShape, extendTypes, setEnv };
