import { BabelFileResult, transformSync } from '@babel/core';
import { dedent } from '@ls-stack/utils/dedent';
import { expect, test } from 'vitest';
import plugin from '../src/main.js';
// @ts-expect-error -- not typed
import babelPluginReactCompiler from 'babel-plugin-react-compiler';

function transformCode(code: string): BabelFileResult | null {
  return transformSync(dedent(code), {
    plugins: [
      '@babel/plugin-transform-runtime',
      plugin,
      babelPluginReactCompiler,
    ],
    sourceMaps: true,
    filename: 'test.js',
    parserOpts: {
      plugins: ['jsx', 'typescript'],
      sourceType: 'module',
      allowImportExportEverywhere: true,
      allowAwaitOutsideFunction: true,
    },
  });
}

test('explicit resource management syntax in components', () => {
  const result = transformCode(
    `
      const Component = () => {
        const creationState = useMutationState();

        function onCreate() {
          using mut = addMsgState.start();

          createMsg(msg);
        }

        return <div>{creationState.isLoading ? <Spinner /> :
          <button onClick={onCreate}>Create</button>
        }</div>;
      }
    `,
  );

  expect(result?.code).toMatchInlineSnapshot(`
    "function _usingCtx2() { var r = "function" == typeof SuppressedError ? SuppressedError : function (r, e) { var n = Error(); return n.name = "SuppressedError", n.error = r, n.suppressed = e, n; }, e = {}, n = []; function using(r, e) { if (null != e) { if (Object(e) !== e) throw new TypeError("using declarations can only be used with objects, functions, null, or undefined."); if (r) var o = e[Symbol.asyncDispose || Symbol.for("Symbol.asyncDispose")]; if (void 0 === o && (o = e[Symbol.dispose || Symbol.for("Symbol.dispose")], r)) var t = o; if ("function" != typeof o) throw new TypeError("Object is not disposable."); t && (o = function () { try { t.call(e); } catch (r) { return Promise.reject(r); } }), n.push({ v: e, d: o, a: r }); } else r && n.push({ d: e, a: r }); return e; } return { e: e, u: using.bind(null, !1), a: using.bind(null, !0), d: function () { var o, t = this.e, s = 0; function next() { for (; o = n.pop();) try { if (!o.a && 1 === s) return s = 0, n.push(o), Promise.resolve().then(next); if (o.d) { var r = o.d.call(o.v); if (o.a) return s |= 2, Promise.resolve(r).then(next, err); } else s |= 1; } catch (r) { return err(r); } if (1 === s) return t !== e ? Promise.reject(t) : Promise.resolve(); if (t !== e) throw t; } function err(n) { return t = t !== e ? new r(n, t) : n, next(); } return next(); } }; }
    const Component = () => {
      const creationState = useMutationState();
      function onCreate() {
        try {
          var _usingCtx = _usingCtx2();
          const mut = _usingCtx.u(addMsgState.start());
          createMsg(msg);
        } catch (_) {
          _usingCtx.e = _;
        } finally {
          _usingCtx.d();
        }
      }
      return <div>{creationState.isLoading ? <Spinner /> : <button onClick={onCreate}>Create</button>}</div>;
    };"
  `);
});

test('explicit resource management syntax in hooks', () => {
  const result = transformCode(
    `
      function useHook() {
        const creationState = useMutationState();

        function onCreate() {
          using mut = addMsgState.start();

          createMsg(msg);
        }

        return creationState.isLoading;
      }
    `,
  );

  expect(result?.code).toMatchInlineSnapshot(`
    "function _usingCtx2() { var r = "function" == typeof SuppressedError ? SuppressedError : function (r, e) { var n = Error(); return n.name = "SuppressedError", n.error = r, n.suppressed = e, n; }, e = {}, n = []; function using(r, e) { if (null != e) { if (Object(e) !== e) throw new TypeError("using declarations can only be used with objects, functions, null, or undefined."); if (r) var o = e[Symbol.asyncDispose || Symbol.for("Symbol.asyncDispose")]; if (void 0 === o && (o = e[Symbol.dispose || Symbol.for("Symbol.dispose")], r)) var t = o; if ("function" != typeof o) throw new TypeError("Object is not disposable."); t && (o = function () { try { t.call(e); } catch (r) { return Promise.reject(r); } }), n.push({ v: e, d: o, a: r }); } else r && n.push({ d: e, a: r }); return e; } return { e: e, u: using.bind(null, !1), a: using.bind(null, !0), d: function () { var o, t = this.e, s = 0; function next() { for (; o = n.pop();) try { if (!o.a && 1 === s) return s = 0, n.push(o), Promise.resolve().then(next); if (o.d) { var r = o.d.call(o.v); if (o.a) return s |= 2, Promise.resolve(r).then(next, err); } else s |= 1; } catch (r) { return err(r); } if (1 === s) return t !== e ? Promise.reject(t) : Promise.resolve(); if (t !== e) throw t; } function err(n) { return t = t !== e ? new r(n, t) : n, next(); } return next(); } }; }
    function useHook() {
      const creationState = useMutationState();
      function onCreate() {
        try {
          var _usingCtx = _usingCtx2();
          const mut = _usingCtx.u(addMsgState.start());
          createMsg(msg);
        } catch (_) {
          _usingCtx.e = _;
        } finally {
          _usingCtx.d();
        }
      }
      return creationState.isLoading;
    }"
  `);
});

test('explicit resource management syntax in functions', () => {
  const result = transformCode(
    `

        function onCreate() {
          using mut = addMsgState.start();

          createMsg(msg);
        }

    `,
  );

  expect(result?.code).toMatchInlineSnapshot(`
    "function _usingCtx2() { var r = "function" == typeof SuppressedError ? SuppressedError : function (r, e) { var n = Error(); return n.name = "SuppressedError", n.error = r, n.suppressed = e, n; }, e = {}, n = []; function using(r, e) { if (null != e) { if (Object(e) !== e) throw new TypeError("using declarations can only be used with objects, functions, null, or undefined."); if (r) var o = e[Symbol.asyncDispose || Symbol.for("Symbol.asyncDispose")]; if (void 0 === o && (o = e[Symbol.dispose || Symbol.for("Symbol.dispose")], r)) var t = o; if ("function" != typeof o) throw new TypeError("Object is not disposable."); t && (o = function () { try { t.call(e); } catch (r) { return Promise.reject(r); } }), n.push({ v: e, d: o, a: r }); } else r && n.push({ d: e, a: r }); return e; } return { e: e, u: using.bind(null, !1), a: using.bind(null, !0), d: function () { var o, t = this.e, s = 0; function next() { for (; o = n.pop();) try { if (!o.a && 1 === s) return s = 0, n.push(o), Promise.resolve().then(next); if (o.d) { var r = o.d.call(o.v); if (o.a) return s |= 2, Promise.resolve(r).then(next, err); } else s |= 1; } catch (r) { return err(r); } if (1 === s) return t !== e ? Promise.reject(t) : Promise.resolve(); if (t !== e) throw t; } function err(n) { return t = t !== e ? new r(n, t) : n, next(); } return next(); } }; }
    function onCreate() {
      try {
        var _usingCtx = _usingCtx2();
        const mut = _usingCtx.u(addMsgState.start());
        createMsg(msg);
      } catch (_) {
        _usingCtx.e = _;
      } finally {
        _usingCtx.d();
      }
    }"
  `);
});

test('explicit resource management syntax in async functions', () => {
  const result = transformCode(
    `
      async function onCreate() {
        using mut = addMsgState.start();

        await createMsg(msg);
      }

    `,
  );

  expect(result?.code).toMatchInlineSnapshot(`
    "function _usingCtx2() { var r = "function" == typeof SuppressedError ? SuppressedError : function (r, e) { var n = Error(); return n.name = "SuppressedError", n.error = r, n.suppressed = e, n; }, e = {}, n = []; function using(r, e) { if (null != e) { if (Object(e) !== e) throw new TypeError("using declarations can only be used with objects, functions, null, or undefined."); if (r) var o = e[Symbol.asyncDispose || Symbol.for("Symbol.asyncDispose")]; if (void 0 === o && (o = e[Symbol.dispose || Symbol.for("Symbol.dispose")], r)) var t = o; if ("function" != typeof o) throw new TypeError("Object is not disposable."); t && (o = function () { try { t.call(e); } catch (r) { return Promise.reject(r); } }), n.push({ v: e, d: o, a: r }); } else r && n.push({ d: e, a: r }); return e; } return { e: e, u: using.bind(null, !1), a: using.bind(null, !0), d: function () { var o, t = this.e, s = 0; function next() { for (; o = n.pop();) try { if (!o.a && 1 === s) return s = 0, n.push(o), Promise.resolve().then(next); if (o.d) { var r = o.d.call(o.v); if (o.a) return s |= 2, Promise.resolve(r).then(next, err); } else s |= 1; } catch (r) { return err(r); } if (1 === s) return t !== e ? Promise.reject(t) : Promise.resolve(); if (t !== e) throw t; } function err(n) { return t = t !== e ? new r(n, t) : n, next(); } return next(); } }; }
    async function onCreate() {
      try {
        var _usingCtx = _usingCtx2();
        const mut = _usingCtx.u(addMsgState.start());
        await createMsg(msg);
      } catch (_) {
        _usingCtx.e = _;
      } finally {
        _usingCtx.d();
      }
    }"
  `);
});

test('top level using declarations', () => {
  const result = transformCode(
    `
      using x = A;
      await using y = B;

      export { x, y };
    `,
  );

  expect(result?.code).toMatchInlineSnapshot(`
    "function _usingCtx2() { var r = "function" == typeof SuppressedError ? SuppressedError : function (r, e) { var n = Error(); return n.name = "SuppressedError", n.error = r, n.suppressed = e, n; }, e = {}, n = []; function using(r, e) { if (null != e) { if (Object(e) !== e) throw new TypeError("using declarations can only be used with objects, functions, null, or undefined."); if (r) var o = e[Symbol.asyncDispose || Symbol.for("Symbol.asyncDispose")]; if (void 0 === o && (o = e[Symbol.dispose || Symbol.for("Symbol.dispose")], r)) var t = o; if ("function" != typeof o) throw new TypeError("Object is not disposable."); t && (o = function () { try { t.call(e); } catch (r) { return Promise.reject(r); } }), n.push({ v: e, d: o, a: r }); } else r && n.push({ d: e, a: r }); return e; } return { e: e, u: using.bind(null, !1), a: using.bind(null, !0), d: function () { var o, t = this.e, s = 0; function next() { for (; o = n.pop();) try { if (!o.a && 1 === s) return s = 0, n.push(o), Promise.resolve().then(next); if (o.d) { var r = o.d.call(o.v); if (o.a) return s |= 2, Promise.resolve(r).then(next, err); } else s |= 1; } catch (r) { return err(r); } if (1 === s) return t !== e ? Promise.reject(t) : Promise.resolve(); if (t !== e) throw t; } function err(n) { return t = t !== e ? new r(n, t) : n, next(); } return next(); } }; }
    export { x, y };
    try {
      var _usingCtx = _usingCtx2();
      var x = _usingCtx.u(A);
      var y = _usingCtx.a(B);
    } catch (_) {
      _usingCtx.e = _;
    } finally {
      await _usingCtx.d();
    }"
  `);
});

test('if body', () => {
  const result = transformCode(
    `
      if (test) {
        using x = obj;
        doSomethingWith(x);
      }
    `,
  );

  expect(result?.code).toMatchInlineSnapshot(`
    "function _usingCtx2() { var r = "function" == typeof SuppressedError ? SuppressedError : function (r, e) { var n = Error(); return n.name = "SuppressedError", n.error = r, n.suppressed = e, n; }, e = {}, n = []; function using(r, e) { if (null != e) { if (Object(e) !== e) throw new TypeError("using declarations can only be used with objects, functions, null, or undefined."); if (r) var o = e[Symbol.asyncDispose || Symbol.for("Symbol.asyncDispose")]; if (void 0 === o && (o = e[Symbol.dispose || Symbol.for("Symbol.dispose")], r)) var t = o; if ("function" != typeof o) throw new TypeError("Object is not disposable."); t && (o = function () { try { t.call(e); } catch (r) { return Promise.reject(r); } }), n.push({ v: e, d: o, a: r }); } else r && n.push({ d: e, a: r }); return e; } return { e: e, u: using.bind(null, !1), a: using.bind(null, !0), d: function () { var o, t = this.e, s = 0; function next() { for (; o = n.pop();) try { if (!o.a && 1 === s) return s = 0, n.push(o), Promise.resolve().then(next); if (o.d) { var r = o.d.call(o.v); if (o.a) return s |= 2, Promise.resolve(r).then(next, err); } else s |= 1; } catch (r) { return err(r); } if (1 === s) return t !== e ? Promise.reject(t) : Promise.resolve(); if (t !== e) throw t; } function err(n) { return t = t !== e ? new r(n, t) : n, next(); } return next(); } }; }
    if (test) try {
      var _usingCtx = _usingCtx2();
      const x = _usingCtx.u(obj);
      doSomethingWith(x);
    } catch (_) {
      _usingCtx.e = _;
    } finally {
      _usingCtx.d();
    }"
  `);
});
