package ws

import (
    "log"
    "time"
    "github.com/gorilla/websocket"
)

type Connection struct {
    conn     *websocket.Conn
    convoyID string
    hub      *Hub
    send     chan []byte
    done     chan struct{}
}

func NewConnection(conn *websocket.Conn, convoyID string, hub *Hub) *Connection {
    return &Connection{
        conn:     conn,
        convoyID: convoyID,
        hub:      hub,
        send:     make(chan []byte, 256),
        done:     make(chan struct{}),
    }
}

func (c *Connection) Start() {
    go c.writePump()
    go c.readPump()
}

func (c *Connection) readPump() {
    defer func() {
        c.hub.Unregister(c.convoyID, c.conn)
        c.conn.Close()
        close(c.done)
    }()

    c.conn.SetReadLimit(512)
    c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
    c.conn.SetPongHandler(func(string) error {
        c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
        return nil
    })

    for {
        _, _, err := c.conn.ReadMessage()
        if err != nil {
            if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
                log.Printf("WebSocket unexpected close for convoy %s: %v", c.convoyID, err)
            }
            break
        }
    }
}

func (c *Connection) writePump() {
    ticker := time.NewTicker(54 * time.Second)
    defer func() {
        ticker.Stop()
        c.conn.Close()
    }()

    for {
        select {
        case message, ok := <-c.send:
            c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
            if !ok {
                c.conn.WriteMessage(websocket.CloseMessage, []byte{})
                return
            }

            if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
                log.Printf("WebSocket write error for convoy %s: %v", c.convoyID, err)
                return
            }

        case <-ticker.C:
            c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
            if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
                return
            }

        case <-c.done:
            return
        }
    }
}