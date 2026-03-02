import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

const Register = () => {
    const [role, setRole] = useState('patient');
    const [formData, setFormData] = useState({
        name: '', email: '', password: '', specialization: ''
    });
    const [file, setFile] = useState(null);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        setSuccessMsg('');
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
            setSuccessMsg('Registration successful! Please login.');
            setTimeout(() => navigate('/login'), 2000);
        } catch (err) {
            const detail = err.response?.data?.detail;
            if (Array.isArray(detail)) {
                setErrorMsg(detail[0].msg || 'Validation error');
            } else {
                setErrorMsg(detail || 'Registration failed. Please try again.');
            }
        }
    };

    return (
        <div className="card">
            <h2>Register</h2>
            {successMsg && <p style={{ color: 'green' }}>{successMsg}</p>}
            {errorMsg && <p style={{ color: 'red' }}>{errorMsg}</p>}
            <select value={role} onChange={e => setRole(e.target.value)}>
                <option value="patient">Patient</option>
                <option value="doctor">Doctor</option>
            </select>
            <form onSubmit={handleSubmit} autoComplete="off">
                <input type="text" placeholder="enter your name" required onChange={e => setFormData({ ...formData, name: e.target.value })} autoComplete="off" />
                <input type="email" placeholder="enter your email" required onChange={e => setFormData({ ...formData, email: e.target.value })} autoComplete="off" />
                <input type="password" placeholder="enter your password" required onChange={e => setFormData({ ...formData, password: e.target.value })} autoComplete="new-password" />

                {role === 'doctor' && (
                    <>
                        <input type="text" placeholder="enter your specialization" required onChange={e => setFormData({ ...formData, specialization: e.target.value })} autoComplete="off" />
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
