// @flow

const rxPathQS = /([^?]+)\??(.*)/;
const keyExists = ([key]) => key;

import * as FlowTypes from './types'
import { Types, getType, decodeValue, splitBy } from './utils';

function encodeValue(key) {
    const { params, parts } = this;
    const val = params[key];
    const pre = encodeURIComponent(key) + '=';
    switch (getType.call(val)) {
        case Types.Nil:
        case Types.Undef:
            return;
        case Types.Bool:
            val && parts.push(encodeURIComponent(key));
            break;
        case Types.Array:
        case Types.Object:
            return parts.push(pre + encodeURIComponent(JSON.stringify(val)));
        case Types.Date:
            return parts.push(pre + val.toISOString());
        default:
            return parts.push(pre + encodeURIComponent(val));
    }
}

function encodeQueryString(params:{} = {}): string {
    const context = {params, parts: []};
    Object.keys(params)
        .sort()
        .forEach(encodeValue, context);
    return context.parts.length && '?' + context.parts.join('&') || '';
}

function createParamsMap(out, [key, value = 'true']) {
    return out[key] = decodeValue(value), out;
}

export default function createHashMethods(hashDelimiters :FlowTypes.HashDelimiters, rxSelectorUrl :RegExp) {

    function getHashPart(path :string): FlowTypes.HashPart {
        const [target, url = ''] = (path.match(rxSelectorUrl) || []).slice(1);
        const [route, QS = ''] = (url.match(rxPathQS) || []).slice(1);
        const params = QS.split('&')
            .map(splitBy, '=')
            .filter(keyExists)
            .reduce(createParamsMap, {});
        return {target, route, params};
    }

    function getHashData(hash: string): FlowTypes.HashData {
        return hash
            .replace(hashDelimiters.hashPrefix, '')
            .split(hashDelimiters.selectorBetween)
            .filter(Boolean)
            .map(getHashPart);
    }

    function encodeHashPart({target, route, params = {}} :FlowTypes.HashPart) :string {
        const qs = encodeQueryString(params);
        return `${target}${hashDelimiters.selectorWithin}${route}${qs}`;
    }

    function getHashString(data: FlowTypes.HashData): string {
        return hashDelimiters.hashPrefix + data
            .map(encodeHashPart)
            .join(hashDelimiters.selectorBetween);
    }

    return {
        getHashData,
        getHashString
    };

}
