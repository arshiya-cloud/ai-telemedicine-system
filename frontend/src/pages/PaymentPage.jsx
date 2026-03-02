import { useState, useContext, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import './PaymentPage.css';

const PaymentPage = () => {
    const location = useLocation();
    const navigate = useNavigate();

    // Safely parse state
    const { doctor, slot, date, patientDetails } = location.state || {};

    // Fallback if missing explicitly
    useEffect(() => {
        if (!doctor || !slot) {
            alert('Invalid payment session! Returning to dashboard.');
            navigate('/dashboard');
        }
    }, [doctor, slot, navigate]);

    const [paymentMethod, setPaymentMethod] = useState('UPI');
    const [processing, setProcessing] = useState(false);

    const handlePayNow = async () => {
        setProcessing(true);

        // Mock a 1.5s delay for payment gateway simulator
        setTimeout(async () => {
            alert(`Payment of ₹${doctor.consultation_fee || 500} via ${paymentMethod} Successful!`);

            try {
                // Call atomic backend endpoint
                await api.post('/appointments', {
                    doctor_id: doctor._id,
                    date: date,
                    start_time: slot.start_time,
                    patient_name: patientDetails.patient_name,
                    age: parseInt(patientDetails.age),
                    symptoms: patientDetails.symptoms,
                    notes: patientDetails.notes
                });

                alert('Appointment Confirmed!');
                navigate('/dashboard');
            } catch (err) {
                alert(err.response?.data?.detail || 'Failed to book slot at the last moment due to high contestation. Payment refunded.');
            } finally {
                setProcessing(false);
            }
        }, 1500);
    };

    if (!doctor || !slot) return null;

    return (
        <div className="payment-container">
            <h2 style={{ color: 'white', textShadow: '0 1px 3px rgba(0,0,0,0.8)', textAlign: 'center' }}>Checkout</h2>

            <div className="card" style={{ margin: '0 auto' }}>
                <h3>Summary</h3>
                <div style={{ borderBottom: '1px solid #ddd', paddingBottom: '15px', marginBottom: '15px' }}>
                    <p><strong>Doctor:</strong> {doctor.name}</p>
                    <p><strong>Specialization:</strong> {doctor.specialization}</p>
                    <p><strong>Date:</strong> {date}</p>
                    <p><strong>Time:</strong> {slot.start_time}</p>
                    <p><strong>Patient:</strong> {patientDetails.patient_name} (Age: {patientDetails.age})</p>
                </div>

                <h3 style={{ fontSize: '1.4rem' }}>Amount Payable: <span style={{ color: '#28a745' }}>₹{doctor.consultation_fee || 500}</span></h3>

                <h4 style={{ marginTop: '20px' }}>Select Payment Method:</h4>
                <div className="payment-methods">
                    {['UPI', 'Credit/Debit Card', 'Net Banking'].map((method) => (
                        <label key={method} className="payment-option">
                            <input
                                type="radio"
                                name="paymentMethod"
                                value={method}
                                checked={paymentMethod === method}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                            />
                            {method}
                        </label>
                    ))}
                </div>

                <button
                    onClick={handlePayNow}
                    disabled={processing}
                    style={{ marginTop: '25px', padding: '15px', fontSize: '1.1rem' }}
                >
                    {processing ? 'Processing Secure Payment...' : `Pay Now (₹${doctor.consultation_fee || 500})`}
                </button>
            </div>
        </div>
    );
};

export default PaymentPage;
