import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import './DoctorBooking.css';

const DoctorBooking = () => {
    const { doctorId } = useParams();
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const [doctor, setDoctor] = useState(null);
    const [date, setDate] = useState('');
    const [slots, setSlots] = useState([]);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [reviews, setReviews] = useState({ average_rating: 0, reviews: [] });

    // Patient details form
    const [patientDetails, setPatientDetails] = useState({
        patient_name: '',
        age: '',
        symptoms: '',
        notes: ''
    });

    useEffect(() => {
        fetchDoctor();
        fetchReviews();
        // Today's date as default
        const today = new Date().toISOString().split('T')[0];
        setDate(today);
    }, [doctorId]);

    useEffect(() => {
        if (date && doctor) {
            fetchSlots(date);
            const interval = setInterval(() => {
                fetchSlots(date, true);
            }, 3000);
            return () => clearInterval(interval);
        }
    }, [date, doctor]);

    const fetchDoctor = async () => {
        try {
            const res = await api.get(`/patient/doctor/${doctorId}`);
            setDoctor(res.data);
            setLoading(false);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to load doctor profile.');
            setLoading(false);
        }
    };

    const fetchReviews = async () => {
        try {
            const res = await api.get(`/appointments/reviews/${doctorId}`);
            setReviews(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchSlots = async (selectedDate, isPolling = false) => {
        try {
            const res = await api.get(`/patient/doctor/${doctorId}/slots?date=${selectedDate}&t=${new Date().getTime()}`);
            setSlots(res.data);
            if (!isPolling) {
                setSelectedSlot(null); // Reset choice on explicit date change
            } else {
                setSelectedSlot(prev => {
                    if (!prev) return null;
                    const stillAvailable = res.data.find(s => s.start_time === prev.start_time && !s.is_booked);
                    return stillAvailable ? prev : null;
                });
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleFormChange = (e) => {
        setPatientDetails({ ...patientDetails, [e.target.name]: e.target.value });
    };

    const handleBookClick = (e) => {
        e.preventDefault();
        if (!selectedSlot) {
            alert('Please select a time slot!');
            return;
        }

        // Pass data to payment route
        navigate('/payment', {
            state: {
                doctor,
                slot: selectedSlot,
                date,
                patientDetails
            }
        });
    };

    if (loading) return <div style={{ padding: '20px', color: 'white' }}>Loading doctor details...</div>;
    if (error) return <div style={{ padding: '20px', color: 'red' }}>{error}</div>;
    if (!doctor) return null;

    return (
        <div className="booking-container">
            <h2 style={{ color: 'white', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>Book Appointment</h2>

            <div className="booking-layout">
                {/* Left Column: Doctor Info & Patient Form */}
                <div className="booking-left">
                    <div className="card" style={{ margin: '0 0 20px 0', maxWidth: '100%' }}>
                        <h3>Doctor Information</h3>
                        <p><strong>Name:</strong> {doctor.name}</p>
                        <p><strong>Specialization:</strong> {doctor.specialization}</p>
                        <p><strong>Consultation Fee:</strong> ₹{doctor.consultation_fee || 500}</p>
                        <p><strong>Available Days:</strong> {doctor.available_days || 'Not specified'}</p>
                        <hr style={{ margin: '15px 0' }} />
                        <p><strong>Rating:</strong> {reviews.average_rating} ⭐ ({reviews.reviews.length} reviews)</p>
                    </div>

                    <div className="card" style={{ margin: '0 0 20px 0', maxWidth: '100%', maxHeight: '300px', overflowY: 'auto' }}>
                        <h3>Patient Feedback</h3>
                        {reviews.reviews.length === 0 ? <p>No reviews yet.</p> : reviews.reviews.map((r, idx) => (
                            <div key={idx} style={{ borderBottom: '1px solid #ccc', padding: '10px 0' }}>
                                <p style={{ margin: '0 0 5px 0' }}><strong>{r.rating} ⭐</strong></p>
                                <p style={{ margin: 0, fontStyle: 'italic', color: '#555' }}>"{r.comment}"</p>
                            </div>
                        ))}
                    </div>

                    <div className="card" style={{ margin: 0, maxWidth: '100%' }}>
                        <h3>Patient Details</h3>
                        <form onSubmit={handleBookClick} id="booking-form">
                            <input
                                type="text"
                                name="patient_name"
                                placeholder="Patient Full Name"
                                required
                                value={patientDetails.patient_name}
                                onChange={handleFormChange}
                            />
                            <input
                                type="number"
                                name="age"
                                placeholder="Age"
                                required
                                min="1"
                                max="120"
                                value={patientDetails.age}
                                onChange={handleFormChange}
                            />
                            <textarea
                                name="symptoms"
                                placeholder="Describe your symptoms (Required)"
                                required
                                rows="4"
                                value={patientDetails.symptoms}
                                onChange={handleFormChange}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    marginBottom: '10px',
                                    boxSizing: 'border-box',
                                    borderRadius: '4px',
                                    border: '1px solid #ccc'
                                }}
                            />
                            <textarea
                                name="notes"
                                placeholder="Additional notes (Optional)"
                                rows="2"
                                value={patientDetails.notes}
                                onChange={handleFormChange}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    marginBottom: '10px',
                                    boxSizing: 'border-box',
                                    borderRadius: '4px',
                                    border: '1px solid #ccc'
                                }}
                            />
                        </form>
                    </div>
                </div>

                {/* Right Column: Calendar & Slots */}
                <div className="booking-right">
                    <div className="card" style={{ margin: 0, maxWidth: '100%' }}>
                        <h3>Select Date & Time</h3>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                        />

                        <div className="slots-grid">
                            {slots.length === 0 ? (
                                <p style={{ gridColumn: '1 / -1', color: '#666', fontStyle: 'italic' }}>No available slots for this date.</p>
                            ) : (
                                slots.map(slot => {
                                    // Check if past logically (simplified prototype logic)
                                    const isPast = false; // Could enhance by parsing Date and Time

                                    const isSelected = selectedSlot?.start_time === slot.start_time;
                                    let slotClass = 'slot-box';

                                    if (slot.is_booked) slotClass += ' booked';
                                    else if (isPast) slotClass += ' past';
                                    else if (isSelected) slotClass += ' selected';
                                    else slotClass += ' available';

                                    return (
                                        <div
                                            key={slot.start_time}
                                            className={slotClass}
                                            onClick={() => {
                                                if (!slot.is_booked && !isPast) {
                                                    setSelectedSlot(slot);
                                                }
                                            }}
                                        >
                                            {slot.start_time}
                                        </div>
                                    )
                                })
                            )}
                        </div>

                        <button
                            type="submit"
                            form="booking-form"
                            style={{ marginTop: '20px', padding: '15px' }}
                            disabled={!selectedSlot}
                        >
                            Proceed to Payment
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DoctorBooking;
