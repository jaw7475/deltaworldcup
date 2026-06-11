import { MockProvider } from "./mock"
import { FootballDataApiProvider } from "./football-data"
import type { FootballDataProvider } from "./types"

export function getProvider(): FootballDataProvider {
  const useMock = process.env.MOCK_PROVIDER === "1"
  const token = process.env.FOOTBALL_DATA_TOKEN
  if (useMock || !token) {
    return new MockProvider(process.env.MOCK_FIXTURES ?? "scheduled")
  }
  return new FootballDataApiProvider(token)
}
