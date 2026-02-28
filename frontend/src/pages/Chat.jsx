import { useState, useEffect, useContext, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Chat = () => {
    const { appointmentId } = useParams();
    const { user } = useContext(AuthContext);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const ws = useRef(null);

    useEffect(() => {
        ws.current = new WebSocket(`ws://localhost:8000/api/chat/ws/chat/${appointmentId}`);
        ws.current.onmessage = (event) => {
            const data = JSON.parse(event.data);
            setMessages(prev => {
                if (data._id && prev.find(m => m._id === data._id)) return prev;
                return [...prev, data];
            });
        };
        return () => ws.current.close();
    }, [appointmentId]);

    const sendMsg = () => {
        if (!input) return;
        const payload = {
            sender: user.user_id,
            message: input
        };
        ws.current.send(JSON.stringify(payload));
        setInput('');
    };

    return (
        <div className="card" style={{ maxWidth: '600px' }}>
            <h2>Consultation Chat</h2>
            <div className="chat-box" style={{ height: '400px' }}>
                {messages.map((m, i) => (
                    <div key={i} className={`chat-message ${m.sender === user.user_id ? 'my-message' : 'other-message'}`}>
                        {m.message}
                    </div>
                ))}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
                <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') sendMsg() }} placeholder="Type a message..." />
                <button style={{ width: '100px' }} onClick={sendMsg}>Send</button>
            </div>
        </div>
    );
};

export default Chat;
