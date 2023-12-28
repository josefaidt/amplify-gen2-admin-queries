import React from "react"
import ReactDOM from "react-dom/client"
import { Authenticator } from "@aws-amplify/ui-react"
import { Amplify } from "aws-amplify"
import config from "admin-queries-backend/config"
import App from "./App.tsx"
import "@aws-amplify/ui-react/styles.css"

Amplify.configure(config)

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Authenticator>
      <App />
    </Authenticator>
  </React.StrictMode>,
)
