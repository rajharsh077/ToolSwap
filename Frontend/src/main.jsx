import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './index.css'
import App from './App.jsx'
import Login from './components/Login.jsx';
import Home from './components/Home.jsx';
import Signup from './components/Signup.jsx';
import UserDashboard from './components/UserDashboard.jsx';
import AddTool from './components/AddTool.jsx';
import UserProfile from './components/UserProfile.jsx';
import MessageInbox from './components/MessageInbox.jsx';
import { ChatProvider } from './context/ChatContext.jsx'; // ⬅️ NEW: Import Provider

const router = createBrowserRouter([
      {
        path: "",
       element: <Home />, 
      },
      {
        path: "login",
       element: <Login />, 
      },
      {
        path: "signup",
       element: <Signup />, 
      },
       {
        path: ":name",
       element: <UserDashboard />, 
      },
      {
        path: ":name/addTool",
       element: <AddTool />, 
      },
      {
        path: ":name/profile",
       element: <UserProfile />, 
      },
      {
        path: ":name/messages", 
       element: <MessageInbox />, 
      },
  
]);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ChatProvider>
      <RouterProvider router={router} />
    </ChatProvider>
  </StrictMode>,
)
