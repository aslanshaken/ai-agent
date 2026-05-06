/** Telegram Bot API adapter — webhook + commands ship later. */
export function createTelegramIntegrationStub() {
  return {
    id: "telegram" as const,
    isConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN),
  };
}
