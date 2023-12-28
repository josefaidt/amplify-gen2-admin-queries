import { useState } from "react"
import { fetchAuthSession } from "aws-amplify/auth"
import "./App.css"

const base = new URL(import.meta.env.VITE_ADMIN_QUERIES_API_URL)

function App() {
  const [error, setError] = useState<unknown>()
  const [response, setResponse] = useState<string>()

  async function request(path: string, payload?: FormData) {
    const url = new URL(path, base)
    const authToken = (await fetchAuthSession()).tokens?.idToken?.toString()
    const headers = new Headers({
      Authorization: `Bearer ${authToken}`,
    })
    if (payload) {
      headers.append("Content-Type", "multipart/form-data")
    }
    const request = new Request(url, {
      method: payload ? "POST" : "GET",
      headers,
    })
    const response = await fetch(request)
    return response
  }

  async function query(path: string, payload?: FormData) {
    try {
      const response = await request(path, payload)
      setResponse(await response.text())
    } catch (error) {
      console.log("got error", error)
      if (error instanceof Error) {
        setError(`${error.message}`)
      } else {
        setError(error)
      }
    }
  }

  return (
    <>
      <h1>Amplify Admin Queries</h1>
      <div></div>
      <button onClick={() => query("/list-groups")}>list groups</button>
      <pre>
        <code>
          {error ? JSON.stringify(error) : null}
          {response ? JSON.stringify(response) : null}
        </code>
      </pre>
    </>
  )
}

export default App
