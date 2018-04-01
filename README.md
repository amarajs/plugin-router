## @amarajs/plugin-router

Provides client-side routing functionality to AmaraJS projects.

### Features

 - create routes declaratively or dynamically
 - associate routes with one or more DOM nodes
 - provide nested and sibling routes
 - access per-route query parameters and tokens

### Installation

`npm install --save @amarajs/plugin-router`

### Usage

```javascript
import Amara from '@amarajs/core';
import AmaraRouter from '@amarajs/plugin-router';
import AmaraBrowser from '@amarajs/plugin-engine-browser';
const amara = new Amara([
    AmaraRouter(),
    AmaraBrowser()
]);
```

### Feature Type

The `@amarajs/plugin-router` middleware allows you to create features of type `"route"`.

#### Return Values

Return an array of route paths (including optional tokens) that should be matched against the URL hash string. Any targets with routes matching the current URL hash will have their `route` attribute set to the current route.

```javascript
amara.add({
    type: 'route',
    targets: ['main'],
    apply: () => ['posts/:id']
});
```

The above feature will look for any `<main>` elements in the DOM. As soon as the URL hash matches the specified routes, a `[route]` attribute with the full route will be set on the target elements:

```html
https://www.mysite.com/#!main://posts/15?comments
<main route="posts/15"></main>
```

### Targeting Routes for Features

This plugin adds a `"route"` attribute to any nodes that have an active route applied. You can use this attribute to add features that target specific routes. For example, to add some content to a help container which has been routed to a `"topics/login"` page, you could use the `@amarajs/plugin-dom` middleware:

```javascript
amara.add({
    type: 'dom',
    targets: ['#help[route="topics/login"]'],
    apply: () => h('information about logging in')
});
```

Note that, because of the browser back button, it is always possible that a node which previous had a `"route"` attribute will _not_ have a `"route"` attribute in the future. This is similar to a route container being in a default, un-navigated state. You may wish to provide empty HTML for inactive route containers:

```javascript
amara.add({
    type: 'dom',
    // when no help content is selected,
    // show an empty help panel
    targets: ['#help:not([route])'],
    apply: () => null
});
```

### New `args` Property

A `routeParams` object will be provided to all `args` mapping functions. The `routeParams` includes any route tokens and route-specific querystring values for the current route target, as well as any ancestor routes that may be active. You can use this argument to provide dynamic content for your route containers:

```javascript
amara.add({
    type: 'dom',
    // routes that start with "posts/"
    targets: ['main[route^="posts/"]'],
    args: {
        postId: ({routeParams}) => routeParams.id,
        showComments: ({routeParams}) => routeParams.comments || false
    },
    apply: ({postId, showComments}) => `html here`
});
```

### Changing Routes

You can change a route by dispatching a `"router:navigate"` action to the `@amarajs/plugin-router` middleware. The payload is an object containing the following properties:

property | type | required | description
--- | --- | --- | ---
target | `String` | `true` | A selector that identifies one or more targets of `"route"` features.
route | `String` | `true` | The route path to navigate to.
params | `Object` | `false` | Any parameters you want to encode as a querystring for the route path.

For example, if you're using the `@amarajs/plugin-events` middleware, you can dispatch a route change from an event handler, because the action will bubble up to the bootstrapped node and be passed to all your registered middleware, including `@amarajs/plugin-router`:

```javascript
amara.add({
    type: 'events',
    targets: ['main'],
    apply: () => ({
        // handle clicks on any anchors with
        // route-link attributes, such as:
        // <a route-link="posts/12">Read More...</a>
        'click a[route-link]': (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.dispatch({
                type: 'router:navigate',
                payload: {
                    target: '#view-container',
                    route: e.target.getAttribute('route-link')
                }
            });
        }
    })
});
```

### Applying Multiple Results to the Same Target

If multiple `{type: "route"}` features target the same node, the routes arrays will be combined and de-duplicated.

### Hash Encoding

All values are URL-encoded to ensure valid, bookmarkable addresses.

In addition, objects and arrays will be encoded as JSON:

```javascript
// https://www.mysite.com/#!main://posts?sort=%5B%22date%22%2C%22author%22%5D
console.log(routeParams.sort) // ["date", "author"]
```

Dates will be encoded in ISO format:
```javascript
// https://www.mysite.com/#!main://posts?from=2016-05-04T13:00:00.000Z
console.log(routeParams.from) // {Date} value in local time
```

Finally, boolean values will be excluded entirely when `false` or result in just the key name when `true`:

```javascript
// https://www.mysite.com/#!main://posts?open
console.log(routeParams.open) // true
```

Multiple routes can be active at a time, including nested and sibling routes. Multiple routes will be separated by `||` in the URL hash:

```html
https://www.mysite.com/#!main://posts?sort=%22date%22||#help://topics/posts?open
<main route="posts"></main>
<section id="#help" route="topics/posts"></section>
```

### Customization

The default hash delimiters are:

```javascript
{
    hashPrefix: '#!' // recommended by Google
    selectorWithin: '://' // results in a URL-looking format
    selectorBetween: '||' // separates multiple active routes
}
```

You can override these defaults by specifying your own `hashDelimiters` object when instantiating a new instance of `AmaraRouter`. Values are required for all 3 delimiters, even if you only wish to change the value for a single one.

```javascript
import Amara from '@amarajs/core';
import AmaraRouter from '@amarajs/plugin-router';
import AmaraBrowser from '@amarajs/plugin-engine-browser';
const amara = new Amara([
    AmaraRouter({
        hashPrefix: '#!',
        selectorWithin: '--',
        selectorBetween: '~~'
    }),
    // ...
]);
```

Would result in a URL like:
```
https://www.mysite.com/#!main--posts~~#help--topics/posts?open
```

### Contributing

If you have a feature request, please create a new issue so the community can discuss it.

If you find a defect, please submit a bug report that includes a working link to reproduce the problem (for example, using [jsBin](https://jsbin.com)). Of course, pull requests to fix open issues are always welcome!

### License

The MIT License (MIT)

Copyright (c) Dan Barnes

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
