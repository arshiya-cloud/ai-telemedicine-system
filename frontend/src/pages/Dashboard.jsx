import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import AiChatbot from '../components/AiChatbot';

const Dashboard = () => {
    const { user } = useContext(AuthContext);
    const [data, setData] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [newSlot, setNewSlot] = useState({ date: '', start_time: '' });
    const navigate = useNavigate();

    useEffect(() => {
        if (user.role === 'admin') fetchPendingDoctors();
        if (user.role === 'doctor') { fetchSlots(); fetchDoctorAppointments(); }
        if (user.role === 'patient') { fetchApprovedDoctors(); fetchMyAppointments(); }
    }, [user.role]);

    const fetchPendingDoctors = async () => {
        const res = await api.get('/admin/pending-doctors');
        setData(res.data);
    };
    const handleApprove = async (id) => {
        await api.post(`/admin/approve-doctor/${id}`);
        fetchPendingDoctors();
    };

    const fetchSlots = async () => {
        const res = await api.get('/doctor/slots');
        setData(res.data);
    };
    const fetchDoctorAppointments = async () => {
        const res = await api.get('/doctor/appointments');
        setAppointments(res.data);
    };
    const addSlot = async () => {
        await api.post('/doctor/slots', newSlot);
        fetchSlots();
    };

    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [slots, setSlots] = useState([]);
    const fetchApprovedDoctors = async () => {
        const res = await api.get('/patient/doctors');
        setData(res.data);
    };
    const fetchMyAppointments = async () => {
        const res = await api.get('/appointments/my-appointments');
        setAppointments(res.data);
    };
    const viewSlots = async (docId) => {
        setSelectedDoctor(docId);
        const res = await api.get(`/appointments/slots/${docId}`);
        setSlots(res.data);
    };

    // For review
    const [review, setReview] = useState({ rating: 5, comment: '', appointment_id: '' });

    const bookAndPay = async (slotId) => {
        try {
            const resBook = await api.post('/appointments/book', { slot_id: slotId });
            const appointmentId = resBook.data.appointment_id;

            const resOrder = await api.post('/payment/create-order', { appointment_id: appointmentId, amount: 500 });

            alert('Mock Razorpay Popup: Payment Successful');

            await api.post('/payment/verify', {
                razorpay_order_id: resOrder.data.order_id,
                razorpay_payment_id: 'pay_mock_' + Math.random(),
                razorpay_signature: 'sign_mock_' + Math.random(),
                appointment_id: appointmentId
            });
            alert('Appointment Confirmed!');
            fetchMyAppointments();
        } catch (err) {
            alert(err.response?.data?.detail || 'Booking/Payment failed');
        }
    };

    const submitReview = async () => {
        try {
            await api.post('/appointments/review', review);
            alert("Review submitted");
            setReview({ rating: 5, comment: '', appointment_id: '' });
        } catch (e) {
            alert('Failed to submit review');
        }
    }

    return (
        <div>
            <h2>Welcome to Dashboard ({user.role})</h2>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                <div style={{ flex: 2 }}>
                    {user.role === 'patient' && (
                        <div>
                            <div className="dashboard-card">
                                <h3>Available Doctors</h3>
                                {data.map(doc => (
                                    <div key={doc._id} style={{ borderBottom: '1px solid #eee', padding: '10px 0' }}>
                                        <h4>{doc.name} - {doc.specialization}</h4>
                                        <button onClick={() => viewSlots(doc._id)} style={{ width: 'auto' }}>View Slots</button>
                                    </div>
                                ))}
                            </div>
                            {selectedDoctor && (
                                <div className="dashboard-card">
                                    <h3>Available Slots</h3>
                                    {slots.length === 0 ? <p>No slots.</p> : slots.map(s => (
                                        <div key={s._id} style={{ display: 'inline-block', margin: '5px' }}>
                                            <button onClick={() => bookAndPay(s._id)} style={{ width: 'auto' }}>{s.date} {s.start_time}</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="dashboard-card">
                                <h3>My Appointments</h3>
                                {appointments.map(a => (
                                    <div key={a._id} style={{ borderBottom: '1px solid #eee', padding: '10px 0' }}>
                                        <p>Date: {a.date} | Time: {a.start_time}</p>
                                        <p>Status: {a.status}</p>
                                        {a.status === 'confirmed' && (
                                            <>
                                                <button onClick={() => navigate(`/chat/${a._id}`)} style={{ width: 'auto', marginRight: '5px' }}>Go to Chat</button>
                                                <button onClick={() => setReview({ ...review, appointment_id: a._id })} style={{ width: 'auto', background: '#28a745' }}>Write Review</button>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                            {review.appointment_id && (
                                <div className="dashboard-card" style={{ border: '2px solid #28a745' }}>
                                    <h3>Write Review</h3>
                                    <select value={review.rating} onChange={(e) => setReview({ ...review, rating: parseInt(e.target.value) })}>
                                        <option value={5}>5 Stars</option>
                                        <option value={4}>4 Stars</option>
                                        <option value={3}>3 Stars</option>
                                        <option value={2}>2 Stars</option>
                                        <option value={1}>1 Star</option>
                                    </select>
                                    <input type="text" placeholder="Comment" value={review.comment} onChange={(e) => setReview({ ...review, comment: e.target.value })} />
                                    <button onClick={submitReview}>Submit Review</button>
                                </div>
                            )}
                        </div>
                    )}

                    {user.role === 'doctor' && (
                        <div>
                            <div className="dashboard-card">
                                <h3>Add Slot</h3>
                                <input type="date" onChange={e => setNewSlot({ ...newSlot, date: e.target.value })} />
                                <input type="time" onChange={e => setNewSlot({ ...newSlot, start_time: e.target.value })} />
                                <button onClick={addSlot} style={{ width: 'auto' }}>Add</button>
                            </div>
                            <div className="dashboard-card">
                                <h3>My Slots</h3>
                                <ul>{data.map(s => <li key={s._id}>{s.date} {s.start_time} - {s.status}</li>)}</ul>
                            </div>
                            <div className="dashboard-card">
                                <h3>My Appointments</h3>
                                {appointments.map(a => (
                                    <div key={a._id} style={{ borderBottom: '1px solid #eee', padding: '10px 0' }}>
                                        <p>Patient ID: {a.patient_id} | Date: {a.date} | Time: {a.start_time}</p>
                                        <p>Status: {a.status}</p>
                                        {a.status === 'confirmed' && (
                                            <button onClick={() => navigate(`/chat/${a._id}`)} style={{ width: 'auto' }}>Go to Chat</button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {user.role === 'admin' && (
                        <div className="dashboard-card">
                            <h3>Pending Doctors</h3>
                            {data.map(doc => (
                                <div key={doc._id} style={{ borderBottom: '1px solid #eee', padding: '10px 0' }}>
                                    <p>{doc.name} - {doc.specialization} ({doc.email})</p>
                                    <a href={`http://localhost:8000/${doc.license_doc}`} target="_blank" rel="noreferrer">View License</a>
                                    <br />
                                    <button onClick={() => handleApprove(doc._id)} style={{ width: 'auto', background: 'green' }}>Approve</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                {user.role === 'patient' && (
                    <div style={{ flex: 1 }}>
                        <AiChatbot />
                    </div>
                )}
            </div>
        </div>
    );
};
export default Dashboard;
