export interface GenerateRequest {
  storyTitle: string
  acceptanceCriteria: string
  description?: string
  additionalInfo?: string
}

export interface TestCase {
  id: string
  title: string
  steps: string[]
  testData?: string
  expectedResult: string
  category: string
}

export interface GenerateResponse {
  cases: TestCase[]
  model?: string
  promptTokens: number
  completionTokens: number
}

// Jira types
export interface JiraConnectionCredentials {
  baseUrl: string
  email: string
  apiToken: string
}

export interface JiraStory {
  key: string
  id: string
  title: string
  issueType: string
}

export interface JiraStoryDetails {
  key: string
  title: string
  description?: string
  acceptanceCriteria?: string
}

export interface JiraConnectionStatus {
  isConnected: boolean
  connection: {
    baseUrl: string
    email: string
  } | null
}