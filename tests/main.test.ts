import { BabelFileResult, transformSync } from '@babel/core';
import { dedent } from '@ls-stack/utils/dedent';
import { expect, test } from 'vitest';
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

test('transform tagged template literals', () => {
  const result = transformCode(
    `
      const Component = () => {
        const a = tag\`hello \${name}\`;

        const b = tag\`hello \${foo(name)}\`;

        const c = tag\`hello \${_.foo(name)}\`;

        const d = tag\`hello \${\`hello \${name}\`}\`;

        const e = tag\`hello \${foo2 + bar2}\`;

        let f = bar\`wow\na\${ 42 }b \${_.foobar()}\`;

        var g = tag\`test \${a} \${b}\`;
      }
    `,
  );

  expect(result?.code).toMatchInlineSnapshot(`
    "function _templateObject7() {
      const data = _taggedTemplateLiteral(["test ", " ", ""]);
      _templateObject7 = () => data;
      return data;
    }
    function _templateObject6() {
      const data = _taggedTemplateLiteral(["wow\\na", "b ", ""]);
      _templateObject6 = () => data;
      return data;
    }
    function _templateObject5() {
      const data = _taggedTemplateLiteral(["hello ", ""]);
      _templateObject5 = () => data;
      return data;
    }
    function _templateObject4() {
      const data = _taggedTemplateLiteral(["hello ", ""]);
      _templateObject4 = () => data;
      return data;
    }
    function _templateObject3() {
      const data = _taggedTemplateLiteral(["hello ", ""]);
      _templateObject3 = () => data;
      return data;
    }
    function _templateObject2() {
      const data = _taggedTemplateLiteral(["hello ", ""]);
      _templateObject2 = () => data;
      return data;
    }
    function _templateObject() {
      const data = _taggedTemplateLiteral(["hello ", ""]);
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
    const Component = () => {
      const a = tag(_templateObject(), name);
      const b = tag(_templateObject2(), foo(name));
      const c = tag(_templateObject3(), _.foo(name));
      const d = tag(_templateObject4(), \`hello \${name}\`);
      const e = tag(_templateObject5(), foo2 + bar2);
      let f = bar(_templateObject6(), 42, _.foobar());
      var g = tag(_templateObject7(), a, b);
    };"
  `);
});

test('tag evaluated code is correct', () => {
  const result = transformCode(
    `
      function useHook() {
        const name = 'lucas';
        const a = tag\`hello \${name} \${'test'}\`;

        const b = tag\`hello \${foo(name)}\`;

        return { a, b };
      }
    `,
  );

  expect(
    vm.runInNewContext(`${result?.code};useHook()`, {
      tag: String.raw,
      foo(name: string) {
        return `foo ${name}`;
      },
    }),
  ).toMatchInlineSnapshot(`
    {
      "a": "hello lucas test",
      "b": "hello foo lucas",
    }
  `);
});

test('tagged template literals with no interpolations should not be transformed', () => {
  expect(
    transformCode(
      `
      function Component() {
        const a = tag\`hello\`;

        var bar = tag\`first second\`;
      }
    `,
    )?.code,
  ).toMatchInlineSnapshot(`
    "function Component() {
      const a = tag\`hello\`;
      var bar = tag\`first second\`;
    }"
  `);
});

test('simple template literals should not be transformed', () => {
  expect(
    transformCode(
      `
      function Component() {
        const a = \`hello \${name}\`;

        const b = \`hello \${foo(name)}\`;

        const c = \`hello \${_.foo(name)}\`;

        const d = \`hello \${\`hello \${name}\`}\`;
      }
    `,
    )?.code,
  ).toMatchInlineSnapshot(`
    "function Component() {
      const a = \`hello \${name}\`;
      const b = \`hello \${foo(name)}\`;
      const c = \`hello \${_.foo(name)}\`;
      const d = \`hello \${\`hello \${name}\`}\`;
    }"
  `);
});

test('tag with unicode escape', () => {
  const result = transformCode(
    `
      function Component() {
        var foo = bar\`\u0061\u{0061}\ud835\udc9c\u{1d49c} \${1}\`;

        return foo;
      }
    `,
  );

  expect(result?.code).toMatchInlineSnapshot(`
    "function _templateObject() {
      const data = _taggedTemplateLiteral(["aa\\uD835\\uDC9C\\uD835\\uDC9C ", ""]);
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
    function Component() {
      var foo = bar(_templateObject(), 1);
      return foo;
    }"
  `);

  expect(
    vm.runInNewContext(`${result?.code};Component()`, {
      bar: String.raw,
    }),
  ).toMatchInlineSnapshot(`"aa𝒜𝒜 1"`);
});

test('used inside a named function react component', () => {
  const result = transformCode(
    `
      function Component() {
        const a = tag\`hello \${name}\`;
      }
    `,
  );

  expect(result?.code).toMatchInlineSnapshot(`
    "function _templateObject() {
      const data = _taggedTemplateLiteral(["hello ", ""]);
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
    function Component() {
      const a = tag(_templateObject(), name);
    }"
  `);
});

test('used inside a arrow function react component', () => {
  const result = transformCode(
    `
      const Component = () => {
        const a = tag\`hello \${name}\`;
      }
    `,
  );

  expect(result?.code).toMatchInlineSnapshot(`
    "function _templateObject() {
      const data = _taggedTemplateLiteral(["hello ", ""]);
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
    const Component = () => {
      const a = tag(_templateObject(), name);
    };"
  `);
});

test('used inside a forwardRef react component', () => {
  const result = transformCode(
    `
      const Component = forwardRef((props, ref) => {
        const a = tag\`hello \${name}\`;
      });

      const Component2 = React.forwardRef((props, ref) => {
        const a = tag\`hello \${name}\`;
      });
    `,
  );

  expect(result?.code).toMatchInlineSnapshot(`
    "function _templateObject2() {
      const data = _taggedTemplateLiteral(["hello ", ""]);
      _templateObject2 = () => data;
      return data;
    }
    function _templateObject() {
      const data = _taggedTemplateLiteral(["hello ", ""]);
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
    const Component = forwardRef((props, ref) => {
      const a = tag(_templateObject(), name);
    });
    const Component2 = React.forwardRef((props, ref) => {
      const a = tag(_templateObject2(), name);
    });"
  `);
});

test('used inside a named function react hook', () => {
  const result = transformCode(
    `
      function useHook() {
        const a = tag\`hello \${name}\`;

        function b() {
          const a = tag\`hello \${name}\`;
        }
      }
    `,
  );

  expect(result?.code).toMatchInlineSnapshot(`
    "function _templateObject2() {
      const data = _taggedTemplateLiteral(["hello ", ""]);
      _templateObject2 = () => data;
      return data;
    }
    function _templateObject() {
      const data = _taggedTemplateLiteral(["hello ", ""]);
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
    function useHook() {
      const a = tag(_templateObject(), name);
      function b() {
        const a = tag(_templateObject2(), name);
      }
    }"
  `);
});

test('used inside a arrow function react hook', () => {
  const result = transformCode(
    `
      const useHook = () => {
        const a = tag\`hello \${name}\`;
      }
    `,
  );

  expect(result?.code).toMatchInlineSnapshot(`
    "function _templateObject() {
      const data = _taggedTemplateLiteral(["hello ", ""]);
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
    const useHook = () => {
      const a = tag(_templateObject(), name);
    };"
  `);
});

test('do nothing when not inside a react component or hook', () => {
  const result = transformCode(
    `
      function genericFunction() {
        const a = tag\`hello \${name}\`;
      }
    `,
  );

  expect(result?.code).toMatchInlineSnapshot(`
    "function genericFunction() {
      const a = tag\`hello \${name}\`;
    }"
  `);
});
