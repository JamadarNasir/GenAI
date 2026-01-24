import { GenerateRequest, GenerateResponse, JiraConnectionCredentials, JiraStory, JiraStoryDetails, JiraConnectionStatus } from './types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'

console.log('🔗 API Base URL:', API_BASE_URL)

export async function generateTests(request: GenerateRequest): Promise<GenerateResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/generate-tests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }

    const data: GenerateResponse = await response.json()
    return data
  } catch (error) {
    console.error('Error generating tests:', error)
    throw error instanceof Error ? error : new Error('Unknown error occurred')
  }
}

// Jira API functions
export async function connectToJira(credentials: JiraConnectionCredentials): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const url = `${API_BASE_URL}/jira/connect`
    console.log('📡 Connecting to Jira at:', url)
    console.log('📦 Credentials:', { baseUrl: credentials.baseUrl, email: credentials.email })
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    })

    console.log('📊 Connection response status:', response.status, response.statusText)

    const data = await response.json()
    
    if (!response.ok) {
      console.error('❌ Jira connection failed:', data)
      throw new Error(data.error || 'Failed to connect to Jira')
    }

    console.log('✅ Jira connection successful')
    return { success: true, message: data.message }
  } catch (error) {
    console.error('❌ Error connecting to Jira:', error)
    const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred'
    return {
      success: false,
      error: errorMsg
    }
  }
}

export async function getJiraConnectionStatus(): Promise<JiraConnectionStatus> {
  try {
    const url = `${API_BASE_URL}/jira/status`
    console.log('🔍 Checking Jira status:', url)
    
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error('Failed to get Jira connection status')
    }

    const data = await response.json()
    console.log('✅ Jira status:', data)
    return data
  } catch (error) {
    console.error('❌ Error getting Jira status:', error)
    return {
      isConnected: false,
      connection: null
    }
  }
}

export async function getJiraStories(): Promise<JiraStory[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/jira/stories`)
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || 'Failed to fetch stories')
    }

    const data = await response.json()
    return data.stories || []
  } catch (error) {
    console.error('Error fetching Jira stories:', error)
    throw error instanceof Error ? error : new Error('Unknown error occurred')
  }
}

export async function getJiraStoryDetails(key: string): Promise<JiraStoryDetails> {
  try {
    const response = await fetch(`${API_BASE_URL}/jira/story/${key}`)
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || 'Failed to fetch story details')
    }

    const data = await response.json()
    return data.story
  } catch (error) {
    console.error('Error fetching story details:', error)
    throw error instanceof Error ? error : new Error('Unknown error occurred')
  }
}

export async function disconnectFromJira(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/jira/disconnect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    })

    return response.ok
  } catch (error) {
    console.error('Error disconnecting from Jira:', error)
    return false
  }
}