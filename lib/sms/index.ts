import { ISmsProvider } from "./types"
import { MockSmsProvider } from "./MockSmsProvider"

export * from "./types"
export * from "./MockSmsProvider"

let activeProvider: ISmsProvider = new MockSmsProvider()

export function getSmsProvider(): ISmsProvider {
  return activeProvider
}

export function setSmsProvider(provider: ISmsProvider): void {
  activeProvider = provider
}

export function resetSmsProvider(): void {
  activeProvider = new MockSmsProvider()
}
