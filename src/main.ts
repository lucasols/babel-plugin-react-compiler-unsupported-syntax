import { NodePath, types as t, template } from '@babel/core';
import { declare } from '@babel/helper-plugin-utils';

export default declare<Record<string, never>>(() => {
  function addHelperIfNeeded(path: NodePath<t.Node>): t.Expression {
    const scope = path.scope.getProgramParent();
    const helperId = `_taggedTemplateLiteral`;

    if (scope.hasBinding(helperId)) {
      return t.identifier(helperId);
    }

    const helper = template.ast`
      function ${helperId}(e, t) {
        return t || (t = e.slice(0)), Object.freeze(Object.defineProperties(e, { raw: { value: Object.freeze(t) } }));
      }
    `;

    (scope.path as NodePath<t.Program>).unshiftContainer('body', helper);

    return t.identifier(helperId);
  }

  function visitTaggedTemplateExpressions(
    path: NodePath<t.TaggedTemplateExpression>,
  ) {
    const { node } = path;
    const { quasi } = node;

    if (quasi.expressions.length === 0) {
      return;
    }

    const strings = [];
    const raws = [];

    // Flag variable to check if contents of strings and raw are equal
    let isStringsRawEqual = true;

    for (const elem of quasi.quasis) {
      const { raw, cooked } = elem.value;
      const value =
        cooked == null ?
          path.scope.buildUndefinedNode()
        : t.stringLiteral(cooked);

      strings.push(value);
      raws.push(t.stringLiteral(raw));

      if (raw !== cooked) {
        // false even if one of raw and cooked are not equal
        isStringsRawEqual = false;
      }
    }

    const scope = path.scope.getProgramParent();
    const templateObject = scope.generateUidIdentifier('templateObject');

    const helperId = addHelperIfNeeded(path);
    const callExpressionInput = [t.arrayExpression(strings)];

    // only add raw arrayExpression if there is any difference between raws and strings
    if (!isStringsRawEqual) {
      callExpressionInput.push(t.arrayExpression(raws));
    }

    const lazyLoad = template.ast`
          function ${templateObject}() {
            const data = ${t.callExpression(helperId, callExpressionInput)};
            ${templateObject} = () => data;
            return data;
          }
        `;

    (scope.path as NodePath<t.Program>).unshiftContainer('body', lazyLoad);

    path.replaceWith(
      t.callExpression(node.tag, [
        t.callExpression(t.cloneNode(templateObject), []),
        ...(quasi.expressions as t.Expression[]),
      ]),
    );
  }

  function visitTaggedTemplateExpressionsAndSkip(path: NodePath<t.Node>) {
    path.traverse({
      TaggedTemplateExpression: visitTaggedTemplateExpressions,
    });

    path.skip();
  }

  return {
    name: 'transform-template-literals',
    visitor: {
      Program(programPath) {
        programPath.traverse({
          FunctionDeclaration(path) {
            const { node } = path;

            if (node.id) {
              // function Component() {} or function useHook() {}
              if (
                startsWithCapitalLetter.test(node.id.name) ||
                hookPrefix.test(node.id.name)
              ) {
                visitTaggedTemplateExpressionsAndSkip(path);
                return;
              }
            }
          },

          ArrowFunctionExpression(path) {
            const parentPath = path.parentPath;

            if (t.isVariableDeclarator(parentPath.node)) {
              const id = parentPath.node.id;
              if (t.isIdentifier(id)) {
                // const Component = () => {} or const useHook = () => {}
                if (
                  startsWithCapitalLetter.test(id.name) ||
                  hookPrefix.test(id.name)
                ) {
                  visitTaggedTemplateExpressionsAndSkip(path);
                  return;
                }
              }
            } else if (t.isCallExpression(parentPath.node)) {
              // forwardRef(() => {})
              if (
                t.isIdentifier(parentPath.node.callee) &&
                parentPath.node.callee.name === 'forwardRef'
              ) {
                visitTaggedTemplateExpressionsAndSkip(path);
                return;
              }

              // React.forwardRef(() => {})
              else if (
                t.isMemberExpression(parentPath.node.callee) &&
                t.isIdentifier(parentPath.node.callee.property) &&
                parentPath.node.callee.property.name === 'forwardRef'
              ) {
                visitTaggedTemplateExpressionsAndSkip(path);
                return;
              }
            }
          },
        });
      },
    },
  };
});

const startsWithCapitalLetter = /^[A-Z]/;
const hookPrefix = /^use[A-Z]/;
