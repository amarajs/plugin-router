// @flow

export type HashPart = {
    target: string,
    route: string,
    params?: {}
}

export type HashData = HashPart[];

export type HashDelimiters = {
    hashPrefix: string,
    selectorWithin: string,
    selectorBetween: string
}

export type RouteParamsMap = {
    [param: string]: string
}

export type BootstrapAction = {
    type: 'core:bootstrap',
    payload: {
        target: HTMLElement,
        register: (key: string, getter: (target: HTMLElement) => any) => void
    }
}

export type AppendAttributesAction = {
    type: 'engine:append-observed-attributes',
    payload: Set<string>
}

export type TargetRouteData = {
    active: boolean,
    routes: string[]
};

export type ApplyRouteData = Map<Element, Array<string|Array<string>>>

type ApplyResultsAction = {
    type: 'core:apply-target-results',
    payload: {
        route?: ApplyRouteData
    }
}

type RouterNavigateAction = {
    type: 'router:navigate',
    payload: HashPart
}

type TargetsRemovedAction = {
    type: 'engine:targets-removed',
    payload: Node[]
}

export type AllowedAction = BootstrapAction
    | AppendAttributesAction
    | ApplyResultsAction
    | RouterNavigateAction
    | TargetsRemovedAction
