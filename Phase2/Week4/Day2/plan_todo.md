# Jira Automation System - Implementation Plan & TODO

**Project:** Jira Automation Web System  
**Version:** 1.0  
**Created:** February 23, 2026  
**Architecture:** API-First, No Database, Simple Monolithic Design

---

## Executive Summary

This document outlines the phased implementation approach for building a monolithic Node.js/React tool that automates Jira task management including:
- Subtask creation with story point redistribution
- Worklog entry logging
- Bulk test case Pass/Fail updates via Synapse plugin

---

## Implementation Phases Overview

### Phase 1: API Layer - Backend Foundation
**Goal:** Establish core backend architecture with Jira connectivity

Set up Node.js/Express backend structure with environment configuration, error handling middleware, and Jira connection validation. API-first approach with RESTful endpoints.

### Phase 2: API Layer - Core Feature APIs
**Goal:** Build all backend APIs for Jira automation

Implement all REST APIs: sprint ticket retrieval, subtask creation with story point distribution, worklog logging, and CSV bulk test case updates via Synapse plugin.

### Phase 3: Web Layer - Frontend Integration
**Goal:** Build user interface and integrate all backend APIs

Build React frontend with 3-tab dashboard, API service layer using Axios, and form components with validation. Connect UI to all backend endpoints.

### Phase 4: Testing & Deployment
**Goal:** Ensure production readiness and security

Perform security hardening (HTTPS enforcement, credential protection), comprehensive testing, and deployment preparation.

---

## Detailed TODO List

### ✅ Phase 1: API Layer - Backend Foundation

#### Setup & Configuration
- [ ] Initialize Node.js project with `npm init`
- [ ] Install core dependencies:
  - [ ] `express` - Web framework
  - [ ] `axios` - HTTP client for Jira API
  - [ ] `dotenv` - Environment variable management
  - [ ] `cors` - Cross-origin resource sharing
  - [ ] `body-parser` - Request parsing middleware

#### Project Structure
- [ ] Create folder structure:
  ```
  backend/
  ├── controllers/
  ├── services/
  ├── routes/
  ├── middleware/
  ├── utils/
  └── server.js
  ```

#### Environment Configuration
- [ ] Create `.env` file with required variables:
  - [ ] `JIRA_BASE_URL` - Self-hosted Jira instance URL
  - [ ] `JIRA_USERNAME` - Service account username
  - [ ] `JIRA_API_TOKEN` - API token for authentication
  - [ ] `JIRA_CYCLE_ID` - Test cycle ID for Synapse plugin (e.g., 13520)
  - [ ] `JIRA_TEST_PLAN_ID` - Test plan ID for Synapse plugin (e.g., 1410600)
  - [ ] `PORT` - Backend server port (default: 3001)
- [ ] Add `.env` to `.gitignore`
- [ ] Create `.env.example` template

#### Core Infrastructure
- [ ] Build centralized error handling middleware
  - [ ] Structured error response format: `{success, message, details}`
  - [ ] HTTP status code mapping
  - [ ] Error logging utility
- [ ] Create Jira service utility with Basic Auth setup
- [ ] Implement `/api/validate` endpoint
  - [ ] Test connection to `/rest/api/2/myself`
  - [ ] Return connection status and user info
  - [ ] Handle authentication failures
- [ ] Set up basic Express server with CORS

#### Testing
- [ ] Test Jira connection with actual credentials
- [ ] Verify error handling for invalid credentials
- [ ] Confirm CORS configuration works for frontend origin

---

### ✅ Phase 2: API Layer - Core Feature APIs

#### Sprint Ticket Retrieval API

#### JQL Query System
- [ ] Create JQL query builder utility
  - [ ] Support for `assignee = currentUser()`
  - [ ] Support for `sprint in openSprints()`
  - [ ] Query parameter validation

#### API Development
- [ ] Implement `GET /api/sprint-tickets` endpoint
- [ ] Create sprint ticket service layer
  - [ ] Execute JQL query via Jira REST API
  - [ ] Handle pagination if needed
  - [ ] Error handling for invalid queries

#### Data Transformation
- [ ] Parse Jira response to extract required fields:
  - [ ] Issue Key
  - [ ] Summary
  - [ ] Status
  - [ ] Priority
  - [ ] Story Points (custom field handling)
  - [ ] Issue Type
- [ ] Format response for frontend consumption
- [ ] Handle missing or null story points

#### Error Handling
- [ ] Invalid JQL syntax errors
- [ ] No tickets found scenario
- [ ] Jira connection timeout
- [ ] Authorization errors

#### Testing
- [ ] Test with actual Jira instance
- [ ] Verify different sprint scenarios (multiple sprints, no sprints)
- [ ] Test with users having no assigned tickets
- [ ] Validate story point extraction

#### Subtask Creation API

#### Story Point Algorithm
- [ ] Design distribution algorithm:
  - [ ] Even integer distribution
  - [ ] Remainder handling (add to last subtask)
  - [ ] Example: 5 SP ÷ 3 subtasks = [2, 2, 1]
- [ ] Handle edge cases:
  - [ ] 0 story points
  - [ ] 1 subtask
  - [ ] More subtasks than story points

#### API Development
- [ ] Implement `POST /api/create-subtasks` endpoint
  - [ ] Request body validation
  - [ ] Parent task existence check
- [ ] Create subtask service:
  - [ ] Calculate story point distribution
  - [ ] Create subtasks via Jira API (`/rest/api/2/issue`)
  - [ ] Set subtask fields (summary, story points, parent)
  - [ ] Batch creation with individual error tracking

#### Story Point Update
- [ ] Reduce parent story points (optional, based on Jira workflow)
- [ ] Update parent task status if needed

#### Response Handling
- [ ] Return creation summary:
  - [ ] Created subtask keys
  - [ ] Story point distribution
  - [ ] Any failed creations with reasons
- [ ] Rollback strategy for partial failures

#### Testing
- [ ] Unit tests for distribution algorithm
- [ ] Integration tests with Jira
- [ ] Test various story point scenarios (0, 1, 5, 13, 21)
- [ ] Verify subtask-parent linking

#### Worklog API

#### Date Validation
- [ ] Create weekday validation utility
  - [ ] Exclude Saturdays and Sundays
  - [ ] Prevent future date selection
  - [ ] Validate date format

#### API Development
- [ ] Implement `POST /api/log-work` endpoint
- [ ] Request validation:
  - [ ] Issue key existence
  - [ ] Date validity (weekday, not future)
  - [ ] Hours validation (0-24 range)

#### Worklog Service
- [ ] Build worklog creation service
  - [ ] Separate worklog per selected date
  - [ ] Convert hours to seconds (Jira format)
  - [ ] Call Jira `/rest/api/2/issue/{key}/worklog`
- [ ] Support multiple date selection
- [ ] Default to 8 hours with override capability

#### Business Logic
- [ ] Time entry rules:
  - [ ] Default: 8 hours/day
  - [ ] Editable per date
  - [ ] No duplicate worklogs for same date (optional check)
- [ ] Comment/description field support

#### Error Handling
- [ ] Invalid issue key
- [ ] Weekend date rejection
- [ ] Invalid hour values
- [ ] Jira permission errors

#### Testing
- [ ] Test single-day worklog
- [ ] Test multi-day batch worklog
- [ ] Verify weekend blocking
- [ ] Test with different hour values

#### CSV Bulk Test Case Update API

#### CSV Parsing Infrastructure
- [ ] Install `papaparse` library
- [ ] Create CSV parser utility
  - [ ] Flexible header mapping (case-insensitive)
  - [ ] Required fields: Test Case ID, Result
  - [ ] Optional fields: Defect ID, Comments
- [ ] Header normalization (trim, lowercase)

#### API Development
- [ ] Implement `POST /api/bulk-test-update` endpoint
  - [ ] File upload handling (multipart/form-data)
  - [ ] CSV validation
  - [ ] Size limit enforcement (e.g., 10MB max)

#### Synapse Integration
- [ ] Research Synapse plugin REST API documentation
- [ ] Create Synapse service layer:
  - [ ] Authentication method (use Jira credentials)
  - [ ] Endpoint for test case update with cycle ID and test plan ID
  - [ ] Read `JIRA_CYCLE_ID` and `JIRA_TEST_PLAN_ID` from .env
  - [ ] Build URL: `/jira/secure/ShowTestCycleRunDetail.jspa?cycleId={CYCLE_ID}&tpId={TEST_PLAN_ID}`
  - [ ] Batch vs individual update strategy
- [ ] Map CSV data to Synapse API format

#### Processing Logic
- [ ] Row-by-row processing
- [ ] Skip invalid rows with error logging
- [ ] Continue processing on individual failures
- [ ] Validate test case ID exists before update
- [ ] Validate result values (Pass/Fail/Blocked)

#### Response Handling
- [ ] Execution summary:
  - [ ] Total rows processed
  - [ ] Successful updates count
  - [ ] Failed rows with reasons
  - [ ] Skipped rows (invalid format)
- [ ] Detailed error report per row

#### Testing
- [ ] Create sample CSV files (valid, invalid, mixed)
- [ ] Test header variations (case, spacing)
- [ ] Test with missing required fields
- [ ] Verify Synapse API integration
- [ ] Performance test with large CSV (1000+ rows)

---

### ✅ Phase 3: Web Layer - Frontend Integration

#### React Setup
- [ ] Initialize React app (`create-react-app` or Vite)
- [ ] Install dependencies:
  - [ ] `axios` - API calls
  - [ ] `react-router-dom` - Routing
  - [ ] `react-datepicker` - Date selection
  - [ ] `papaparse` - CSV preview
  - [ ] CSS framework (optional: Material-UI, Tailwind)

#### Project Structure
- [ ] Create folder structure:
  ```
  frontend/src/
  ├── components/
  ├── services/
  ├── utils/
  ├── pages/
  └── App.js
  ```

#### API Service Layer
- [ ] Create Axios instance with base URL
- [ ] Implement API methods:
  - [ ] `validateConnection()`
  - [ ] `getSprintTickets()`
  - [ ] `createSubtasks(parentKey, subtasks)`
  - [ ] `logWork(issueKey, dates, hours)`
  - [ ] `bulkUpdateTests(csvFile)`
- [ ] Centralized error handling
- [ ] Loading state management

#### Connection Validation
- [ ] Implement connection check on app load
- [ ] Display connection status banner
- [ ] Block dashboard if connection fails
- [ ] Retry mechanism

#### Dashboard Layout
- [ ] Create 3-tab layout:
  - [ ] Tab 1: Create Subtask
  - [ ] Tab 2: Log Work
  - [ ] Tab 3: Bulk Test Case Update
- [ ] Navigation between tabs
- [ ] Consistent header/footer

#### Tab 1: Create Subtask
- [ ] Sprint ticket dropdown/selector
  - [ ] Load tickets from API
  - [ ] Display: Key, Summary, Story Points
  - [ ] Search/filter functionality
- [ ] Subtask creation form:
  - [ ] Number of subtasks input
  - [ ] Subtask names/summaries (dynamic list)
  - [ ] Story point distribution preview
- [ ] Submit button with loading state
- [ ] Success notification with created subtask keys
- [ ] Error display

#### Tab 2: Log Work
- [ ] Ticket selector (same as Tab 1)
- [ ] Date picker component:
  - [ ] Multi-date selection
  - [ ] Weekends disabled
  - [ ] Prevent future dates
- [ ] Hours input (default: 8, editable)
- [ ] Hours per date customization
- [ ] Submit button
- [ ] Success/error notifications

#### Tab 3: Bulk Test Case Update
- [ ] CSV file upload:
  - [ ] Drag-and-drop area
  - [ ] File input button
  - [ ] File type validation (.csv only)
- [ ] CSV preview table (first 10 rows)
- [ ] Header mapping display
- [ ] Upload button
- [ ] Progress indicator
- [ ] Execution summary display:
  - [ ] Success count
  - [ ] Failed rows table
  - [ ] Download error report option

#### UI/UX Enhancements
- [ ] Loading spinners for all API calls
- [ ] Toast notifications for success/error
- [ ] Form validation (client-side)
- [ ] Responsive design (mobile-friendly)
- [ ] Accessibility considerations (ARIA labels)

#### Testing
- [ ] Test all user workflows end-to-end
- [ ] Cross-browser testing (Chrome, Firefox, Edge)
- [ ] Error scenario testing (network failures, invalid inputs)
- [ ] Performance testing (large CSV uploads)

---

### ✅ Phase 4: Testing & Deployment

#### Security Review
- [ ] Configure HTTPS:
  - [ ] SSL certificate setup
  - [ ] Or reverse proxy configuration (nginx/Apache)
- [ ] Audit credential exposure:
  - [ ] Verify `.env` not in version control
  - [ ] Check for hardcoded credentials
  - [ ] Frontend never receives backend credentials
- [ ] Input sanitization:
  - [ ] Prevent XSS attacks
  - [ ] SQL injection (N/A - no database)
  - [ ] Validate all user inputs
- [ ] CORS configuration:
  - [ ] Whitelist frontend origin only
  - [ ] Disable wildcard `*` in production

#### Logging & Monitoring
- [ ] Add request logging:
  - [ ] Log all API requests (method, path, status)
  - [ ] Error logging with stack traces
  - [ ] Performance metrics (response time)
- [ ] Create log rotation strategy
- [ ] Set up log file locations

#### Documentation
- [ ] Create deployment documentation:
  - [ ] Prerequisites (Node.js version, npm)
  - [ ] Installation steps
  - [ ] Environment variable setup
  - [ ] Starting the application
- [ ] API documentation:
  - [ ] Endpoint list with request/response examples
  - [ ] Error code reference
  - [ ] Authentication details
- [ ] User guide:
  - [ ] How to use each tab
  - [ ] CSV format requirements
  - [ ] Troubleshooting common issues

#### Production Environment
- [ ] Create production `.env` file
- [ ] Set up production Jira credentials
- [ ] Configure production port and URLs
- [ ] Enable production optimizations:
  - [ ] React production build
  - [ ] Minification
  - [ ] Compression middleware (gzip)

#### Testing & Validation
- [ ] Perform comprehensive testing:
  - [ ] All happy path scenarios
  - [ ] All error scenarios
  - [ ] Network failure simulation
  - [ ] Invalid data handling
- [ ] Load testing (if needed)
- [ ] Security penetration testing

#### Deployment Preparation
- [ ] Create startup scripts:
  - [ ] `start.sh` or `start.bat`
  - [ ] PM2 or similar process manager setup
- [ ] Health check endpoint:
  - [ ] `GET /api/health`
  - [ ] Returns service status
- [ ] Create rollback plan
- [ ] Backup strategy for configuration

#### Post-Deployment
- [ ] Monitor initial usage
- [ ] Collect user feedback
- [ ] Fix critical bugs
- [ ] Plan for future enhancements

---

## Implementation Approach

### Architecture Principles
- **API-First:** Backend REST APIs developed before frontend
- **No Database:** Stateless design, direct Jira/Synapse API calls only
- **Simple Monolithic:** Single Node.js backend, single React frontend
- **No Microservices:** Avoid overengineering, maintain simplicity
- **No Caching Layer:** Direct API calls for real-time data

### Critical Path
1. **Phase 1** must complete before any other phase (establishes backend foundation)
2. **Phase 2** builds all API endpoints (core functionality)
3. **Phase 3** requires Phase 2 complete (frontend consumes APIs)
4. **Phase 4** is final validation and deployment

### Parallel Opportunities
- Frontend UI mockups/design can be prepared during Phase 1-2
- Documentation can be written alongside development
- API testing can happen immediately after each endpoint is built

---

## Prerequisites & Dependencies

### Required Before Starting
- [ ] Self-hosted Jira instance access
  - [ ] Base URL
  - [ ] Service account credentials
  - [ ] API token generated
- [ ] Synapse plugin test cycle information
  - [ ] Test Cycle ID (from URL parameter `cycleId`)
  - [ ] Test Plan ID (from URL parameter `tpId`)
  - [ ] Example: `cycleId=13520&tpId=1410600`
- [ ] Synapse plugin REST API documentation
  - [ ] Endpoint URLs for test case updates
  - [ ] Authentication method
  - [ ] Request/response format
- [ ] Development environment setup
  - [ ] Node.js v16+ installed
  - [ ] npm or yarn installed
  - [ ] Code editor (VS Code recommended)
  - [ ] Git installed

### Nice to Have
- [ ] Sample Jira project for testing
- [ ] Sample CSV files for test case updates
- [ ] Access to staging/test Jira environment

---

## Risk Management

### High Risk Items
| Risk | Impact | Mitigation |
|------|--------|-----------|
| Synapse API documentation unavailable | High | Contact Synapse support early; plan discovery phase |
| Self-hosted Jira version incompatibility | Medium | Test API compatibility in Phase 1 |
| Story point custom field varies by project | Medium | Make field mapping configurable |
| CSV format variations | Medium | Build flexible parser with validation |

### Technical Challenges
- [ ] Custom field mapping for story points (varies by Jira configuration)
- [ ] Synapse plugin API may have rate limiting
- [ ] Large CSV file memory handling
- [ ] Concurrent worklog creation performance

---

## Success Criteria

### Phase 1: API Layer - Backend Foundation
✅ Backend server running and accessible  
✅ Successful Jira connection validation  
✅ Error handling middleware functional  
✅ CORS configured properly

### Phase 2: API Layer - Core Feature APIs
✅ All 4 API endpoints implemented and tested:  
  - Sprint tickets retrieval  
  - Subtask creation with story point distribution  
  - Worklog logging with weekday validation  
  - CSV bulk test case updates  
✅ API responses follow consistent structure  
✅ Error handling covers all edge cases

### Phase 3: Web Layer - Frontend Integration
✅ All features accessible via intuitive 3-tab UI  
✅ End-to-end workflows complete without errors  
✅ Form validations working correctly  
✅ Loading states and error messages display properly

### Phase 4: Testing & Deployment
✅ HTTPS enabled and secure  
✅ Complete documentation delivered  
✅ System deployed and stable  
✅ All test scenarios pass

---

## Post-Implementation Enhancements (Future)

### Potential Future Features
- [ ] Multi-user support with authentication
- [ ] Audit log database for tracking changes
- [ ] Custom JQL query builder in UI
- [ ] Export execution reports (PDF/Excel)
- [ ] Scheduled/automated worklog entries
- [ ] Bulk subtask deletion feature
- [ ] Integration with other Jira plugins
- [ ] Dashboard analytics and statistics

---

## Notes

- **No Database:** System is stateless; all data operations are direct Jira/Synapse API calls
- **Single User:** Initial version is internal tool; future versions may support multi-user
- **Monolithic:** Simple architecture for easy maintenance and deployment
- **API-First:** Backend exposes RESTful APIs consumed by React frontend

---

## Contact & Support

**Project Owner:** [Your Name]  
**Technical Lead:** [Your Name]  
**Start Date:** February 23, 2026  
**Architecture:** API-First, No Database, Simple Monolithic

---

*This plan is a living document and will be updated as the project progresses.*
