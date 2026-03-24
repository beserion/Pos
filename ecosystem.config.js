module.exports = {
  apps: [
    {
      name: "BOSNAK-backend",
      script: "dist/src/main.js",
      cwd: "./backend",
      env: {
        NODE_ENV: "production",
        PORT: 3051,
      }
    },
    {
      name: "BOSNAK-frontend",
      script: "npm",
      args: "start",
      cwd: "./frontend",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      }
    }
  ]
};
