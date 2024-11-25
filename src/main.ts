import { types as t, template } from '@babel/core';
import { declare } from '@babel/helper-plugin-utils';

export default declare<Record<string, never>>(() => {
  const helperName = 'taggedTemplateLiteral';

  return {
    name: 'transform-template-literals',

    visitor: {
      TaggedTemplateExpression(path) {
        const addHelper = (name: string): t.Expression => {
          return (this.addHelper as any)(name);
        };

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

        const helperId = addHelper(helperName);
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

        scope.path.unshiftContainer('body' as never, lazyLoad as any);
        path.replaceWith(
          t.callExpression(node.tag, [
            t.callExpression(t.cloneNode(templateObject), []),
            ...(quasi.expressions as t.Expression[]),
          ]),
        );
      },
    },
  };
});
