import { BabelFileResult, transformSync } from '@babel/core';
import { dedent } from '@ls-stack/utils/dedent';
import { expect, test } from 'vitest';
import plugin from '../src/main.js';
// @ts-expect-error -- not typed
import babelPluginReactCompiler from 'babel-plugin-react-compiler';

function transformCode(code: string): BabelFileResult | null {
  return transformSync(dedent(code), {
    plugins: [
      [
        '@babel/plugin-transform-runtime',
        {
          version: '7.26.0',
        },
      ],
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
    "import _usingCtx2 from "@babel/runtime/helpers/usingCtx";
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
    "import _usingCtx2 from "@babel/runtime/helpers/usingCtx";
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
    "import _usingCtx2 from "@babel/runtime/helpers/usingCtx";
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
    "import _usingCtx2 from "@babel/runtime/helpers/usingCtx";
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
    "import _usingCtx2 from "@babel/runtime/helpers/usingCtx";
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
    "import _usingCtx2 from "@babel/runtime/helpers/usingCtx";
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
