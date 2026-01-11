module.exports = {
  apps: [
    {
      name: "reserve-app", // app name in PM2 list
      script: "dist/app.js", // compiled Node entry point
      interpreter: "node",
      instances: 1, // or "max" for cluster mode
      autorestart: true,
      watch: true, // enable file watching
      ignore_watch: [
        // optional: ignore logs/node_modules
        "node_modules",
        "logs",
      ],
      env: {
        NODE_ENV: "development",
        VITE_API_BASE_URL: "http://reserve.actpy.com/api/reserve",
        MIGRATE_MONGO_URI: "mongodb://localhost:27017/drawdown_db",
        MIGRATE_MONGO_COLLECTION: "migrations",
        MIGRATE_MIGRATIONS_PATH: "./migrations",
        MIGRATE_TEMPLATE_PATH: "./migrations/template.ts",
        MIGRATE_AUTOSYNC: false,
      },
    },
  ],
};
