import { BabelFileResult, transformSync } from '@babel/core';
import { dedent } from '@ls-stack/utils/dedent';
import { describe, expect, test } from 'vitest';
import vm from 'vm';
import plugin from '../src/main.js';

function transformCode(code: string): BabelFileResult | null {
  return transformSync(dedent(code), {
    plugins: [plugin],
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

describe('transform default props with tagged template literals', () => {
  test('arrow function component', () => {
    const result = transformCode(
      `
        const Component = ({
          a = tag\`hello\`,
        }) => {
          return <div>{a}</div>;
        }
      `,
    );

    expect(result?.code).toMatchInlineSnapshot(`
      "function _templateObject() {
        const data = _taggedTemplateLiteral(["hello"]);
        _templateObject = () => data;
        return data;
      }
      function _taggedTemplateLiteral(e, t) {
        return t || (t = e.slice(0)), Object.freeze(Object.defineProperties(e, {
          raw: {
            value: Object.freeze(t)
          }
        }));
      }
      const Component = ({
        a = tag(_templateObject())
      }) => {
        return <div>{a}</div>;
      };"
    `);
  });

  test('named function component', () => {
    const result = transformCode(
      `
        function Component({
          a = tag\`hello\`,
        }) {
          return <div>{a}</div>;
        }
      `,
    );

    expect(result?.code).toMatchInlineSnapshot(`
      "function _templateObject() {
        const data = _taggedTemplateLiteral(["hello"]);
        _templateObject = () => data;
        return data;
      }
      function _taggedTemplateLiteral(e, t) {
        return t || (t = e.slice(0)), Object.freeze(Object.defineProperties(e, {
          raw: {
            value: Object.freeze(t)
          }
        }));
      }
      function Component({
        a = tag(_templateObject())
      }) {
        return <div>{a}</div>;
      }"
    `);
  });

  test('forwardRef component', () => {
    const result = transformCode(
      `
        const Component = forwardRef(({
          a = tag\`hello\`,
        }, ref) => {
          return <div>{a}</div>;
        });
      `,
    );

    expect(result?.code).toMatchInlineSnapshot(`
      "function _templateObject() {
        const data = _taggedTemplateLiteral(["hello"]);
        _templateObject = () => data;
        return data;
      }
      function _taggedTemplateLiteral(e, t) {
        return t || (t = e.slice(0)), Object.freeze(Object.defineProperties(e, {
          raw: {
            value: Object.freeze(t)
          }
        }));
      }
      const Component = forwardRef(({
        a = tag(_templateObject())
      }, ref) => {
        return <div>{a}</div>;
      });"
    `);
  });

  test('evaluated code is correct', () => {
    const result = transformCode(
      `
        function Component({
          a = tag\`hello\`,
        }) {
          return a;
        }
      `,
    );

    expect(
      vm.runInNewContext(`${result?.code};Component({});Component({})`, {
        tag: String.raw,
      }),
    ).toMatchInlineSnapshot(`
      "hello"
    `);
  });
});

test('do not transform in hooks', () => {
  const result = transformCode(
    `
      function useHook({
        a = tag\`hello\`,
      }) {
        return a;
      }
    `,
  );

  expect(result?.code).toMatchInlineSnapshot(`
    "function useHook({
      a = tag\`hello\`
    }) {
      return a;
    }"
  `);
});

test('do not transform in default values that are not in component props', () => {
  const result = transformCode(
    `
      const Component = ({
        a = 'a',
        c,
      }) => {
        function b({ d = __\`hello\` }) {
          return d;
        }

        const {
          e = tag\`hello 2\`,
        } = c;

        return <div>{a}{e}{b({})}</div>;
      }
    `,
  );

  expect(result?.code).toMatchInlineSnapshot(`
    "const Component = ({
      a = 'a',
      c
    }) => {
      function b({
        d = __\`hello\`
      }) {
        return d;
      }
      const {
        e = tag\`hello 2\`
      } = c;
      return <div>{a}{e}{b({})}</div>;
    };"
  `);
});
