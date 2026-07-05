# ToolSwap

ToolSwap is a community-based platform where users can borrow and lend tools with other people nearby. The app allows users to sign up, list tools they want to share, browse available tools, and communicate with owners through real-time chat.

## Features

- User registration and login
- Browse available tools from other users
- Add and manage tools for lending
- User dashboard and profile management
- Real-time messaging using Socket.IO
- Leaderboard and community interaction features

## Tech Stack

### Frontend
- React
- Vite
- Tailwind CSS
- React Router
- Axios
- Socket.IO Client

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- JWT Authentication
- bcrypt
- Socket.IO
- Nodemailer

## Project Structure

```text
ToolSwap1/
├── Backend/
│   ├── app.js
│   ├── config/
│   ├── middlewares/
│   ├── models/
│   ├── routes/
│   └── utils/
└── Frontend/
    ├── src/
    │   ├── components/
    │   ├── context/
    │   └── assets/
    └── public/
```

## Prerequisites

Make sure you have the following installed:

- Node.js (v18 or higher)
- MongoDB running locally
- npm or yarn

## Installation

1. Clone the repository
2. Open the project folder

### Backend Setup

```bash
cd Backend
npm install
node app.js
```

The backend server will run on:

```text
http://localhost:3000
```

### Frontend Setup

```bash
cd Frontend
npm install
npm run dev
```

The frontend will run on:

```text
http://localhost:5173
```

## Database

The backend is configured to connect to MongoDB at:

```text
mongodb://localhost:27017/ToolSwap
```

Make sure MongoDB is running before starting the backend.

## Usage

1. Open the frontend in your browser.
2. Create an account or sign in.
3. Browse available tools.
4. List your own tools to lend to others.
5. Start a chat with tool owners and manage requests.

## Notes

- The app uses CORS and Socket.IO for real-time communication.
- Authentication is handled with JWT tokens.
- The backend currently runs on port 3000 and the frontend uses Vite's default port 5173.

## License

This project is licensed under the ISC License.
