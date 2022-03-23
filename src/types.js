import {isArray, isObject, isString, isNumber, isBoolean, isInteger, isFunction} from "lodash";

class AltTypes {
    constructor(types) {
        this.types = Object.assign({}, this.constructor.TYPES);
        for (let k in types) {
            if (k.match(/^_/)) continue;
            let fn = types[k];
            this.types[k] = this.constructor._toType(fn);
        }
    }

    static _toType(fn) {
        if (isArray(fn)) {
            fn = ((lk => {
                return (v) => {
                    if (v !== undefined) return !isString(v) || lk.indexOf(v) >= 0;
                    else return lk[(Math.random() * lk.length) | 0];
                }
            }))(fn);
        }
        return fn;
    }

    static extend(obj) {
        for (let k in obj) {
            this.TYPES[k] = this._toType(obj[k]);
        }
    }

    static toSchema(obj) {
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

    sample(k) {
        if (!this.has(k)) return null;
        return this.types[k]();
    }

    has(k) {
        return !!this.types[k];
    }

    cast(k, value) {
        if (!this.has(k)) return null;
        if (["b","boolean"].indexOf(k) >= 0) {
            if (["true","1","yes", true]) return true;
            return false;
        }
        if (["i","integer"].indexOf(k) >= 0) return parseInt(value);        
        if (["n","number"].indexOf(k) >= 0) return parseFloat(value);

        return value;
    }
    
    check(k, obj, opts) {
        if (!this.has(k)) return false;
        return this.types[k](obj, opts);    
    }

    show() {
        let obj = {};
        for (let k in this.types) {
            obj[k] = this.types[k]();
        }
        return obj;
    }

}

AltTypes.TYPES = {
    "s": (v) => v !== undefined ? isString(v) : "",
    "string": (v) => v !== undefined ? isString(v) : "",
    "n": (v) => v !== undefined ? isNumber(v) : 0,
    "number": (v) => v !== undefined ? isNumber(v) : 0,
    "b": (v) => v !== undefined ? isBoolean(v) : true,
    "boolean": (v) => v !== undefined ? isBoolean(v) : true,
    "i": (v) => v !== undefined ? isInteger(v) : 0,
    "integer": (v) => v !== undefined ? isInteger(v) : 0,
    "f": (v) => v !== undefined ? isFunction(v) : () => {},
    "function": (v) => v !== undefined ? isFunction(v) : () => {}
}

export default AltTypes;