import { declare } from '@babel/helper-plugin-utils';
import { getExplicitResourceManagementPlugin } from './explicitResourceManagementPlugin.js';
import { getTemplateLiteralsPlugin } from './templateLiteralsPlugin.js';

export default declare<Record<string, never>>(() => {
  return {
    name: 'transform-template-literals',
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    manipulateOptions: (_, p) => p.plugins.push('explicitResourceManagement'),
    visitor: {
      Program(programPath, state) {
        const explicitResourceManagementPlugin =
          getExplicitResourceManagementPlugin();
        explicitResourceManagementPlugin.Program(programPath);
        programPath.traverse(explicitResourceManagementPlugin.visitors, state);

        programPath.traverse(getTemplateLiteralsPlugin().visitors);
      },
    },
  };
});
