import {isArray, isObject, isString, isNumber, isBoolean, isInteger, isFunction} from "lodash";

const types = {};

let verify = null;

function get(obj) {
    if (obj === null) return "?";
    if (obj === undefined) return "?";
    if (isArray(obj)) return "array";
    if (isObject(obj)) return "object";
    if (isString(obj)) return "s";
    if (isInteger(obj)) return "i";
    if (isBoolean(obj)) return "b";
    if (isNumber(obj)) return "n";
    if (isFunction(obj)) return "f";
    return "?";
}

function add(k, fn) {
    // support enum types
    if (isArray(fn)) {
        fn = ((lk => {
            return (v) => {
                if (v !== undefined) return !isString(v) || lk.indexOf(v) >= 0;
                else return lk[(Math.random() * lk.length) | 0];
            }
        }))(fn);
    }
    if (!isArray(k)) k = [k];
    k.forEach(n => {
        types[n] = fn;
    });
}

function has(k) {
    return !!types[k];
}

function check(k, obj, opts) {
    if (!has(k)) return false;
    return types[k](obj, opts);
}

function sample(k) {
    if (!has(k)) return null;
    return types[k]();
}

add(["string","s"], (v) => v !== undefined ? isString(v) : "");
add(["number","n"], (v) => v !== undefined ? isNumber(v) : 0);
add(["boolean","b"], (v) => v !== undefined ? isBoolean(v) : true);
add(["integer","i"], (v) => v !== undefined ? isInteger(v) : 0);
add(["function","f"], (v) => v !== undefined ? isFunction(v) : () => {});

export {add, get, has, check, sample, verify};