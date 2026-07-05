import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './index.css'
import Login from './components/Login.jsx';
import Home from './components/Home.jsx';
import Signup from './components/Signup.jsx';
import UserDashboard from './components/UserDashboard.jsx';
import AddTool from './components/AddTool.jsx';
import UserProfile from './components/UserProfile.jsx';
import MessageInbox from './components/MessageInbox.jsx';
import AdminDashboard from './components/AdminDashboard.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import Leaderboard from './components/Leaderboard.jsx';
import ToolDetail from './components/ToolDetail.jsx';
import EditProfile from './components/EditProfile.jsx';
import { ChatProvider } from './context/ChatContext.jsx';

const router = createBrowserRouter([
      {
        path: "",
        element: <Home />,
        errorElement: <ErrorBoundary />,
      },
      {
        path: "login",
        element: <Login />,
        errorElement: <ErrorBoundary />,
      },
      {
        path: "signup",
        element: <Signup />,
        errorElement: <ErrorBoundary />,
      },
      {
        path: "tool/:toolId",
        element: <ToolDetail />,
        errorElement: <ErrorBoundary />,
      },
       {
        path: ":name",
        element: <UserDashboard />,
        errorElement: <ErrorBoundary />,
      },
      {
        path: ":name/addTool",
        element: <AddTool />,
        errorElement: <ErrorBoundary />,
      },
      {
        path: ":name/edit",
        element: <EditProfile />,
        errorElement: <ErrorBoundary />,
      },
      {
        path: ":name/edit-profile",
        element: <EditProfile />,
        errorElement: <ErrorBoundary />,
      },
      {
        path: ":name/profile",
        element: <UserProfile />,
        errorElement: <ErrorBoundary />,
      },
      {
        path: ":name/messages",
        element: <MessageInbox />,
        errorElement: <ErrorBoundary />,
      },
      {
        path: ":name/leaderboard",
        element: <Leaderboard />,
        errorElement: <ErrorBoundary />,
      },
      {
        path: "admin",
        element: <AdminDashboard />,
        errorElement: <ErrorBoundary />,
      },
      {
        path: "admin/report/:reportId",
        element: <AdminDashboard />,
        errorElement: <ErrorBoundary />,
      },
  
]);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ChatProvider>
      <RouterProvider router={router} />
    </ChatProvider>
  </StrictMode>,
)
