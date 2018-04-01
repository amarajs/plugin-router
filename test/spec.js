/* global require, global: false */

const sinon = require('sinon');
const expect = require('chai').expect;
const JSDOM = require('jsdom').JSDOM;

const Router = require('../dist/amara-plugin-router');

describe('Router', function() {

    const complexHash = '#!#panel://help/posts?open&selected=editing||[main]://posts?order=asc&sort=date';

    function applyTargets(map) {
        return {
            type: 'core:apply-target-results',
            payload: {route: map}
        };
    }

    function navigate(target, route, params) {
        return {
            type: 'router:navigate',
            payload: { target, route, params }
        };
    }

    beforeEach(function createHandler() {
        this.setup = (hash = '', hashParts) => {
            const url = 'http://example.com' + hash;
            global.window = new JSDOM('', {url}).window;
            sinon.spy(global.window, 'addEventListener');
            this.dispatch = sinon.spy();
            this.handler = Router(hashParts)(this.dispatch);
        };
        this.createGetParams = () => {
            const register = sinon.spy();
            this.handler({
                type: 'core:bootstrap',
                payload: { register }
            });
            this.getParams = register.args[0][1];
        };
        this.setup();
    });

    it('provides routeParams getter', function() {
        const register = sinon.spy();
        this.handler({
            type: 'core:bootstrap',
            payload: { register }
        });
        const args = register.args[0];
        expect(args[0]).equals('routeParams');
        expect(args[1]).to.be.a('function');
    });

    it('observes `route` attribute', function() {
        const payload = new Set();
        this.handler({payload, type: 'engine:append-observed-attributes'});
        expect(payload.has('route')).true;
    });

    it('listens for hashchange event', function() {
        const [event, handler] = global.window.addEventListener.getCall(0).args;
        expect(event).equals('hashchange');
        expect(handler).is.a('function');
    });

    describe('on first set of targets', function() {

        it('clears hash if not valid', function() {
            const invalidHashes = [
                '#?key=value',
                '#![main]',
                '#![main]=posts',
                '#![main]:/posts'
            ];
            invalidHashes.forEach(hash => {
                this.setup(hash);
                expect(global.window.document.location.hash).equals(hash);
                this.handler(applyTargets(new Map()));
                expect(global.window.document.location.hash).equals('');
            });
        });

        it('applies existing routes to targets', function() {
            const doc = global.window.document;
            const divs = [
                doc.createElement('div'),
                doc.createElement('div')
            ];
            divs[0].setAttribute('main', '');
            divs[1].id = 'panel';
            this.setup(complexHash);
            this.handler(applyTargets(new Map([
                [divs[0], ['posts']],
                [divs[1], ['help/:topic']]
            ])));
            expect(divs[0].getAttribute('route')).equals('posts');
            expect(divs[1].getAttribute('route')).equals('help/posts');
        });

        it('removes routes from non-matching targets', function() {
            const doc = global.window.document;
            const div = doc.createElement('div');
            div.setAttribute('main', '');
            div.setAttribute('route', 'help/posts');
            this.setup(complexHash);
            this.handler(applyTargets(new Map([
                [div, ['help/:topic']]
            ])));
            expect(div.hasAttribute('route')).false;
        });

        it('applies only first matching route', function() {
            const doc = global.window.document;
            const div = doc.createElement('div');
            div.classList.add('a', 'b');
            this.setup('#!.A://paths/a||.B://paths/b');
            this.handler(applyTargets(new Map([
                [div, ['paths/:token']]
            ])));
            expect(div.getAttribute('route')).equals('paths/a');
        });

    });

    describe('after first set of targets', function() {

        beforeEach(function setup() {
            const doc = global.window.document;
            this.divs = [
                doc.createElement('div'),
                doc.createElement('div')
            ];
            this.divs[0].setAttribute('main', '');
            this.divs[1].id = 'panel';
            this.setup(complexHash);
        })

        it('applies existing routes to new targets', function() {
            this.handler(applyTargets(new Map([
                [this.divs[0], ['posts']]
            ])));
            expect(this.divs[0].getAttribute('route')).equals('posts');
            expect(this.divs[1].hasAttribute('route')).false;
            this.handler(applyTargets(new Map([
                [this.divs[1], ['help/:topic']]
            ])));
            expect(this.divs[1].getAttribute('route')).equals('help/posts');
        });

        it('removes routes from removed targets', function() {
            this.handler(applyTargets(new Map([
                [this.divs[0], [['posts']]]
            ])));
            expect(this.divs[0].getAttribute('route')).equals('posts');
            this.handler(applyTargets(new Map([
                [this.divs[0], []]
            ])));
            expect(this.divs[0].hasAttribute('route')).false;
        });

        it('removes previous routeParams when hash is empty', function(done) {
            this.createGetParams();
            this.handler(applyTargets(new Map([
                [this.divs[0], ['posts']]
            ])));
            expect(this.getParams(this.divs[0])).eql({
                order: 'asc',
                sort: 'date'
            });
            global.window.document.location.hash = '';
            setTimeout(() => {
                expect(this.getParams(this.divs[0])).eql({});
                done();
            });
        });

        it('adds routes back to previously empty targets', function() {
            this.handler(applyTargets(new Map([
                [this.divs[0], ['posts']]
            ])));
            expect(this.divs[0].getAttribute('route')).equals('posts');
            this.handler(applyTargets(new Map([
                [this.divs[0], []]
            ])));
            expect(this.divs[0].hasAttribute('route')).false;
            this.handler(applyTargets(new Map([
                [this.divs[0], ['posts']]
            ])));
            expect(this.divs[0].getAttribute('route')).equals('posts');
        });

        it('applies routes for new hash', function(done) {
            this.handler(applyTargets(new Map([
                [this.divs[1], ['help/:topic', 'another/:route']]
            ])));
            expect(this.divs[1].getAttribute('route')).equals('help/posts');
            global.window.document.location.hash = '#!#panel://another/route';
            setTimeout(() => {
                expect(this.divs[1].getAttribute('route')).equals('another/route');
                done();
            });
        });

        it('applies routes for same hash but new token', function(done) {
            this.handler(applyTargets(new Map([
                [this.divs[1], ['help/:topic']]
            ])));
            expect(this.divs[1].getAttribute('route')).equals('help/posts');
            global.window.document.location.hash = '#!#panel://help/another';
            setTimeout(() => {
                expect(this.divs[1].getAttribute('route')).equals('help/another');
                done();
            });
        });

        it('does not remove route for same hash but new token', function(done) {
            this.handler(applyTargets(new Map([
                [this.divs[1], ['help/:topic']]
            ])));
            expect(this.divs[1].getAttribute('route')).equals('help/posts');
            const spy = sinon.spy(this.divs[1], 'removeAttribute');
            global.window.document.location.hash = '#!#panel://help/another';
            setTimeout(() => {
                expect(spy.called).false;
                expect(this.divs[1].getAttribute('route')).equals('help/another');
                done();
            });
        });

        it('does nothing for same hash and targets', function(done) {
            this.handler(applyTargets(new Map([
                [this.divs[1], ['help/:topic']]
            ])));
            expect(this.divs[1].getAttribute('route')).equals('help/posts');
            const spies = [
                sinon.spy(this.divs[1], 'setAttribute'),
                sinon.spy(this.divs[1], 'removeAttribute')
            ];
            global.window.document.location.hash = '#!#panel://help/posts';
            setTimeout(() => {
                expect(spies[0].called).false;
                expect(spies[1].called).false;
                done();
            });
        });

    });

    describe('routeParams', function() {

        beforeEach(function() {
            this.setup(complexHash);
            this.createGetParams();
        });

        it('are readonly (frozen)', function() {
            expect(this.getParams()).frozen;
        });

        it('includes route token values', function() {
            const doc = global.window.document;
            const div = doc.createElement('div');
            div.setAttribute('target', '');
            this.setup('#![target]://help/abc/def');
            this.createGetParams();
            this.handler(applyTargets(new Map([
                [div, ['help/:page/:topic']]
            ])));
            const params = this.getParams(div);
            expect(params.page).equals('abc');
            expect(params.topic).equals('def');
        });

        it('includes querystring values', function() {
            const doc = global.window.document;
            const divs = [
                doc.createElement('div'),
                doc.createElement('div')
            ];
            divs[0].setAttribute('main', '');
            divs[1].id = 'panel';
            this.handler(applyTargets(new Map([
                [divs[0], ['posts']],
                [divs[1], ['help/:topic']]
            ])));
            const params1 = this.getParams(divs[0]);
            const params2 = this.getParams(divs[1]);
            expect(params1.sort).equals('date');
            expect(params1.order).equals('asc');
            expect(params2.open).true;
            expect(params2.selected).equals('editing');
        });

        it('includes unusual querystring types', function() {
            const doc = global.window.document;
            const div = doc.createElement('div');
            div.setAttribute('main', '');
            this.setup(
                '#![main]://route?array=%5B%22a%22%2Cnull%2C123%5D&' +
                'dt=1970-01-01T00:00:00.000Z&object=%7B%22first%22%' +
                '3A%22abc%22%2C%22second%22%3A%22def%22%7D'
            );
            this.createGetParams();
            this.handler(applyTargets(new Map([
                [div, ['route']]
            ])));
            const params = this.getParams(div);
            expect(params.dt).eql(new Date(0));
            expect(params.array).eql(['a', null, 123]);
            expect(params.object).eql({
                first: 'abc',
                second: 'def'
            });
        });

        it('returns invalid JSON as undefined', function() {
            const doc = global.window.document;
            const div = doc.createElement('div');
            div.setAttribute('main', '');
            this.setup('#![main]://route?array=%5B%22a');
            this.createGetParams();
            this.handler(applyTargets(new Map([
                [div, ['route']]
            ])));
            const params = this.getParams(div);
            expect(params.array).undefined;
        });

        it('includes ancestor values', function() {
            const doc = global.window.document;
            const parent = doc.createElement('div');
            const child = doc.createElement('div');
            const grandchild = doc.createElement('div');
            parent.appendChild(child);
            child.appendChild(grandchild)
            parent.setAttribute('main', '');
            grandchild.id = 'panel';
            this.handler(applyTargets(new Map([
                [parent, ['posts']],
                [grandchild, ['help/:topic']]
            ])));
            const params = this.getParams(grandchild);
            expect(params.open).true;
            expect(params.sort).equals('date');
            expect(params.order).equals('asc');
            expect(params.selected).equals('editing');
        });

        it('not overwritten by ancestor values', function() {
            this.setup('#!.parent://a/1||.child://b/2||.grandchild://c/3');
            this.createGetParams();
            const doc = global.window.document;
            const parent = doc.createElement('div');
            const child = doc.createElement('div');
            const grandchild = doc.createElement('div');
            parent.appendChild(child);
            child.appendChild(grandchild)
            parent.classList.add('parent');
            child.classList.add('child');
            grandchild.classList.add('grandchild');
            this.handler(applyTargets(new Map([
                [parent, ['a/:token']],
                [child, ['b/:token']],
                [grandchild, ['c/:token']]
            ])));
            expect(this.getParams(parent).token).equals(1);
            expect(this.getParams(child).token).equals(2);
            expect(this.getParams(grandchild).token).equals(3);
        });

        it('does not include child values', function() {
            const doc = global.window.document;
            const parent = doc.createElement('div');
            const child = doc.createElement('div');
            parent.appendChild(child);
            parent.setAttribute('parent', '');
            child.setAttribute('child', '');
            this.setup('#![parent]://posts?sort=date||[child]://help?sort=topic&extra');
            this.createGetParams();
            this.handler(applyTargets(new Map([
                [parent, ['posts']],
                [child, ['help']]
            ])));
            const params = this.getParams(parent);
            expect(params.sort).equals('date');
            expect('extra' in params).false;
        });

        it('does not include sibling values', function() {
            const doc = global.window.document;
            const parent = doc.createElement('div');
            const child = doc.createElement('div');
            parent.setAttribute('parent', '');
            child.setAttribute('child', '');
            this.setup('#![parent]://posts?sort=date||[child]://help?sort=topic&extra');
            this.createGetParams();
            this.handler(applyTargets(new Map([
                [parent, ['posts']],
                [child, ['help']]
            ])));
            const params = this.getParams(parent);
            expect(params.sort).equals('date');
            expect('extra' in params).false;
        });

        it('returns empty when target no longer applies', function() {
            const doc = global.window.document;
            const div = doc.createElement('div');
            div.setAttribute('main', '');
            this.handler(applyTargets(new Map([
                [div, ['posts']]
            ])));
            expect(this.getParams(div).sort).equals('date');
            this.handler(applyTargets(new Map([
                [div, []]
            ])));
            expect(this.getParams(div).sort).undefined;
        });

    });

    describe('navigate', function() {

        describe('correctly encodes hash string', function() {

            it('with default hashParts', function() {
                this.handler(navigate('.another', 'some/nested/route', {
                    show: true,
                    hidden: false,
                    mode: 'nested'
                }));
                expect(global.window.document.location.hash).equals(
                    '#!.another://some/nested/route?mode=nested&show'
                );
            });

            it('with custom hashParts', function() {
                this.setup('', {
                    hashPrefix: '#hash!',
                    selectorWithin: '::',
                    selectorBetween: ','
                });
                this.handler(navigate('.another', 'some/nested/route', {
                    show: true,
                    hidden: false,
                    mode: 'nested'
                }));
                expect(global.window.document.location.hash).equals(
                    '#hash!.another::some/nested/route?mode=nested&show'
                );
                this.handler(navigate('[second]', 'page'));
                expect(global.window.document.location.hash).equals(
                    '#hash!.another::some/nested/route?mode=nested&show,[second]::page'
                );
            });

            it('with unusual params', function() {
                const date = new Date(0);
                this.handler(navigate('target', 'route', {
                    dt: date,
                    nil: null,
                    undef: undefined,
                    array: ['a', null, 123],
                    object: {
                        first: 'abc',
                        second: 'def'
                    }
                }));
                expect(global.window.document.location.hash).equals(
                    '#!target://route?array=%5B%22a%22%2Cnull%2C123%5D&' +
                    'dt=1970-01-01T00:00:00.000Z&object=%7B%22first%22%' +
                    '3A%22abc%22%2C%22second%22%3A%22def%22%7D'
                );
            })

        });

        it('sets correct routeArgs', function(done) {
            const doc = global.window.document;
            const div = doc.createElement('div');
            div.setAttribute('target', '');
            this.setup();
            this.createGetParams();
            this.handler(applyTargets(new Map([
                [div, ['help/:topic']]
            ])));
            this.handler(navigate('[target]', 'help/posts', {
                show: true,
                hidden: false,
                mode: 'nested'
            }));
            setTimeout(() => {
                const params = this.getParams(div);
                expect(params.show).equals(true);
                expect(params.topic).equals('posts');
                expect(params.mode).equals('nested');
                done();
            });
        });

        it('updates route attribute', function(done) {
            const doc = global.window.document;
            const div = doc.createElement('div');
            div.setAttribute('target', '');
            this.setup();
            this.handler(applyTargets(new Map([
                [div, ['help/:topic']]
            ])));
            this.handler(navigate('[target]', 'help/posts'));
            setTimeout(() => {
                expect(div.getAttribute('route')).equals('help/posts');
                done();
            });
        });

        it('updates existing hash', function() {
            const hash1 = '#![main]://first?param=value';
            const hash2 = '#![main]://second?param=another_value';
            this.setup(hash1);
            expect(global.window.document.location.hash).equals(hash1);
            this.handler(navigate('[main]', 'second?param=another_value'));
            expect(global.window.document.location.hash).equals(hash2);
        });

        it('dispatches change-occurred action', function(done) {
            this.setup();
            expect(this.dispatch.called).false;
            this.handler(navigate('target', 'route'));
            setTimeout(() => {
                expect(this.dispatch.calledWith({
                    type: 'core:change-occurred',
                    payload: 'routeParams'
                })).true;
                done();
            });
        });

        it('does not dispatch if same hash', function(done) {
            this.setup(complexHash);
            expect(this.dispatch.called).false;
            this.handler(navigate('[main]', 'posts', { sort: 'date', order: 'asc' }));
            setTimeout(() => {
                expect(this.dispatch.called).false;
                done();
            });
        });

        it('does not apply routes to removed targets', function() {
            const div = global.window.document.createElement('div');
            div.setAttribute('main', '');
            this.setup(complexHash);
            this.createGetParams();
            this.handler(applyTargets(new Map([
                [div, ['posts']]
            ])));
            expect(this.getParams(div).sort).equals('date');
            this.handler({
                type: 'engine:targets-removed',
                payload: [div]
            });
            this.handler(navigate('[main]', 'posts', { sort: 'author', order: 'desc' }));
            expect(this.getParams(div)).eql({});
        });

    });

});
