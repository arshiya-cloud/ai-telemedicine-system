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
    const [specializations, setSpecializations] = useState([]);
    const [selectedSpec, setSelectedSpec] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        if (user.role === 'admin') fetchPendingDoctors();
        if (user.role === 'doctor') { fetchSlots(); fetchDoctorAppointments(); }
        if (user.role === 'patient') {
            fetchApprovedDoctors();
            fetchMyAppointments();
            fetchSpecializations();
        }
    }, [user.role]);

    useEffect(() => {
        if (user.role === 'patient') {
            fetchApprovedDoctors();
        }
    }, [selectedSpec]);

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

    const fetchApprovedDoctors = async () => {
        const query = selectedSpec ? `?specialization=${selectedSpec}` : '';
        const res = await api.get(`/patient/doctors${query}`);
        setData(res.data);
    };

    const fetchSpecializations = async () => {
        try {
            const res = await api.get('/patient/doctors/specializations');
            setSpecializations(res.data);
        } catch (err) {
            console.error('Could not fetch specializations', err);
        }
    };

    const fetchMyAppointments = async () => {
        const res = await api.get('/appointments/my-appointments');
        setAppointments(res.data);
    };

    // For review
    const [review, setReview] = useState({ rating: 5, comment: '', appointment_id: '' });

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
            <h2>Welcome to Dashboard, {user?.name} ({user.role})</h2>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                <div style={{ flex: 2 }}>
                    {user.role === 'patient' && (
                        <div>
                            <div className="dashboard-card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h3>Available Doctors</h3>
                                    <select
                                        value={selectedSpec}
                                        onChange={(e) => setSelectedSpec(e.target.value)}
                                        style={{ width: 'auto', padding: '5px 10px' }}
                                    >
                                        <option value="">All Specializations</option>
                                        {specializations.map(spec => (
                                            <option key={spec} value={spec}>{spec}</option>
                                        ))}
                                    </select>
                                </div>
                                {data.map(doc => (
                                    <div key={doc._id} style={{ borderBottom: '1px solid #eee', padding: '10px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <h4 style={{ margin: '0 0 5px 0' }}>{doc.name}</h4>
                                            <span style={{ color: '#666', fontSize: '0.9rem' }}>{doc.specialization} • ₹{doc.consultation_fee || 500}</span>
                                        </div>
                                        <button onClick={() => navigate(`/doctor/${doc._id}/book`)} style={{ width: 'auto', margin: 0 }}>Book Slot</button>
                                    </div>
                                ))}
                                {data.length === 0 && <p>No doctors found matching this specialization.</p>}
                            </div>
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
                        <AiChatbot onRecommendSpecialist={setSelectedSpec} />
                    </div>
                )}
            </div>
        </div>
    );
};
export default Dashboard;
