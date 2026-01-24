import fetch from 'node-fetch'
import { Buffer } from 'buffer'

export interface JiraStory {
  key: string
  id: string
  fields: {
    summary: string
    description?: string
    issuetype: { name: string }
  }
}

export interface JiraStoryDetails {
  key: string
  title: string
  description?: string
  acceptanceCriteria?: string
}

export class JiraClient {
  private baseUrl: string
  private email: string
  private apiToken: string
  private isConnected: boolean

  constructor() {
    this.baseUrl = ''
    this.email = ''
    this.apiToken = ''
    this.isConnected = false
  }

  async connect(baseUrl: string, email: string, apiToken: string): Promise<boolean> {
    try {
      this.baseUrl = baseUrl.replace(/\/$/, '') // Remove trailing slash
      this.email = email
      this.apiToken = apiToken

      // Test connection by fetching current user
      const response = await fetch(`${this.baseUrl}/rest/api/3/myself`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      })

      if (!response.ok) {
        console.error('Jira connection failed:', response.status, response.statusText)
        this.isConnected = false
        return false
      }

      console.log('✅ Successfully connected to Jira')
      this.isConnected = true
      return true
    } catch (error) {
      console.error('❌ Error connecting to Jira:', error)
      this.isConnected = false
      return false
    }
  }

  async getStories(): Promise<JiraStory[]> {
    if (!this.isConnected) {
      throw new Error('Not connected to Jira. Please connect first.')
    }
    let v3Error: any = null
    try {
      // Try API v3 first
      return await this.getStoriesV3()
    } catch (error) {
      v3Error = error
      console.log('⚠️ API v3 failed, trying API v2 fallback...')
    }

    try {
      return await this.getStoriesV2()
    } catch (v2Error) {
      console.error('❌ Both API v3 and v2 failed:', v3Error, v2Error)
      const v3Msg = v3Error?.message || String(v3Error)
      const v2Msg = v2Error?.message || String(v2Error)
      throw new Error(`Failed to fetch stories: v3: ${v3Msg}; v2: ${v2Msg}`)
    }
  }

  private async getStoriesV3(): Promise<JiraStory[]> {
    const jql = 'type = Story ORDER BY updated DESC'
    const endpoint = `${this.baseUrl}/rest/api/3/search/jql`
    const body = {
      jql,
      maxResults: 50,
      fields: ['summary', 'description', 'issuetype']
    }

    console.log('🔍 Trying API v3 POST endpoint:', endpoint)
    console.log('➡️ Request body:', JSON.stringify(body))

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(body)
    })

    const respText = await response.text()
    console.log(`📊 Response status: ${response.status} ${response.statusText}`)
    console.log('⬅️ Response body:', respText)

    if (!response.ok) {
      console.error('❌ Error response:', respText)
      throw new Error(`Failed to fetch stories (API v3): ${response.status} ${response.statusText} - ${respText}`)
    }

    const data = JSON.parse(respText) as any
    console.log(`✅ Fetched ${data.issues?.length || 0} stories from API v3`)
    return data.issues || []
  }

  private async getStoriesV2(): Promise<JiraStory[]> {
    const jql = 'type = Story ORDER BY updated DESC'
    const endpoint = `${this.baseUrl}/rest/api/2/search/jql`
    const body = {
      jql,
      maxResults: 50,
      fields: ['summary', 'description', 'issuetype']
    }

    console.log('🔍 Trying API v2 POST endpoint:', endpoint)
    console.log('➡️ Request body:', JSON.stringify(body))

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(body)
    })

    const respText = await response.text()
    console.log(`📊 Response status: ${response.status} ${response.statusText}`)
    console.log('⬅️ Response body:', respText)

    if (!response.ok) {
      console.error('❌ Error response:', respText)
      throw new Error(`Failed to fetch stories (API v2): ${response.status} ${response.statusText} - ${respText}`)
    }

    const data = JSON.parse(respText) as any
    console.log(`✅ Fetched ${data.issues?.length || 0} stories from API v2`)
    return data.issues || []
  }

  async getStoryDetails(issueKey: string): Promise<JiraStoryDetails> {
    if (!this.isConnected) {
      throw new Error('Not connected to Jira. Please connect first.')
    }
    let v3Error: any = null
    try {
      // Try API v3 first
      return await this.getStoryDetailsV3(issueKey)
    } catch (error) {
      v3Error = error
      console.log('⚠️ API v3 failed for story details, trying API v2 fallback...')
    }

    try {
      return await this.getStoryDetailsV2(issueKey)
    } catch (v2Error) {
      console.error('❌ Both API v3 and v2 failed for story details:', v3Error, v2Error)
      const v3Msg = v3Error?.message || String(v3Error)
      const v2Msg = v2Error?.message || String(v2Error)
      throw new Error(`Failed to fetch story details: v3: ${v3Msg}; v2: ${v2Msg}`)
    }
  }

  private async getStoryDetailsV3(issueKey: string): Promise<JiraStoryDetails> {
    const endpoint = `${this.baseUrl}/rest/api/3/issue/${issueKey}`
    const fullUrl = `${endpoint}?fields=summary,description,customfield_10046`
    
    console.log('🔍 Fetching story details from API v3:', fullUrl)

    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: this.getAuthHeaders()
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to fetch story details (API v3): ${response.status} ${response.statusText} - ${errorText}`)
    }

    const data = await response.json() as any
    return this.extractStoryDetails(data)
  }

  private async getStoryDetailsV2(issueKey: string): Promise<JiraStoryDetails> {
    const endpoint = `${this.baseUrl}/rest/api/2/issue/${issueKey}`
    const fullUrl = `${endpoint}?fields=summary,description,customfield_10046`
    
    console.log('🔍 Fetching story details from API v2:', fullUrl)

    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: this.getAuthHeaders()
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to fetch story details (API v2): ${response.status} ${response.statusText} - ${errorText}`)
    }

    const data = await response.json() as any
    return this.extractStoryDetails(data)
  }

  private extractStoryDetails(data: any): JiraStoryDetails {
    const fields = data.fields || {}

    // Extract description and acceptance criteria
    let description = ''
    let acceptanceCriteria = ''

    if (fields.description && typeof fields.description === 'string') {
      description = fields.description
    } else if (fields.description && typeof fields.description === 'object' && fields.description.content) {
      // Jira uses rich text format (ADF)
      description = this.extractTextFromADF(fields.description)
    }

    // Acceptance criteria might be in a custom field (customfield_10046 is typical for AC)
    // or in the description. Adjust field ID as needed for your Jira instance
    if (fields.customfield_10046) {
      acceptanceCriteria = fields.customfield_10046
    }

    return {
      key: data.key,
      title: fields.summary || '',
      description,
      acceptanceCriteria
    }
  }

  private getAuthHeaders(): Record<string, string> {
    const auth = Buffer.from(`${this.email}:${this.apiToken}`).toString('base64')
    return {
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  }

  private extractTextFromADF(adfContent: any): string {
    // Simple ADF text extraction
    let text = ''
    if (adfContent.content) {
      for (const block of adfContent.content) {
        if (block.type === 'paragraph' && block.content) {
          for (const inline of block.content) {
            if (inline.text) {
              text += inline.text
            }
          }
          text += '\n'
        }
      }
    }
    return text.trim()
  }

  isConnectedToJira(): boolean {
    return this.isConnected
  }

  getConnectionInfo(): { baseUrl: string; email: string } | null {
    if (!this.isConnected) {
      return null
    }
    return {
      baseUrl: this.baseUrl,
      email: this.email
    }
  }
}

// Global Jira client instance
export const jiraClientInstance = new JiraClient()
