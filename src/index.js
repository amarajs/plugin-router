// @flow

import * as FlowTypes from './types'
import createHashMethods from './hash'
import { merge, zip, decodeValue, slash, substring } from './utils'

const tokenPrefixLength = 2;
const rxToken = /\/:([^\/]+)/g;

const DEFAULT_HASH_PARTS: FlowTypes.HashDelimiters = Object.freeze({
    hashPrefix: '#!',
    selectorWithin: '://',
    selectorBetween: '||'
});

export default function AmaraPluginRouter(hashDelimiters: FlowTypes.HashDelimiters = DEFAULT_HASH_PARTS) {

    const rxSelectorUrl = new RegExp(`(.+?)${slash(hashDelimiters.selectorWithin)}(.+)`);
    const rxValidHash = new RegExp([
        '^', slash(hashDelimiters.hashPrefix),
        '(.+?', slash(hashDelimiters.selectorWithin), '[^?]+?\\??\\S+?(',
        slash(hashDelimiters.selectorBetween), '|$))+'
    ].join(''));

    const { getHashData, getHashString } = createHashMethods(hashDelimiters, rxSelectorUrl);

    return function createHandler(dispatch: Function) {

        let lastHash: string|null = null;

        const targetRoutes: Map<Element, FlowTypes.TargetRouteData> = new Map();
        const targetParams: Map<Element, FlowTypes.RouteParamsMap> = new Map();

        function getAncestorRouteParams(target: Element): FlowTypes.RouteParamsMap[] {
            const result = [];
            let params,
                current = target && target.parentElement;
            while (current) {
                params = targetParams.get(current);
                if (params) result.unshift(params);
                current = current.parentElement;
            }
            return result;
        }

        function getRouteParams(target: Element): FlowTypes.RouteParamsMap {
            const ancestorParams = getAncestorRouteParams(target);
            const params = targetParams.get(target) || {};
            return Object.freeze(merge(...ancestorParams, params));
        }

        function removeRouteAttribute(_, el) {
            el.removeAttribute('route');
        }

        function clearInvalidHash(hash: string) {
            if (rxValidHash.test(hash) || (!hash && !lastHash)) {
                return;
            }
            const {document, history, location} = window;
            targetParams.clear();
            targetRoutes.forEach(removeRouteAttribute);
            return history.replaceState(
                null,
                document.title,
                location.pathname + location.search
            );
        }

        function setRouteOnTarget(targetRoute) {
            const { el, route, params, routeData } = this;
            const rxRoute = new RegExp(targetRoute.replace(rxToken, '/([^/]+)'));
            if (!routeData.active && rxRoute.test(route)) {
                const values = (route.match(rxRoute) || [])
                    .slice(1)
                    .map(decodeValue);
                const tokens = (targetRoute.match(rxToken) || [])
                    .map(substring, tokenPrefixLength);
                routeData.active = true;
                targetParams.set(el, merge(params, zip(tokens, values)));
                if (el.getAttribute('route') !== route)
                    el.setAttribute('route', route);
            }
        }

        function updateMatchingTarget({target, route, params = {}}) {
            const { el, routeData } = this;
            if (!el.matches(target)) return;
            routeData.routes.forEach(setRouteOnTarget, {el, route, params, routeData});
        }

        function applyMatchingRoutes(routeData: FlowTypes.TargetRouteData, el: Element) {
            routeData.active = false;
            this.forEach(updateMatchingTarget, {el, routeData});
        }

        function resetTarget(target) {
            targetParams.delete(target);
            target.removeAttribute('route');
        }

        function resetInactiveRoute(routeData: FlowTypes.TargetRouteData, target: Element) {
            !routeData.active && resetTarget(target);
        }

        function resetDisconnectedTarget(_, target :Node) {
            if (this.includes(target)) {
                const el :any = target;
                targetParams.delete(el);
                targetRoutes.delete(el);
            }
        }

        function resetDisconnectedTargets(targets :Node[]) {
            targetRoutes.forEach(resetDisconnectedTarget, targets);
        }

        function updateMatchingTargets(hash) {
            if (!rxValidHash.test(hash)) return;
            const hashData = getHashData(hash);
            targetRoutes.forEach(applyMatchingRoutes, hashData);
            targetRoutes.forEach(resetInactiveRoute);
        }

        function announceChangeOccurred(hash) {
            lastHash !== hash && dispatch({
                type: 'core:change-occurred',
                payload: 'routeParams'
            });
        }

        function onHashChanged() {
            const hash = window.document.location.hash;
            clearInvalidHash(hash);
            updateMatchingTargets(hash);
            announceChangeOccurred(hash);
            lastHash = hash;
        }

        function updateTargetRoute(arr: (string|string[])[], target: Element) {
            const routes: string[] = [].concat(...arr);
            if (routes.length) {
                targetRoutes.set(target, {routes, active: false});
            } else {
                resetTarget(target);
                targetRoutes.delete(target);
            }
        }

        function updateTargetRoutes(data: FlowTypes.ApplyRouteData) {
            data.forEach(updateTargetRoute);
            onHashChanged();
        }

        function byTarget({target}) {
            return target === String(this);
        }

        function navigate(payload: FlowTypes.HashPart) {
            const {target} = payload;
            const hashData = getHashData(window.document.location.hash);
            const index = hashData.findIndex(byTarget, target);
            index >= 0 && hashData.splice(index, 1, payload) || hashData.push(payload);
            window.document.location.hash = getHashString(hashData);
        }

        window.addEventListener('hashchange', onHashChanged);

        return function handler(action: FlowTypes.AllowedAction) {
            switch (action.type) {
            case 'core:bootstrap':
                action.payload.register('routeParams', getRouteParams);
                break;
            case 'core:apply-target-results':
                action.payload.route && updateTargetRoutes(action.payload.route);
                break;
            case 'engine:append-observed-attributes':
                action.payload.add('route');
                break;
            case 'engine:targets-removed':
                resetDisconnectedTargets(action.payload);
                break;
            case 'router:navigate':
                navigate(action.payload);
                break;
            }
        };

    };

}
