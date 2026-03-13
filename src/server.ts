import { createApp } from "./app.js";
import { config } from "./config/index.js";

async function start(): Promise<void> {
  const app = await createApp();

  try {
    await app.listen({
      host: "0.0.0.0",
      port: config.PORT
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void start();
