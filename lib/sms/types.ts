export interface SmsSendResult {
  success: boolean
  gatewayReference?: string
  error?: string
}

export interface ISmsProvider {
  readonly name: string
  sendSms(recipientPhone: string, messageBody: string): Promise<SmsSendResult>
}
