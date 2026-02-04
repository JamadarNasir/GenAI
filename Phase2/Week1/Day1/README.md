Hosting Langflow on the Web
When we host Langflow on the web, the URL can be shared with anyone. Anyone with access to the URL can use it.

How to Get the Langflow URL
Step 1: Extract the API from Langflow
Go to Langflow → Share → API Access
Copy the URL from the localhost
Copy the Request Body
Copy the Langflow API Key from your Profile (top right corner)
Step 2: Create a Postman Collection
Open Postman and create a new Collection
Create a POST request
Paste the copied URL and Request Body from Step 1
Step 3: Add the API Key in Postman
Go to the Headers tab in Postman
Add a new key: x-api-key
Paste the Langflow API Key as the value
Step 4: Validate the response in Postman
Click Send
Validate the response
