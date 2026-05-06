/** Gmail API adapter — OAuth + send/list live in a later milestone. */
export function createGmailIntegrationStub() {
  return {
    id: "gmail" as const,
    isConfigured: Boolean(
      process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
    ),
  };
}
