/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import type { NodePath, PluginPass, Visitor } from '@babel/core';
import { types as t, template, traverse } from '@babel/core';

const enum UsingKind {
  NORMAL,
  AWAIT,
}

export function getExplicitResourceManagementPlugin() {
  const TOP_LEVEL_USING = new Map<t.Node, UsingKind>();

  function isUsingDeclaration(node: t.Node): node is t.VariableDeclaration {
    if (!t.isVariableDeclaration(node)) return false;
    return (
      node.kind === 'using' ||
      node.kind === 'await using' ||
      TOP_LEVEL_USING.has(node)
    );
  }

  const transformUsingDeclarationsVisitor: Visitor<PluginPass> = {
    ForOfStatement(path: NodePath<t.ForOfStatement>) {
      const { left } = path.node;
      if (!isUsingDeclaration(left)) return;

      const { id } = left.declarations[0]!;
      const tmpId = path.scope.generateUidIdentifierBasedOnNode(id);
      left.declarations[0]!.id = tmpId;
      left.kind = 'const';

      path.ensureBlock();
      path.node.body.body.unshift(
        t.variableDeclaration('using', [
          t.variableDeclarator(id, t.cloneNode(tmpId)),
        ]),
      );
    },
    ['BlockStatement|StaticBlock' as 'BlockStatement'](
      path: NodePath<t.BlockStatement | t.StaticBlock>,
      state,
    ) {
      if (
        process.env.BABEL_8_BREAKING ||
        (state as any).availableHelper('usingCtx')
      ) {
        let ctx: t.Identifier | null = null;
        let needsAwait = false;

        for (const node of path.node.body) {
          if (!isUsingDeclaration(node)) continue;
          ctx ??= path.scope.generateUidIdentifier('usingCtx');
          const isAwaitUsing =
            node.kind === 'await using' ||
            TOP_LEVEL_USING.get(node) === UsingKind.AWAIT;
          needsAwait ||= isAwaitUsing;

          if (!TOP_LEVEL_USING.delete(node)) {
            node.kind = 'const';
          }
          for (const decl of node.declarations) {
            decl.init = t.callExpression(
              t.memberExpression(
                t.cloneNode(ctx),
                isAwaitUsing ? t.identifier('a') : t.identifier('u'),
              ),
              [decl.init!],
            );
          }
        }
        if (!ctx) return;

        const disposeCall = t.callExpression(
          t.memberExpression(t.cloneNode(ctx), t.identifier('d')),
          [],
        );

        const replacement = template.statement.ast`
        try {
          var ${t.cloneNode(ctx)} = ${(state as any).addHelper('usingCtx')}();
          ${path.node.body}
        } catch (_) {
          ${t.cloneNode(ctx)}.e = _;
        } finally {
          ${needsAwait ? t.awaitExpression(disposeCall) : disposeCall}
        }
      ` as t.TryStatement;

        t.inherits(replacement, path.node);

        const { parentPath } = path;
        if (
          parentPath.isFunction() ||
          parentPath.isTryStatement() ||
          parentPath.isCatchClause()
        ) {
          path.replaceWith(t.blockStatement([replacement]));
        } else if (path.isStaticBlock()) {
          path.node.body = [replacement];
        } else {
          path.replaceWith(replacement);
        }
      } else {
        let stackId: t.Identifier | null = null;
        let needsAwait = false;

        for (const node of path.node.body) {
          if (!isUsingDeclaration(node)) continue;
          stackId ??= path.scope.generateUidIdentifier('stack');
          const isAwaitUsing =
            node.kind === 'await using' ||
            TOP_LEVEL_USING.get(node) === UsingKind.AWAIT;
          needsAwait ||= isAwaitUsing;

          if (!TOP_LEVEL_USING.delete(node)) {
            node.kind = 'const';
          }
          node.declarations.forEach((decl) => {
            const args = [t.cloneNode(stackId!), decl.init!];
            if (isAwaitUsing) args.push(t.booleanLiteral(true));
            decl.init = t.callExpression(
              (state as any).addHelper('using'),
              args,
            );
          });
        }
        if (!stackId) return;

        const errorId = path.scope.generateUidIdentifier('error');
        const hasErrorId = path.scope.generateUidIdentifier('hasError');

        let disposeCall: t.Expression = t.callExpression(
          (state as any).addHelper('dispose'),
          [t.cloneNode(stackId), t.cloneNode(errorId), t.cloneNode(hasErrorId)],
        );
        if (needsAwait) disposeCall = t.awaitExpression(disposeCall);

        const replacement = template.statement.ast`
        try {
          var ${stackId} = [];
          ${path.node.body}
        } catch (_) {
          var ${errorId} = _;
          var ${hasErrorId} = true;
        } finally {
          ${disposeCall}
        }
      ` as t.TryStatement;

        t.inherits(replacement.block, path.node);

        const { parentPath } = path;
        if (
          parentPath.isFunction() ||
          parentPath.isTryStatement() ||
          parentPath.isCatchClause()
        ) {
          path.replaceWith(t.blockStatement([replacement]));
        } else if (path.isStaticBlock()) {
          path.node.body = [replacement];
        } else {
          path.replaceWith(replacement);
        }
      }
    },
    SwitchStatement(path, state) {
      let ctx: t.Identifier | null = null;
      let needsAwait = false;

      const { cases } = path.node;
      for (const c of cases) {
        for (const stmt of c.consequent) {
          if (isUsingDeclaration(stmt)) {
            if (
              !process.env.BABEL_8_BREAKING &&
              !(state as any).availableHelper('usingCtx')
            ) {
              path.traverse({
                VariableDeclaration(path) {
                  const { node } = path;
                  if (!isUsingDeclaration(node)) return;
                  throw path.buildCodeFrameError(
                    '`using` declarations inside `switch` statements are not supported by your current `@babel/core` version, please update to a more recent one',
                  );
                },
              });
            }

            ctx ??= path.scope.generateUidIdentifier('usingCtx');

            const isAwaitUsing = stmt.kind === 'await using';
            needsAwait ||= isAwaitUsing;

            stmt.kind = 'const';
            for (const decl of stmt.declarations) {
              decl.init = t.callExpression(
                t.memberExpression(
                  t.cloneNode(ctx),
                  isAwaitUsing ? t.identifier('a') : t.identifier('u'),
                ),
                [decl.init!],
              );
            }
          }
        }
      }
      if (!ctx) return;

      const disposeCall = t.callExpression(
        t.memberExpression(t.cloneNode(ctx), t.identifier('d')),
        [],
      );

      const replacement = template.statement.ast`
        try {
          var ${t.cloneNode(ctx)} = ${(state as any).addHelper('usingCtx')}();
          ${path.node}
        } catch (_) {
          ${t.cloneNode(ctx)}.e = _;
        } finally {
          ${needsAwait ? t.awaitExpression(disposeCall) : disposeCall}
        }
      ` as t.TryStatement;

      t.inherits(replacement, path.node);

      path.replaceWith(replacement);
    },
  };

  const transformUsingDeclarationsVisitorSkipFn: Visitor<PluginPass> =
    traverse.visitors.merge([
      transformUsingDeclarationsVisitor,
      {
        Function(path) {
          path.skip();
        },
      },
    ]);

  return {
    Program(path: NodePath<t.Program>) {
      TOP_LEVEL_USING.clear();

      if (path.node.sourceType !== 'module') return;
      if (!path.node.body.some(isUsingDeclaration)) return;

      const innerBlockBody = [];
      for (const stmt of path.get('body')) {
        if (stmt.isFunctionDeclaration() || stmt.isImportDeclaration()) {
          continue;
        }

        let node: t.Statement | t.Declaration | undefined | null = stmt.node;
        let shouldRemove = true;

        if (stmt.isExportDefaultDeclaration()) {
          let { declaration } = stmt.node;
          let varId;
          if (t.isClassDeclaration(declaration)) {
            varId = declaration.id;
            declaration.id = null;
            declaration = t.toExpression(declaration);
          } else if (!t.isExpression(declaration)) {
            continue;
          }

          varId ??= path.scope.generateUidIdentifier('_default');
          innerBlockBody.push(
            t.variableDeclaration('var', [
              t.variableDeclarator(varId, declaration),
            ]),
          );
          stmt.replaceWith(
            t.exportNamedDeclaration(null, [
              t.exportSpecifier(t.cloneNode(varId), t.identifier('default')),
            ]),
          );
          continue;
        }

        if (stmt.isExportNamedDeclaration()) {
          node = stmt.node.declaration;
          if (!node || t.isFunction(node)) continue;

          stmt.replaceWith(
            t.exportNamedDeclaration(
              null,
              Object.keys(t.getOuterBindingIdentifiers(node, false)).map((id) =>
                t.exportSpecifier(t.identifier(id), t.identifier(id)),
              ),
            ),
          );
          shouldRemove = false;
        } else if (stmt.isExportDeclaration()) {
          continue;
        }

        if (t.isClassDeclaration(node)) {
          const { id } = node;
          node.id = null;
          innerBlockBody.push(
            t.variableDeclaration('var', [
              t.variableDeclarator(id!, t.toExpression(node)),
            ]),
          );
        } else if (t.isVariableDeclaration(node)) {
          if (node.kind === 'using') {
            TOP_LEVEL_USING.set(stmt.node, UsingKind.NORMAL);
          } else if (node.kind === 'await using') {
            TOP_LEVEL_USING.set(stmt.node, UsingKind.AWAIT);
          }
          node.kind = 'var';
          innerBlockBody.push(node);
        } else {
          innerBlockBody.push(stmt.node);
        }

        if (shouldRemove) stmt.remove();
      }

      path.pushContainer('body', t.blockStatement(innerBlockBody));
    },
    visitors: traverse.visitors.merge([
      transformUsingDeclarationsVisitor,
      {
        // To transform top-level using declarations, we must wrap the
        // module body in a block after hoisting all the exports and imports.
        // This might cause some variables to be `undefined` rather than TDZ.

        // We must transform `await using` in async functions before that
        // async-to-generator will transform `await` expressions into `yield`
        Function(path, state) {
          if (path.node.async) {
            path.traverse(transformUsingDeclarationsVisitorSkipFn, state);
          }
        },
      },
    ]),
  };
}
