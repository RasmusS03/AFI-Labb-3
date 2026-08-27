import { useEffect, useRef, useState } from 'react'
import * as signalR from '@microsoft/signalr'
import './App.css'

function App() {
  const connectionRef = useRef(null)

  const [name, setName] = useState('')
  const [role, setRole] = useState('Student')
  const [status, setStatus] = useState('Frånkopplad')
  const [error, setError] = useState('')

  const [messages, setMessages] = useState([])
  const [messageText, setMessageText] = useState('')

  const [announcements, setAnnouncements] = useState([])
  const [announcementText, setAnnouncementText] = useState('')

  useEffect(() => {
    return () => {
      connectionRef.current?.stop()
    }
  }, [])

  async function connect() {
    setError('')

    const trimmedName = name.trim()

    if (!trimmedName) {
      setError('Du måste ange ett namn.')
      return
    }

    const connection = new signalR.HubConnectionBuilder()
      .withUrl('http://localhost:5000/chatHub')
      .build()

    connection.on('ReceiveMessage', (sender, text) => {
      const newMessage = {
        sender,
        text,
      }

      setMessages((oldMessages) =>
        [...oldMessages, newMessage].slice(-50),
      )
    })

    connection.on('ReceiveAnnouncement', (sender, text) => {
      const newAnnouncement = {
        sender,
        text,
      }

      setAnnouncements((oldAnnouncements) =>
        [...oldAnnouncements, newAnnouncement].slice(-50),
      )
    })

    connection.onclose(() => {
      connectionRef.current = null
      setStatus('Frånkopplad')
    })

    try {
      setStatus('Ansluter...')

      await connection.start()
      await connection.invoke('JoinChat', trimmedName, role)

      connectionRef.current = connection
      setName(trimmedName)
      setStatus('Ansluten')
    } catch (connectionError) {
      await connection.stop()

      setStatus('Frånkopplad')
      setError('Kunde inte ansluta till chatten.')

      console.error(connectionError)
    }
  }

  async function disconnect() {
    setError('')

    try {
      await connectionRef.current?.stop()
    } catch (disconnectError) {
      setError('Något gick fel vid frånkopplingen.')
      console.error(disconnectError)
    } finally {
      connectionRef.current = null
      setStatus('Frånkopplad')
    }
  }

  async function sendMessage(event) {
    event.preventDefault()
    setError('')

    const trimmedMessage = messageText.trim()

    if (!trimmedMessage) {
      return
    }

    if (!connectionRef.current) {
      setError('Du är inte ansluten.')
      return
    }

    try {
      await connectionRef.current.invoke('SendMessage', trimmedMessage)
      setMessageText('')
    } catch (sendError) {
      setError('Meddelandet kunde inte skickas.')
      console.error(sendError)
    }
  }

  async function sendAnnouncement(event) {
    event.preventDefault()
    setError('')

    const trimmedAnnouncement = announcementText.trim()

    if (!trimmedAnnouncement) {
      return
    }

    if (!connectionRef.current) {
      setError('Du är inte ansluten.')
      return
    }

    try {
      await connectionRef.current.invoke(
        'SendAnnouncement',
        trimmedAnnouncement,
      )

      setAnnouncementText('')
    } catch (sendError) {
      setError('Lärarmeddelandet kunde inte skickas.')
      console.error(sendError)
    }
  }

  const isConnected = status === 'Ansluten'

  return (
    <main className="app">
      <h1>Studentchatt</h1>

      {!isConnected ? (
        <section className="connection-box">
          <h2>Anslut till chatten</h2>

          <form
            onSubmit={(event) => {
              event.preventDefault()
              connect()
            }}
          >
            <label htmlFor="name">Namn</label>

            <input
              id="name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Skriv ditt namn"
            />

            <label htmlFor="role">Roll</label>

            <select
              id="role"
              value={role}
              onChange={(event) => setRole(event.target.value)}
            >
              <option value="Student">Student</option>
              <option value="Teacher">Teacher</option>
            </select>

            <button type="submit" disabled={status === 'Ansluter...'}>
              {status === 'Ansluter...' ? 'Ansluter...' : 'Anslut'}
            </button>
          </form>

          <p>Status: {status}</p>
        </section>
      ) : (
        <>
          <section className="user-info">
            <div>
              <p>Status: {status}</p>
              <p>
                Användare: {name} ({role})
              </p>
            </div>

            <button type="button" onClick={disconnect}>
              Koppla från
            </button>
          </section>

          <section className="chat-box">
            <h2>Chatt</h2>

            <ul className="message-list">
              {messages.length === 0 ? (
                <li>Inga meddelanden ännu.</li>
              ) : (
                messages.map((message, index) => (
                  <li key={index}>
                    <strong>{message.sender}:</strong> {message.text}
                  </li>
                ))
              )}
            </ul>

            <form onSubmit={sendMessage}>
              <input
                type="text"
                value={messageText}
                onChange={(event) => setMessageText(event.target.value)}
                placeholder="Skriv ett meddelande"
              />

              <button type="submit">Skicka</button>
            </form>
          </section>

          <section className="announcement-box">
            <h2>Lärarmeddelanden</h2>

            <ul className="announcement-list">
              {announcements.length === 0 ? (
                <li>Inga lärarmeddelanden ännu.</li>
              ) : (
                announcements.map((announcement, index) => (
                  <li key={index}>
                    <strong>Lärarmeddelande – {announcement.sender}:</strong>{' '}
                    {announcement.text}
                  </li>
                ))
              )}
            </ul>

            {role === 'Teacher' && (
              <form onSubmit={sendAnnouncement}>
                <input
                  type="text"
                  value={announcementText}
                  onChange={(event) =>
                    setAnnouncementText(event.target.value)
                  }
                  placeholder="Skriv ett lärarmeddelande"
                />

                <button type="submit">Skicka lärarmeddelande</button>
              </form>
            )}
          </section>
        </>
      )}

      {error && <p className="error-message">{error}</p>}
    </main>
  )
}

export default App