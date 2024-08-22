# Salesforce Scratch Org Creator

This Node.js application automates the process of creating Salesforce scratch orgs from GitHub repository templates. It provides an API endpoint to initiate the creation process, handles authentication with Salesforce, and manages the scratch org creation workflow.

## Features

- Clone GitHub repositories
- Create Salesforce scratch orgs
- Execute org initialization scripts
- Update Transaction Security Policies
- Publish Platform Events to Salesforce
- Queue and manage concurrent scratch org creations

## Prerequisites

- Node.js (v12 or higher)
- Salesforce CLI
- Git

## Installation

1. Clone this repository:
git clone


2. Install dependencies:
npm install


3. Copy the `.env.example` file to `.env` and fill in the required Salesforce credentials:
cp .env.example .env


## Configuration

Edit the `.env` file and provide the following Salesforce credentials:

- `SF_USERNAME`: Your Salesforce username
- `SF_PRIVATE_KEY_PATH`: Path to your Salesforce private key file
- `SF_CLIENT_ID`: Your Salesforce connected app's client ID
- `SF_LOGIN_URL`: Salesforce login URL (default: https://login.salesforce.com)

## Usage

1. Start the server:
node app.js


2. The server will start running on the specified port (default: 3000).

3. To create a new scratch org, send a POST request to the `/create` endpoint:
POST http://localhost:3000/create Content-Type: application/json

{ "repoUrl": "https://github.com/username/repo-name" }


4. The server will respond with a success message and a record ID. The scratch org creation process will continue in the background.

## API Endpoints

- `POST /create`: Initiates the scratch org creation process
- Request body: `{ "repoUrl": "https://github.com/username/repo-name" }`
- Response: `{ "success": true, "message": "...", "recordId": "..." }`

## License

This project is licensed under the Apache License 2.0 (ALv2).
See the LICENSE file for more information.