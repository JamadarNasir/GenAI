import express from 'express'
import { jiraClientInstance } from '../llm/jiraClient'
import { z } from 'zod'

export const jiraRouter = express.Router()

const JiraConnectionSchema = z.object({
  baseUrl: z.string().min(1, 'Base URL is required'),
  email: z.string().min(1, 'Email is required'),
  apiToken: z.string().min(1, 'API token is required')
})

// Connect to Jira
jiraRouter.post('/connect', async (req: express.Request, res: express.Response): Promise<void> => {
  console.log('📨 [Jira Connect] Received request:', { body: req.body })
  
  try {
    const validationResult = JiraConnectionSchema.safeParse(req.body)
    
    if (!validationResult.success) {
      console.error('❌ [Jira Connect] Validation failed:', validationResult.error.errors)
      res.status(400).json({
        error: `Validation error: ${validationResult.error.errors.map(e => e.message).join(', ')}`
      })
      return
    }

    const { baseUrl, email, apiToken } = validationResult.data
    console.log('🔐 [Jira Connect] Attempting connection to:', baseUrl)
    
    const connected = await jiraClientInstance.connect(baseUrl, email, apiToken)

    if (connected) {
      console.log('✅ [Jira Connect] Connection successful!')
      res.json({
        success: true,
        message: 'Successfully connected to Jira',
        connection: jiraClientInstance.getConnectionInfo()
      })
    } else {
      console.error('❌ [Jira Connect] Connection failed')
      res.status(401).json({
        success: false,
        error: 'Failed to connect to Jira. Please check your credentials and try again.'
      })
    }
  } catch (error) {
    console.error('❌ [Jira Connect] Error:', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    })
  }
})

// Get connection status
jiraRouter.get('/status', (req: express.Request, res: express.Response): void => {
  console.log('📨 [Jira Status] Checking connection status')
  const isConnected = jiraClientInstance.isConnectedToJira()
  const connectionInfo = jiraClientInstance.getConnectionInfo()

  console.log('✅ [Jira Status] Connection status:', { isConnected })
  res.json({
    isConnected,
    connection: connectionInfo
  })
})

// Get all stories
jiraRouter.get('/stories', async (req: express.Request, res: express.Response): Promise<void> => {
  console.log('📨 [Jira Stories] Fetching stories...')
  try {
    if (!jiraClientInstance.isConnectedToJira()) {
      console.error('❌ [Jira Stories] Not connected to Jira')
      res.status(401).json({
        error: 'Not connected to Jira. Please connect first.'
      })
      return
    }

    const stories = await jiraClientInstance.getStories()
    
    console.log(`✅ [Jira Stories] Fetched ${stories.length} stories`)
    res.json({
      success: true,
      stories: stories.map(story => ({
        key: story.key,
        id: story.id,
        title: story.fields.summary,
        issueType: story.fields.issuetype.name
      }))
    })
  } catch (error) {
    console.error('❌ [Jira Stories] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch stories'
    res.status(500).json({
      error: errorMessage,
      details: 'Make sure your Jira instance is accessible and you have the correct permissions.'
    })
  }
})

// Get story details
jiraRouter.get('/story/:key', async (req: express.Request, res: express.Response): Promise<void> => {
  const { key } = req.params
  console.log(`📨 [Jira Story Details] Fetching details for: ${key}`)
  try {
    if (!jiraClientInstance.isConnectedToJira()) {
      console.error('❌ [Jira Story Details] Not connected to Jira')
      res.status(401).json({
        error: 'Not connected to Jira. Please connect first.'
      })
      return
    }

    const details = await jiraClientInstance.getStoryDetails(key)

    console.log(`✅ [Jira Story Details] Fetched details for: ${key}`)
    res.json({
      success: true,
      story: details
    })
  } catch (error) {
    console.error(`❌ [Jira Story Details] Error for ${key}:`, error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch story details'
    res.status(500).json({
      error: errorMessage
    })
  }
})

// Disconnect from Jira
jiraRouter.post('/disconnect', (req: express.Request, res: express.Response): void => {
  console.log('📨 [Jira Disconnect] Disconnecting...')
  // Reset the client instance
  ;(jiraClientInstance as any).baseUrl = ''
  ;(jiraClientInstance as any).email = ''
  ;(jiraClientInstance as any).apiToken = ''
  ;(jiraClientInstance as any).isConnected = false

  console.log('✅ [Jira Disconnect] Disconnected successfully')
  res.json({
    success: true,
    message: 'Disconnected from Jira'
  })
})
