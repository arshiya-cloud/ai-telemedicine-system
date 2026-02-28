import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

const Register = () => {
    const [role, setRole] = useState('patient');
    const [formData, setFormData] = useState({
        name: '', email: '', password: '', specialization: ''
    });
    const [file, setFile] = useState(null);
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (role === 'patient') {
                await api.post('/auth/register/patient', {
                    name: formData.name, email: formData.email,
                    password: formData.password, role: 'patient'
                });
            } else {
                const data = new FormData();
                data.append('name', formData.name);
                data.append('email', formData.email);
                data.append('password', formData.password);
                data.append('specialization', formData.specialization);
                if (file) data.append('license_doc', file);

                await api.post('/auth/register/doctor', data);
            }
            setMessage('Registration successful! Please login.');
            setTimeout(() => navigate('/login'), 2000);
        } catch (err) {
            setMessage(err.response?.data?.detail || 'Registration failed');
        }
    };

    return (
        <div className="card">
            <h2>Register</h2>
            {message && <p style={{ color: message.includes('failed') ? 'red' : 'green' }}>{message}</p>}
            <select value={role} onChange={e => setRole(e.target.value)}>
                <option value="patient">Patient</option>
                <option value="doctor">Doctor</option>
            </select>
            <form onSubmit={handleSubmit}>
                <input type="text" placeholder="Name" required onChange={e => setFormData({ ...formData, name: e.target.value })} />
                <input type="email" placeholder="Email" required onChange={e => setFormData({ ...formData, email: e.target.value })} />
                <input type="password" placeholder="Password" required onChange={e => setFormData({ ...formData, password: e.target.value })} />

                {role === 'doctor' && (
                    <>
                        <input type="text" placeholder="Specialization" required onChange={e => setFormData({ ...formData, specialization: e.target.value })} />
                        <label>License Document:</label>
                        <input type="file" required onChange={e => setFile(e.target.files[0])} />
                    </>
                )}

                <button type="submit">Register</button>
            </form>
            <p>Already have an account? <Link to="/login">Login</Link></p>
        </div>
    );
};

export default Register;
