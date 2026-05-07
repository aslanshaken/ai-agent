export const INTEGRATION_PROVIDER_IDS = ["gmail", "telegram", "exa", "tavily"] as const;

export type IntegrationProviderId = (typeof INTEGRATION_PROVIDER_IDS)[number];

export function isIntegrationProviderId(value: string): value is IntegrationProviderId {
  return (INTEGRATION_PROVIDER_IDS as readonly string[]).includes(value);
}
