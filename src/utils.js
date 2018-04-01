// @flow

const rxInvalidChars = /[\\"'/|]/g;
const rxJSON = /^[\{\["]|^(true|false|null|\d+)$/;
const rxISODate = /^\d{4}-\d{2}-\d{2}T\d\d:\d\d:\d\d\.\d{3}Z$/;

export const Types = {
    Nil: '[object Null]',
    Date: '[object Date]',
    Bool: '[object Boolean]',
    Array: '[object Array]',
    Error: '[object Error]',
    Undef: '[object Undefined]',
    Object: '[object Object]',
}

export const getType = Object.prototype.toString;

export function inSamePlace(value :any, index :Number) {
    return equal(this[index], value);
}

export function equal(lhs:any, rhs:any) {
    const ltype = getType.call(lhs);
    const rtype = getType.call(rhs);
    if (ltype !== rtype) return false;
    switch (ltype) {
        case Types.Array:
            return lhs.length === rhs.length &&
                lhs.every(inSamePlace, rhs);
        case Types.Object:
            return equal(Object.entries(lhs), Object.entries(rhs));
        default:
            return lhs === rhs;
    }
}

export function copy(key :string) {
    const value = this.object[key];
    if (value !== undefined || (!(key in this.result)))
        this.result[key] = value;
}

export function merge(...objects:Array<{}>) {
    let object,
        index = 0,
        result = Object.create(null);
    while (object = objects[index++]) {
        Object.keys(object).forEach(copy, {result, object});
    }
    return result;
}

export function zip(keys :string[], values :any[]) {
    const zip = Object.create(null);
    const len = keys && keys.length || 0;
    for(let i = 0; keys && (i < len); i++) {
        zip[keys[i]] = values[i];
    }
    return zip;
}

export function attempt(fn :Function, ctx :any, ...args :any[]) {
    try {
        return fn.apply(ctx, args);
    } catch (e) {
        return e;
    }
}

export function decodeValue(value: string) {
    let parsed, val = decodeURIComponent(value);
    if (rxISODate.test(val)) {
        return new Date(val);
    } else if (rxJSON.test(val)) {
        parsed = attempt(JSON.parse, JSON, val);
        if (getType.call(parsed) === Types.Error) {
            return undefined;
        }
        return parsed;
    }
    return val;
}

export function slash(str :string) :string {
    return str.replace(rxInvalidChars, '\\$&');
}

export function splitBy(str :string) {
    return str.split(String(this));
}

export function substring(str :string) :string {
    return str.substring(Number(this));
}
