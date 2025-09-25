import { Express } from 'express';
import fs from 'fs';
import path from 'path';

export const loadRoutes = (app: Express, routesPath: string) => {
  const files = fs.readdirSync(routesPath);

  files.forEach(async (file) => {
    if (file.endsWith('.route.ts') || file.endsWith('.route.js')) {
      console.log('routesPath', routesPath);
      const routeModule = await import(path.join(routesPath, file));

      if (routeModule.default) {
        // Extract route name from file name (e.g., 'user.route.ts' -> 'user')
        const routeName = file.split('.')[0];
        const basePath = `/api/${routeName}`;

        app.use(basePath, routeModule.default);
      }
    }
  });
};
