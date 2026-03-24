module.exports = {
  apps: [
    {
      name: "posapp-backend",
      script: "dist/src/main.js",
      cwd: "./backend",
      env: {
        NODE_ENV: "production",
        PORT: 3050,
      }
    },
    {
      name: "posapp-frontend",
      script: "npm",
      args: "start",
      cwd: "./frontend",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      }
    }
  ]
};
