import { useState, useEffect } from 'react'
import { generateTests, connectToJira, getJiraConnectionStatus, getJiraStories, getJiraStoryDetails, disconnectFromJira } from './api'
import { GenerateRequest, GenerateResponse, TestCase, JiraStory, JiraStoryDetails } from './types'

function App() {
  // Form and results state
  const [formData, setFormData] = useState<GenerateRequest>({
    storyTitle: '',
    acceptanceCriteria: '',
    description: '',
    additionalInfo: ''
  })
  const [results, setResults] = useState<GenerateResponse | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedTestCases, setExpandedTestCases] = useState<Set<string>>(new Set())

  // Jira state
  const [jiraConnected, setJiraConnected] = useState<boolean>(false)
  const [showJiraForm, setShowJiraForm] = useState<boolean>(false)
  const [jiraCredentials, setJiraCredentials] = useState({
    baseUrl: '',
    email: '',
    apiToken: ''
  })
  const [jiraStories, setJiraStories] = useState<JiraStory[]>([])
  const [selectedStory, setSelectedStory] = useState<string>('')
  const [jiraLoading, setJiraLoading] = useState<boolean>(false)
  const [jiraError, setJiraError] = useState<string | null>(null)

  // Check Jira connection status on mount
  useEffect(() => {
    const checkJiraStatus = async () => {
      const status = await getJiraConnectionStatus()
      setJiraConnected(status.isConnected)
    }
    checkJiraStatus()
  }, [])

  const toggleTestCaseExpansion = (testCaseId: string) => {
    const newExpanded = new Set(expandedTestCases)
    if (newExpanded.has(testCaseId)) {
      newExpanded.delete(testCaseId)
    } else {
      newExpanded.add(testCaseId)
    }
    setExpandedTestCases(newExpanded)
  }

  const handleInputChange = (field: keyof GenerateRequest, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleJiraInputChange = (field: keyof typeof jiraCredentials, value: string) => {
    setJiraCredentials(prev => ({ ...prev, [field]: value }))
  }

  const handleJiraConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    setJiraLoading(true)
    setJiraError(null)

    try {
      const result = await connectToJira(jiraCredentials)
      
      if (result.success) {
        setJiraConnected(true)
        setShowJiraForm(false)
        setJiraError(null)
        
        // Fetch stories after successful connection
        const stories = await getJiraStories()
        setJiraStories(stories)
      } else {
        setJiraError(result.error || 'Failed to connect to Jira')
      }
    } catch (err) {
      setJiraError(err instanceof Error ? err.message : 'Failed to connect to Jira')
    } finally {
      setJiraLoading(false)
    }
  }

  const handleJiraDisconnect = async () => {
    setJiraLoading(true)
    try {
      await disconnectFromJira()
      setJiraConnected(false)
      setJiraStories([])
      setSelectedStory('')
      setFormData(prev => ({
        ...prev,
        storyTitle: '',
        description: '',
        acceptanceCriteria: '',
        additionalInfo: ''
      }))
    } catch (err) {
      setJiraError('Failed to disconnect from Jira')
    } finally {
      setJiraLoading(false)
    }
  }

  const handleLinkStory = async () => {
    if (!selectedStory) {
      setJiraError('Please select a story')
      return
    }

    setJiraLoading(true)
    setJiraError(null)

    try {
      const details: JiraStoryDetails = await getJiraStoryDetails(selectedStory)
      
      // Populate form with story details
      setFormData({
        storyTitle: details.title,
        acceptanceCriteria: details.acceptanceCriteria || '',
        description: details.description || '',
        additionalInfo: `Jira Issue: ${details.key}`
      })

      setJiraError(null)
    } catch (err) {
      setJiraError(err instanceof Error ? err.message : 'Failed to fetch story details')
    } finally {
      setJiraLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.storyTitle.trim() || !formData.acceptanceCriteria.trim()) {
      setError('Story Title and Acceptance Criteria are required')
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      const response = await generateTests(formData)
      setResults(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate tests')
    } finally {
      setIsLoading(false)
    }
  }

  // Download format state and helpers
  const [downloadFormat, setDownloadFormat] = useState<'CSV' | 'XLSX' | 'PDF'>('CSV')

  const generateRows = () => {
    if (!results) return []
    const rows = results.cases.map(tc => ({
      id: tc.id,
      title: tc.title,
      category: tc.category,
      expectedResult: tc.expectedResult,
      steps: tc.steps.join(' | '),
      testData: tc.testData || ''
    }))
    return rows
  }

  const downloadCSV = () => {
    const rows = generateRows()
    if (!rows.length) return
    const header = ['Test Case ID','Title','Category','Expected Result','Steps','Test Data']
    const lines = [header.join(',')]
    for (const r of rows) {
      const esc = (v: string) => '"' + String(v).replace(/"/g, '""') + '"'
      lines.push([esc(r.id), esc(r.title), esc(r.category), esc(r.expectedResult), esc(r.steps), esc(r.testData)].join(','))
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'test-cases.csv'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  // Lightweight XLSX fallback: generate TSV and name .xlsx (works in Excel)
  const downloadXLSX = () => {
    const rows = generateRows()
    if (!rows.length) return
    const escHtml = (v: string) => String(v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
    const header = ['Test Case ID','Title','Category','Expected Result','Steps','Test Data']
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Test Cases</title></head><body><table><thead><tr>${header.map(h => `<th>${escHtml(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr><td>${escHtml(r.id)}</td><td>${escHtml(r.title)}</td><td>${escHtml(r.category)}</td><td>${escHtml(r.expectedResult)}</td><td>${escHtml(r.steps)}</td><td>${escHtml(r.testData)}</td></tr>`).join('')}</tbody></table></body></html>`
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'test-cases.xls'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const downloadPDF = () => {
    const rows = generateRows()
    if (!rows.length) return
    const win = window.open('', '_blank')
    if (!win) return
    const html = `
      <html>
        <head>
          <title>Test Cases</title>
          <style>table{width:100%;border-collapse:collapse}td,th{border:1px solid #ccc;padding:8px;text-align:left}</style>
        </head>
        <body>
          <h2>Generated Test Cases</h2>
          <table>
            <thead><tr><th>ID</th><th>Title</th><th>Category</th><th>Expected</th><th>Steps</th><th>Test Data</th></tr></thead>
            <tbody>
              ${generateRows().map(r => `<tr><td>${r.id}</td><td>${r.title}</td><td>${r.category}</td><td>${r.expectedResult}</td><td>${r.steps}</td><td>${r.testData}</td></tr>`).join('')}
            </tbody>
          </table>
        </body>
      </html>`
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); }, 500)
  }

  return (
    <div>
      <style>{`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          background-color: #f5f5f5;
          color: #333;
          line-height: 1.6;
        }
        
        .container {
          max-width: 95%;
          width: 100%;
          margin: 0 auto;
          padding: 20px;
          min-height: 100vh;
        }
        
        @media (min-width: 768px) {
          .container {
            max-width: 90%;
            padding: 30px;
          }
        }
        
        @media (min-width: 1024px) {
          .container {
            max-width: 85%;
            padding: 40px;
          }
        }
        
        @media (min-width: 1440px) {
          .container {
            max-width: 1800px;
            padding: 50px;
          }
        }
        
        .header {
          text-align: center;
          margin-bottom: 40px;
        }
        
        .title {
          font-size: 2.5rem;
          color: #2c3e50;
          margin-bottom: 10px;
        }
        
        .subtitle {
          color: #666;
          font-size: 1.1rem;
        }

        .jira-section {
          background: linear-gradient(135deg, #0052cc 0%, #003fa3 100%);
          border-radius: 8px;
          padding: 25px;
          margin-bottom: 30px;
          color: white;
        }

        .jira-section h2 {
          margin-bottom: 15px;
          font-size: 1.4rem;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .jira-status {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 15px;
          font-weight: 500;
        }

        .status-indicator {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #34d399;
        }

        .status-indicator.disconnected {
          background: #f87171;
        }

        .jira-form {
          background: white;
          border-radius: 6px;
          padding: 20px;
          margin-top: 15px;
        }

        .jira-buttons {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .btn-connect {
          background: #27ae60;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          transition: background 0.2s;
        }

        .btn-connect:hover {
          background: #229954;
        }

        .btn-disconnect {
          background: #e74c3c;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          transition: background 0.2s;
        }

        .btn-disconnect:hover {
          background: #c0392b;
        }

        .btn-link-story {
          background: #3498db;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          transition: background 0.2s;
        }

        .btn-link-story:hover:not(:disabled) {
          background: #2980b9;
        }

        .btn-link-story:disabled {
          background: #bdc3c7;
          cursor: not-allowed;
        }

        .stories-dropdown {
          display: flex;
          gap: 10px;
          margin-top: 15px;
          flex-wrap: wrap;
          align-items: center;
        }

        .stories-dropdown select {
          padding: 10px 12px;
          border: 2px solid #e1e8ed;
          border-radius: 6px;
          font-size: 14px;
          min-width: 300px;
        }

        .jira-error {
          background: #ffe3e3;
          color: #c41e3a;
          padding: 12px;
          border-radius: 6px;
          margin-top: 15px;
        }
        
        .form-container {
          background: white;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          margin-bottom: 30px;
        }
        
        .form-group {
          margin-bottom: 20px;
        }
        
        .form-label {
          display: block;
          font-weight: 600;
          margin-bottom: 8px;
          color: #2c3e50;
        }
        
        .form-input, .form-textarea {
          width: 100%;
          padding: 12px;
          border: 2px solid #e1e8ed;
          border-radius: 6px;
          font-size: 14px;
          transition: border-color 0.2s;
        }
        
        .form-input:focus, .form-textarea:focus {
          outline: none;
          border-color: #3498db;
        }
        
        .form-textarea {
          resize: vertical;
          min-height: 100px;
        }
        
        .submit-btn {
          background: #3498db;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .submit-btn:hover:not(:disabled) {
          background: #2980b9;
        }
        
        .submit-btn:disabled {
          background: #bdc3c7;
          cursor: not-allowed;
        }
        
        .error-banner {
          background: #e74c3c;
          color: white;
          padding: 15px;
          border-radius: 6px;
          margin-bottom: 20px;
        }
        
        .loading {
          text-align: center;
          padding: 40px;
          color: #666;
          font-size: 18px;
        }
        
        .results-container {
          background: white;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .results-header {
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 2px solid #e1e8ed;
        }
        
        .results-title {
          font-size: 1.8rem;
          color: #2c3e50;
          margin-bottom: 10px;
        }
        
        .results-meta {
          color: #666;
          font-size: 14px;
        }
        
        .table-container {
          overflow-x: auto;
        }
        
        .results-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        
        .results-table th,
        .results-table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #e1e8ed;
        }
        
        .results-table th {
          background: #f8f9fa;
          font-weight: 600;
          color: #2c3e50;
        }
        
        .results-table tr:hover {
          background: #f8f9fa;
        }
        
        .category-positive { color: #27ae60; font-weight: 600; }
        .category-negative { color: #e74c3c; font-weight: 600; }
        .category-edge { color: #f39c12; font-weight: 600; }
        .category-authorization { color: #9b59b6; font-weight: 600; }
        .category-non-functional { color: #34495e; font-weight: 600; }
        
        .test-case-id {
          cursor: pointer;
          color: #3498db;
          font-weight: 600;
          padding: 8px 12px;
          border-radius: 4px;
          transition: background-color 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        
        .test-case-id:hover {
          background: #f8f9fa;
        }
        
        .test-case-id.expanded {
          background: #e3f2fd;
          color: #1976d2;
        }
        
        .expand-icon {
          font-size: 10px;
          transition: transform 0.2s;
        }
        
        .expand-icon.expanded {
          transform: rotate(90deg);
        }
        
        .expanded-details {
          margin-top: 15px;
          background: #fafbfc;
          border: 1px solid #e1e8ed;
          border-radius: 8px;
          padding: 20px;
        }
        
        .step-item {
          background: white;
          border: 1px solid #e1e8ed;
          border-radius: 6px;
          padding: 15px;
          margin-bottom: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        
        .step-header {
          display: grid;
          grid-template-columns: 80px 1fr 1fr 1fr;
          gap: 15px;
          align-items: start;
        }
        
        .step-id {
          font-weight: 600;
          color: #2c3e50;
          background: #f8f9fa;
          padding: 4px 8px;
          border-radius: 4px;
          text-align: center;
          font-size: 12px;
        }
        
        .step-description {
          color: #2c3e50;
          line-height: 1.5;
        }
        
        .step-test-data {
          color: #666;
          font-style: italic;
          font-size: 14px;
        }
        
        .step-expected {
          color: #27ae60;
          font-weight: 500;
          font-size: 14px;
        }
        
        .step-labels {
          display: grid;
          grid-template-columns: 80px 1fr 1fr 1fr;
          gap: 15px;
          margin-bottom: 10px;
          font-weight: 600;
          color: #666;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
      `}</style>
      
      <div className="container">
        <div className="header">
          <h1 className="title">User Story to Tests</h1>
          <p className="subtitle">Generate comprehensive test cases from your user stories</p>
        </div>

        {/* Jira Connection Section */}
        <div className="jira-section">
          <h2>Jira Integration</h2>
          <div className="jira-status">
            <div className={`status-indicator ${!jiraConnected ? 'disconnected' : ''}`}></div>
            <span>{jiraConnected ? 'Connected to Jira' : 'Not connected to Jira'}</span>
          </div>

          {!jiraConnected ? (
            <button 
              className="btn-connect"
              onClick={() => setShowJiraForm(!showJiraForm)}
            >
              {showJiraForm ? 'Cancel' : 'Connect Jira'}
            </button>
          ) : (
            <button 
              className="btn-disconnect"
              onClick={handleJiraDisconnect}
              disabled={jiraLoading}
            >
              {jiraLoading ? 'Disconnecting...' : 'Disconnect'}
            </button>
          )}

          {showJiraForm && !jiraConnected && (
            <form onSubmit={handleJiraConnect} className="jira-form">
              <div className="form-group">
                <label className="form-label">Jira Base URL</label>
                <input
                  type="text"
                  className="form-input"
                  value={jiraCredentials.baseUrl}
                  onChange={(e) => handleJiraInputChange('baseUrl', e.target.value)}
                  placeholder="https://your-domain.atlassian.net"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={jiraCredentials.email}
                  onChange={(e) => handleJiraInputChange('email', e.target.value)}
                  placeholder="your-email@example.com"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">API Token</label>
                <input
                  type="password"
                  className="form-input"
                  value={jiraCredentials.apiToken}
                  onChange={(e) => handleJiraInputChange('apiToken', e.target.value)}
                  placeholder="Your Jira API token"
                  required
                />
              </div>
              <button 
                type="submit" 
                className="btn-connect"
                disabled={jiraLoading}
              >
                {jiraLoading ? 'Connecting...' : 'Connect'}
              </button>
            </form>
          )}

          {jiraConnected && jiraStories.length > 0 && (
            <div className="stories-dropdown">
              <select 
                value={selectedStory}
                onChange={(e) => setSelectedStory(e.target.value)}
              >
                <option value="">Select a user story...</option>
                {jiraStories.map(story => (
                  <option key={story.key} value={story.key}>
                    {story.key} - {story.title}
                  </option>
                ))}
              </select>
              <button 
                className="btn-link-story"
                onClick={handleLinkStory}
                disabled={!selectedStory || jiraLoading}
              >
                {jiraLoading ? 'Loading...' : 'Link Story'}
              </button>
            </div>
          )}

          {jiraError && (
            <div className="jira-error">{jiraError}</div>
          )}
        </div>
        
        <form onSubmit={handleSubmit} className="form-container">
          <div className="form-group">
            <label htmlFor="storyTitle" className="form-label">
              Story Title *
            </label>
            <input
              type="text"
              id="storyTitle"
              className="form-input"
              value={formData.storyTitle}
              onChange={(e) => handleInputChange('storyTitle', e.target.value)}
              placeholder="Enter the user story title..."
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description" className="form-label">
              Description
            </label>
            <textarea
              id="description"
              className="form-textarea"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Additional description (optional)..."
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="acceptanceCriteria" className="form-label">
              Acceptance Criteria *
            </label>
            <textarea
              id="acceptanceCriteria"
              className="form-textarea"
              value={formData.acceptanceCriteria}
              onChange={(e) => handleInputChange('acceptanceCriteria', e.target.value)}
              placeholder="Enter the acceptance criteria..."
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="additionalInfo" className="form-label">
              Additional Info
            </label>
            <textarea
              id="additionalInfo"
              className="form-textarea"
              value={formData.additionalInfo}
              onChange={(e) => handleInputChange('additionalInfo', e.target.value)}
              placeholder="Any additional information (optional)..."
            />
          </div>
          
          <button
            type="submit"
            className="submit-btn"
            disabled={isLoading}
          >
            {isLoading ? 'Generating...' : 'Generate Tests'}
          </button>
        </form>

        {error && (
          <div className="error-banner">
            {error}
          </div>
        )}

        {isLoading && (
          <div className="loading">
            Generating test cases...
          </div>
        )}

        {results && (
          <div className="results-container">
            <div className="results-header">
              <h2 className="results-title">Generated Test Cases</h2>
                <div className="results-meta">
                  {results.cases.length} test case(s) generated
                  {results.model && ` • Model: ${results.model}`}
                  {results.promptTokens > 0 && ` • Tokens: ${results.promptTokens + results.completionTokens}`}
                </div>
                <div style={{marginTop: 12, display: 'flex', gap: 10, alignItems: 'center'}}>
                  <select value={downloadFormat} onChange={(e) => setDownloadFormat(e.target.value as any)} style={{padding: '8px 10px', borderRadius: 6, border: '2px solid #e1e8ed'}}>
                    <option value="CSV">CSV</option>
                    <option value="XLSX">XLSX</option>
                    <option value="PDF">PDF</option>
                  </select>
                  <button
                    type="button"
                    className="btn-link-story"
                    onClick={() => {
                      if (downloadFormat === 'CSV') downloadCSV()
                      else if (downloadFormat === 'XLSX') downloadXLSX()
                      else downloadPDF()
                    }}
                  >
                    Download
                  </button>
                </div>
            </div>
            
            <div className="table-container">
              <table className="results-table">
                <thead>
                  <tr>
                    <th>Test Case ID</th>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Expected Result</th>
                  </tr>
                </thead>
                <tbody>
                  {results.cases.map((testCase: TestCase) => (
                    <>
                      <tr key={testCase.id}>
                        <td>
                          <div 
                            className={`test-case-id ${expandedTestCases.has(testCase.id) ? 'expanded' : ''}`}
                            onClick={() => toggleTestCaseExpansion(testCase.id)}
                          >
                            <span className={`expand-icon ${expandedTestCases.has(testCase.id) ? 'expanded' : ''}`}>
                              ▶
                            </span>
                            {testCase.id}
                          </div>
                        </td>
                        <td>{testCase.title}</td>
                        <td>
                          <span className={`category-${testCase.category.toLowerCase()}`}>
                            {testCase.category}
                          </span>
                        </td>
                        <td>{testCase.expectedResult}</td>
                      </tr>
                      {expandedTestCases.has(testCase.id) && (
                        <tr key={`${testCase.id}-details`}>
                          <td colSpan={4}>
                            <div className="expanded-details">
                              <h4 style={{marginBottom: '15px', color: '#2c3e50'}}>Test Steps for {testCase.id}</h4>
                              <div className="step-labels">
                                <div>Step ID</div>
                                <div>Step Description</div>
                                <div>Test Data</div>
                                <div>Expected Result</div>
                              </div>
                              {testCase.steps.map((step, index) => (
                                <div key={index} className="step-item">
                                  <div className="step-header">
                                    <div className="step-id">S{String(index + 1).padStart(2, '0')}</div>
                                    <div className="step-description">{step}</div>
                                    <div className="step-test-data">{testCase.testData || 'N/A'}</div>
                                    <div className="step-expected">
                                      {index === testCase.steps.length - 1 ? testCase.expectedResult : 'Step completed successfully'}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App