import { ISmsProvider, SmsSendResult } from "./types"
import crypto from "crypto"

export class MockSmsProvider implements ISmsProvider {
  readonly name = "MockSmsProvider"

  async sendSms(recipientPhone: string, messageBody: string): Promise<SmsSendResult> {
    const cleanPhone = (recipientPhone || "").trim()

    // Deterministic simulation rules for testing failure cases
    if (!cleanPhone || cleanPhone.includes("FAIL") || cleanPhone.startsWith("0000000000")) {
      return {
        success: false,
        error: `Simulated gateway error: Invalid phone number '${cleanPhone}' or destination unreachable.`,
      }
    }

    if (!messageBody || messageBody.trim().length === 0) {
      return {
        success: false,
        error: "Message body cannot be empty.",
      }
    }

    const gatewayReference = `MOCK-GW-${crypto.randomBytes(4).toString("hex").toUpperCase()}`

    return {
      success: true,
      gatewayReference,
    }
  }
}
