import { useState } from 'react';
import api from '../services/api';

const AiChatbot = ({ onRecommendSpecialist }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');

    const sendMsg = async () => {
        if (!input) return;
        const newMsgs = [...messages, { sender: 'user', text: input }];
        setMessages([...newMsgs, { sender: 'bot', loading: true }]);
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

    const dotsStyle = `
    @keyframes blink {
        0% { opacity: .2; }
        20% { opacity: 1; }
        100% { opacity: .2; }
    }
    .loading-dots span {
        animation-name: blink;
        animation-duration: 1.4s;
        animation-iteration-count: infinite;
        animation-fill-mode: both;
        font-size: 1.2rem;
        margin: 0 2px;
    }
    .loading-dots span:nth-child(2) { animation-delay: .2s; }
    .loading-dots span:nth-child(3) { animation-delay: .4s; }
    `;

    return (
        <div className="dashboard-card" style={{ border: '1px solid #007bff' }}>
            <style>{dotsStyle}</style>
            <h3>What's Worring You ?</h3>
            <div className="chat-box" style={{ height: '200px' }}>
                {messages.map((m, i) => (
                    <div key={i} className={`chat-message ${m.sender === 'user' ? 'my-message' : 'other-message'}`}>
                        {m.loading ? (
                            <div className="loading-indicator">
                                <span style={{ fontSize: '0.8rem', color: '#666' }}>AI is typing</span><br/>
                                <div className="loading-dots" style={{ display: 'inline-block' }}>
                                    <span>●</span><span>●</span><span>●</span>
                                </div>
                            </div>
                        ) : (
                            m.text
                        )}
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
