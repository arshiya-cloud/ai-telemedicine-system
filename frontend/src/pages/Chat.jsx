import { useState, useEffect, useContext, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

const Chat = () => {
    const { appointmentId } = useParams();
    const { user } = useContext(AuthContext);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [appt, setAppt] = useState(null);
    const [status, setStatus] = useState('loading'); // loading, before, during, after
    const [minsToStart, setMinsToStart] = useState(0);

    const [inCall, setInCall] = useState(false);
    const [callType, setCallType] = useState(null);
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const pcRef = useRef(null);

    const ws = useRef(null);

    useEffect(() => {
        const fetchAppt = async () => {
            try {
                const res = await api.get(`/appointments/${appointmentId}`);
                setAppt(res.data);
            } catch (err) {
                console.error(err);
                setStatus('error');
            }
        };
        fetchAppt();
    }, [appointmentId]);

    useEffect(() => {
        if (!appt) return;

        const checkTime = () => {
            const now = new Date();
            const start = new Date(`${appt.date}T${appt.start_time}`);
            let endStr = appt.end_time;
            if (!endStr) {
                // fallback to +30 mins if end_time missing
                const t = new Date(start.getTime() + 30 * 60000);
                endStr = `${t.getHours().toString().padStart(2, '0')}:${t.getMinutes().toString().padStart(2, '0')}`;
            }
            const end = new Date(`${appt.date}T${endStr}`);

            if (now < start) {
                setStatus('before');
                const diffMs = start - now;
                setMinsToStart(Math.ceil(diffMs / 60000));
            } else if (now >= start && now <= end) {
                setStatus('during');
            } else {
                setStatus('after');
            }
        };

        checkTime();
        const interval = setInterval(checkTime, 30000);
        return () => clearInterval(interval);
    }, [appt]);

    const createPeerConnection = () => {
        const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
        pc.onicecandidate = (e) => {
            if (e.candidate && ws.current) {
                ws.current.send(JSON.stringify({ type: 'ice-candidate', candidate: e.candidate, sender: user.user_id }));
            }
        };
        pc.ontrack = (e) => {
            if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
        };
        return pc;
    };

    const stopLocalMedia = () => {
        if (localVideoRef.current && localVideoRef.current.srcObject) {
            localVideoRef.current.srcObject.getTracks().forEach(t => t.stop());
            localVideoRef.current.srcObject = null;
        }
    };

    const handleOffer = async (data) => {
        setInCall(true);
        try {
            const hasVideo = data.offer.sdp.includes('m=video');
            setCallType(hasVideo ? 'video' : 'voice');
            const stream = await navigator.mediaDevices.getUserMedia({ video: hasVideo, audio: true }).catch(err => {
                return navigator.mediaDevices.getUserMedia({ video: false, audio: true });
            });
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;

            const pc = createPeerConnection();
            pcRef.current = pc;
            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            ws.current.send(JSON.stringify({ type: 'answer', answer, sender: user.user_id }));
        } catch (e) {
            console.error(e);
        }
    };

    const handleAnswer = async (data) => {
        if (pcRef.current) {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        }
    };

    const handleIceCandidate = async (data) => {
        if (pcRef.current) {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
    };

    const endCall = (isRemote = false) => {
        if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
        }
        stopLocalMedia();
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
        setInCall(false);
        setCallType(null);
        if (!isRemote && ws.current) {
            ws.current.send(JSON.stringify({ type: 'end-call', sender: user.user_id }));
        }
    };

    useEffect(() => {
        if (status !== 'during') return;

        ws.current = new WebSocket(`ws://localhost:8000/api/chat/ws/chat/${appointmentId}`);
        ws.current.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.error) {
                alert(data.error);
                return;
            }
            if (data.type) {
                if (data.sender !== user.user_id) {
                    if (data.type === 'offer') handleOffer(data);
                    if (data.type === 'answer') handleAnswer(data);
                    if (data.type === 'ice-candidate') handleIceCandidate(data);
                    if (data.type === 'end-call') endCall(true);
                }
                return;
            }
            if (data.sender === 'system' && data.message.includes('new prescription')) {
                const rxPattern = /\[(.*?)\]\(\/(app\/uploads\/prescriptions\/.*?)\)/;
                const match = data.message.match(rxPattern);
                if (match) {
                    setAppt(prev => ({ ...prev, prescription_url: match[2] }));
                }
            }
            setMessages(prev => {
                if (data._id && prev.find(m => m._id === data._id)) return prev;
                return [...prev, data];
            });
        };
        return () => {
            endCall();
            if (ws.current) ws.current.close();
        };
    }, [appointmentId, user.user_id, status]);

    const startCall = async (type) => {
        setCallType(type);
        setInCall(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: type === 'video', audio: true });
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;

            const pc = createPeerConnection();
            pcRef.current = pc;
            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            ws.current.send(JSON.stringify({ type: 'offer', offer, sender: user.user_id }));
        } catch (e) {
            console.error(e);
            setInCall(false);
            setCallType(null);
        }
    };

    const [showRxModal, setShowRxModal] = useState(false);
    const [rxData, setRxData] = useState({ medicine_name: '', dosage_instructions: '', usage_instructions: '', additional_notes: '' });

    const sendMsg = () => {
        if (!input || status !== 'during') return;
        const payload = {
            sender: user.user_id,
            message: input
        };
        ws.current.send(JSON.stringify(payload));
        setInput('');
    };

    const submitPrescription = async () => {
        try {
            const res = await api.post(`/prescriptions/${appointmentId}`, rxData);
            alert("Prescription generated successfully!");
            setShowRxModal(false);
            setAppt(prev => ({ ...prev, prescription_url: res.data.url }));
        } catch (e) {
            console.error("Prescription error", e);
            alert("Failed to generate prescription");
        }
    };

    const renderMessage = (msg) => {
        const text = msg.message;
        const rxPattern = /\[(.*?)\]\(\/(app\/uploads\/prescriptions\/.*?)\)/;
        const match = text.match(rxPattern);
        if (match) {
            const label = match[1];
            const url = match[2];
            return (
                <span>
                    A new prescription has been generated: <a href={`http://localhost:8000/${url}`} target="_blank" rel="noopener noreferrer" style={{ color: 'blue', textDecoration: 'underline' }}>{label}</a>
                </span>
            );
        }
        return text;
    };

    if (status === 'error') {
        return (
            <div style={{ padding: '20px', textAlign: 'center', marginTop: '50px' }}>
                <h2>Failed to load consultation</h2>
                <div style={{ marginTop: '20px' }}>
                    <Link to="/dashboard" style={{ display: 'inline-block', padding: '10px 20px', background: '#007BFF', color: 'white', textDecoration: 'none', borderRadius: '5px' }}>Back to Home</Link>
                </div>
            </div>
        );
    }

    if (!appt) {
        return (
            <div style={{ padding: '20px', textAlign: 'center', marginTop: '50px' }}>
                <h2>Loading consultation...</h2>
                <div style={{ marginTop: '20px' }}>
                    <Link to="/dashboard" style={{ display: 'inline-block', padding: '10px 20px', background: '#ccc', color: '#333', textDecoration: 'none', borderRadius: '5px' }}>Back to Home</Link>
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: '20px' }}>
            {showRxModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="card" style={{ background: '#fff', padding: '20px', width: '400px', borderRadius: '8px' }}>
                        <h3>Generate Prescription</h3>
                        <input placeholder="Medicine Name" value={rxData.medicine_name} onChange={e => setRxData({ ...rxData, medicine_name: e.target.value })} style={{ marginBottom: '10px' }} />
                        <input placeholder="Dosage (e.g., 1-0-1)" value={rxData.dosage_instructions} onChange={e => setRxData({ ...rxData, dosage_instructions: e.target.value })} style={{ marginBottom: '10px' }} />
                        <input placeholder="Usage (e.g., After Food)" value={rxData.usage_instructions} onChange={e => setRxData({ ...rxData, usage_instructions: e.target.value })} style={{ marginBottom: '10px' }} />
                        <input placeholder="Notes" value={rxData.additional_notes} onChange={e => setRxData({ ...rxData, additional_notes: e.target.value })} style={{ marginBottom: '10px' }} />
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowRxModal(false)} style={{ background: '#ccc', width: 'auto' }}>Cancel</button>
                            <button onClick={submitPrescription} style={{ background: '#007bff', width: 'auto' }}>Generate PDF</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="card" style={{ maxWidth: inCall ? '900px' : '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', height: '80vh', transition: 'all 0.3s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2>Consultation Chat</h2>
                    {user.role === 'doctor' && (
                        <button onClick={() => setShowRxModal(true)} style={{ width: 'auto', background: '#e83e8c', padding: '5px 15px', fontSize: '14px' }}>Write Prescription</button>
                    )}
                </div>

                {status === 'before' && (
                    <div style={{ padding: '10px', background: '#fff3cd', color: '#856404', borderRadius: '5px', marginBottom: '10px', textAlign: 'center' }}>
                        Consultation starts in {minsToStart} minutes
                    </div>
                )}

                {status === 'after' && (
                    <div style={{ padding: '10px', background: '#f8d7da', color: '#721c24', borderRadius: '5px', marginBottom: '10px', textAlign: 'center' }}>
                        Appointment has ended
                    </div>
                )}

                {status === 'during' && !inCall && (
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', justifyContent: 'center' }}>
                        <button onClick={() => startCall('voice')} style={{ width: 'auto', background: '#17a2b8' }}>Voice Call</button>
                        <button onClick={() => startCall('video')} style={{ width: 'auto', background: '#28a745' }}>Video Call</button>
                    </div>
                )}

                <div style={{ display: 'flex', flex: 1, gap: '20px', overflow: 'hidden' }}>

                    {/* Media Container */}
                    {inCall && (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', background: '#000', borderRadius: '8px', padding: '10px', position: 'relative' }}>
                            <video
                                ref={remoteVideoRef}
                                autoPlay
                                playsInline
                                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
                            />
                            <video
                                ref={localVideoRef}
                                autoPlay
                                muted
                                playsInline
                                style={{ width: '150px', height: '100px', objectFit: 'cover', borderRadius: '8px', position: 'absolute', bottom: '20px', right: '20px', border: '2px solid white' }}
                            />
                            <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)' }}>
                                <button onClick={() => endCall(false)} style={{ background: '#dc3545', width: 'auto', borderRadius: '20px', padding: '10px 20px' }}>End Call</button>
                            </div>
                        </div>
                    )}

                    {/* Chat Container */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: '300px' }}>
                        {appt && appt.prescription_url && (
                            <div style={{ background: '#e2f0d9', padding: '10px', borderRadius: '5px', marginBottom: '10px', textAlign: 'center', fontWeight: 'bold' }}>
                                A prescription has been generated: <a href={`http://localhost:8000/${appt.prescription_url}`} target="_blank" rel="noopener noreferrer" style={{ color: '#28a745', textDecoration: 'underline', marginLeft: '10px' }}>Download PDF</a>
                            </div>
                        )}
                        <div className="chat-box" style={{ flex: 1, overflowY: 'auto', marginBottom: '10px' }}>
                            {messages.filter(m => !m.error && !m.type).map((m, i) => (
                                <div key={i} className={`chat-message ${m.sender === user.user_id ? 'my-message' : (m.sender === 'system' ? 'system-message' : 'other-message')}`}>
                                    {renderMessage(m)}
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') sendMsg() }}
                                placeholder="Type a message..."
                                disabled={status !== 'during'}
                            />
                            <button
                                style={{ width: '100px', opacity: status !== 'during' ? 0.5 : 1 }}
                                onClick={sendMsg}
                                disabled={status !== 'during'}
                            >Send</button>
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: '10px', textAlign: 'center' }}>
                    <Link to="/dashboard">Back to Dashboard</Link>
                </div>
            </div>
        </div>
    );
};

export default Chat;
