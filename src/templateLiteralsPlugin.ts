import { NodePath, Visitor, types as t, template } from '@babel/core';

export function getTemplateLiteralsPlugin(): {
  visitors: Visitor;
} {
  function shouldTransformTaggedTemplate(
    path: NodePath<t.TaggedTemplateExpression>,
    componentFnNode?: t.Node,
  ): boolean {
    const { node } = path;
    const { quasi } = node;

    const hasInterpolations = quasi.expressions.length > 0;

    if (hasInterpolations) return true;

    const isDefaultValue =
      path.parentPath.isAssignmentPattern() &&
      path.parentPath.parentPath.isObjectProperty() &&
      path.parentPath.parentPath.parentPath.isObjectPattern() &&
      path.parentPath.parentPath.parentPath.parentPath.node === componentFnNode;

    if (isDefaultValue) return true;

    return false;
  }

  function transformTaggedTemplateInterpolations(
    path: NodePath<t.TaggedTemplateExpression>,
    componentFnNode?: t.Node,
  ): void {
    const { node } = path;
    const { quasi } = node;

    if (!shouldTransformTaggedTemplate(path, componentFnNode)) {
      return;
    }

    const callExpressionInput = getCallExpressionInputs(quasi, path);

    const scope = path.scope.getProgramParent();
    const templateObject = scope.generateUidIdentifier('templateObject');

    const helperId = addHelperIfNeeded(
      path,
      '_taggedTemplateLiteral',
      template.ast`
      function _taggedTemplateLiteral(e, t) {
        return t || (t = e.slice(0)), Object.freeze(Object.defineProperties(e, { raw: { value: Object.freeze(t) } }));
      }
    `,
    );

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

    return;
  }

  function traverseComponentFn(
    path: NodePath<t.FunctionDeclaration | t.ArrowFunctionExpression>,
  ) {
    path.traverse({
      TaggedTemplateExpression: (tagPath) => {
        transformTaggedTemplateInterpolations(tagPath, path.node);
      },
    });

    path.skip();
  }

  function traverseHookFn(path: NodePath<t.Node>) {
    path.traverse({
      TaggedTemplateExpression: (tagPath) => {
        transformTaggedTemplateInterpolations(tagPath);
      },
    });

    path.skip();
  }

  return {
    visitors: {
      FunctionDeclaration(path) {
        const { node } = path;

        if (node.id) {
          // function Component() {}
          if (startsWithCapitalLetter.test(node.id.name)) {
            traverseComponentFn(path);
            return;
          }

          // function useHook() {}
          if (hookPrefix.test(node.id.name)) {
            traverseHookFn(path);
            return;
          }
        }
      },

      ArrowFunctionExpression(path) {
        const parentPath = path.parentPath;

        if (t.isVariableDeclarator(parentPath.node)) {
          const id = parentPath.node.id;
          if (t.isIdentifier(id)) {
            // const Component = () => {}
            if (startsWithCapitalLetter.test(id.name)) {
              traverseComponentFn(path);
              return;
            }

            // const useHook = () => {}
            if (hookPrefix.test(id.name)) {
              traverseHookFn(path);
              return;
            }
          }
        } else if (t.isCallExpression(parentPath.node)) {
          // forwardRef(() => {})
          if (
            t.isIdentifier(parentPath.node.callee) &&
            parentPath.node.callee.name === 'forwardRef'
          ) {
            traverseComponentFn(path);
            return;
          }

          // React.forwardRef(() => {})
          else if (
            t.isMemberExpression(parentPath.node.callee) &&
            t.isIdentifier(parentPath.node.callee.property) &&
            parentPath.node.callee.property.name === 'forwardRef'
          ) {
            traverseComponentFn(path);
            return;
          }
        }
      },
    },
  };
}

const startsWithCapitalLetter = /^[A-Z]/;
const hookPrefix = /^use[A-Z]/;

function getCallExpressionInputs(
  quasi: t.TemplateLiteral,
  path: NodePath<t.TaggedTemplateExpression>,
) {
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

  const callExpressionInput = [t.arrayExpression(strings)];

  // only add raw arrayExpression if there is any difference between raws and strings
  if (!isStringsRawEqual) {
    callExpressionInput.push(t.arrayExpression(raws));
  }

  return callExpressionInput;
}

function addHelperIfNeeded(
  path: NodePath<t.Node>,
  helperId: string,
  helper: t.Statement | t.Statement[],
): t.Identifier {
  const scope = path.scope.getProgramParent();

  if (scope.hasBinding(helperId, { noGlobals: true })) {
    return t.identifier(helperId);
  }

  (scope.path as NodePath<t.Program>).unshiftContainer('body', helper);

  return t.identifier(helperId);
}
