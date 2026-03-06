import { useState } from 'react';
import api from '../services/api';

const AiChatbot = ({ onRecommendSpecialist }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');

    const sendMsg = async () => {
        if (!input) return;
        const newMsgs = [...messages, { sender: 'user', text: input }];
        setMessages(newMsgs);
        setInput('');
        try {
            const res = await api.post('/chat/chatbot', { message: input });
            setMessages([...newMsgs, { sender: 'bot', text: res.data.response_text }]);
            if (res.data.recommended_specialist && onRecommendSpecialist) {
                onRecommendSpecialist(res.data.recommended_specialist);
            }
        } catch (err) {
            setMessages([...newMsgs, { sender: 'bot', text: 'Error contacting AI services.' }]);
        }
    };

    return (
        <div className="dashboard-card" style={{ border: '1px solid #007bff' }}>
            <h3>What's Worring You ?</h3>
            <div className="chat-box" style={{ height: '200px' }}>
                {messages.map((m, i) => (
                    <div key={i} className={`chat-message ${m.sender === 'user' ? 'my-message' : 'other-message'}`}>
                        {m.text}
                    </div>
                ))}
            </div>
            <div style={{ display: 'flex', gap: '5px' }}>
                <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') sendMsg() }} placeholder="Describe your symptoms..." />
                <button style={{ width: 'auto' }} onClick={sendMsg}>Ask</button>
            </div>
        </div>
    );
};

export default AiChatbot;
