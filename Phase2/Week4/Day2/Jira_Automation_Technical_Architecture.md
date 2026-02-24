# Jira Automation Web System

Technical Architecture & System Design Document\
Version 1.0

------------------------------------------------------------------------

# 1. Overview

This document defines the architecture and system design for a web-based
internal tool to automate:

-   Connect to JIRA 
-   Subtask creation with story point redistribution
-   Worklog entry logging
-   Bulk test case Pass/Fail updates via Synapse plugin
-   Real-time Jira integration (Self-hosted)

The system follows:

-   API-first architecture
-   Simple monolithic design
-   No microservices
-   No database
-   Stateless backend
-   Single-user internal tool

------------------------------------------------------------------------

# 2. High-Level Architecture

## Architecture Style

-   Monolithic Node.js backend
-   React frontend
-   REST-based integration with Self-Hosted Jira
-   REST-based integration with Synapse plugin
-   No database
-   No caching layer
-   Environment-based configuration

Logical Flow:

Frontend (React)\
↓\
Backend (Node.js API Layer)\
↓\
Jira REST API (Self-hosted)\
↓\
Synapse Plugin REST API

------------------------------------------------------------------------

# 3. Technology Stack

Frontend: - React JS - Axios - React Router - Date picker component
(weekend disabled) - CSV parser (PapaParse)

Backend: - Node.js - Express.js - Axios - dotenv

Configuration: - .env file: - JIRA_BASE_URL - JIRA_USERNAME -
JIRA_API_TOKEN

------------------------------------------------------------------------

# 4. Core Functional Modules

UI Structure: Single Dashboard with 3 Tabs

1.  Create Subtask
2.  Log Work
3.  Bulk Test Case Update

Each tab operates independently.

------------------------------------------------------------------------

# 5. Jira Integration Design

Authentication Model: - Self-hosted Jira - Basic Auth - Credentials
stored in .env - No per-user login

Connection Validation Flow: Frontend → /api/validate\
Backend → Jira REST /rest/api/2/myself\
If 200 OK → Enable dashboard

------------------------------------------------------------------------

# 6. View Assigned Sprint Tickets

Endpoint: GET /api/sprint-tickets

JQL: assignee = currentUser() AND sprint in openSprints()

Fields Returned: - Issue Key - Summary - Status - Priority - Story
Points - Issue Type

------------------------------------------------------------------------

# 7. Create Subtasks

Endpoint: POST /api/create-subtasks

Story Point Distribution: - Even integer distribution - Remainder added
to last subtask

Example: 5 SP, 3 subtasks → 2 + 2 + 1

------------------------------------------------------------------------

# 8. Log Work

Endpoint: POST /api/log-work

Rules: - Weekdays only (Mon--Fri) - Default 8 hours - Editable hours -
Separate worklog per selected date

------------------------------------------------------------------------

# 9. Bulk Test Case Update (Synapse)

Endpoint: POST /api/bulk-test-update

Rules: - Flexible header mapping (case-insensitive) - Required: Test
Case ID, Result - Optional: Defect ID - Skip invalid rows - Execution
summary returned

------------------------------------------------------------------------

# 10. Error Handling

Structured response: { "success": false, "message": "","details": "" }

Centralized middleware handling.

------------------------------------------------------------------------

# 11. Security

-   Credentials in .env only
-   Backend acts as proxy
-   HTTPS required
-   No credential exposure to frontend

------------------------------------------------------------------------

# 12. Project Structure

backend/ controllers/ services/ routes/ middleware/ utils/ server.js

frontend/ src/ components/ services/

------------------------------------------------------------------------

# 13. Implementation Phases

Phase 1 -- Backend Foundation\
Phase 2 -- Sprint Ticket Retrieval\
Phase 3 -- Subtask Creation\
Phase 4 -- Worklog Module\
Phase 5 -- CSV Bulk Update Engine\
Phase 6 -- Frontend Integration\
Phase 7 -- Hardening

------------------------------------------------------------------------

End of Document
