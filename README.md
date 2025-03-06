# WhatsChat Application

A real-time chat application with features like direct messaging, group chats, file sharing, and more.

## Features
- Real-time messaging
- Group chat support
- File sharing
- User authentication
- Mobile responsive design
- Message deletion
- Dark mode support

## Deployment on Railway

### Prerequisites
1. Create a Railway account
2. Create a MongoDB database (You can use MongoDB Atlas)
3. Have Node.js installed locally

### Environment Variables
Make sure to set these environment variables in Railway:
- `MONGODB_URI`: Your MongoDB connection string
- `SESSION_SECRET`: A secure random string for session encryption
- `NODE_ENV`: Set to "production"

### Deployment Steps
1. Create a new project in Railway
2. Connect your repository
3. Add the environment variables
4. Railway will automatically detect the Node.js project and build it

### Local Development
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with the required environment variables
4. Run the development server:
   ```bash
   npm run dev
   ```

## Tech Stack
- Frontend: React + TypeScript
- Backend: Node.js + Express
- Database: MongoDB
- Real-time: WebSocket
- UI: Tailwind CSS + shadcn/ui
