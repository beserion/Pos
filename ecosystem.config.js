module.exports = {
  apps: [
    {
      name: "backend",
      script: "dist/src/main.js",
      cwd: "./backend",
      env: {
        NODE_ENV: "production",
        PORT: 3050,
      }
    },
    {
      name: "frontend",
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
