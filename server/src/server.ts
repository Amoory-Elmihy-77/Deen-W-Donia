import { connectDB } from "./config/database";
import { config } from "./config";
import app from "./app";

async function main() {
  await connectDB();

  app.listen(config.port, () => {
    console.log(`🚀 Deen_W_Donya API running on port ${config.port}`);
    console.log(`   Environment: ${config.nodeEnv}`);
    console.log(`   Health: http://localhost:${config.port}/health`);
  });
}

main().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
