import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './AdminDashboard.css';

const AdminDashboard = () => {
    const { user, logout } = useContext(AuthContext);
    const [activeSection, setActiveSection] = useState('pending');
    const [pendingDoctors, setPendingDoctors] = useState([]);
    const [approvedDoctors, setApprovedDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        if (activeSection === 'pending') {
            fetchPendingDoctors();
        } else if (activeSection === 'approved') {
            fetchApprovedDoctors();
        }
    }, [activeSection]);

    const fetchPendingDoctors = async () => {
        try {
            setLoading(true);
            const res = await api.get('/admin/pending-doctors');
            setPendingDoctors(res.data);
            setError('');
        } catch (err) {
            console.error('Failed to fetch pending doctors:', err);
            setError('Failed to load pending doctors. Please try again.');
            if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                logout();
                navigate('/login');
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchApprovedDoctors = async () => {
        try {
            setLoading(true);
            const res = await api.get('/admin/approved-doctors');
            setApprovedDoctors(res.data);
            setError('');
        } catch (err) {
            console.error('Failed to fetch approved doctors:', err);
            setError('Failed to load approved doctors.');
            if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                logout();
                navigate('/login');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (doctorId) => {
        try {
            await api.post(`/admin/approve-doctor/${doctorId}`);
            setPendingDoctors(pendingDoctors.filter(doc => doc._id !== doctorId));
        } catch (err) {
            console.error('Error approving doctor:', err);
            alert('Failed to approve doctor');
        }
    };

    const handleReject = async (doctorId) => {
        const confirmReject = window.confirm('Are you sure you want to reject this doctor?');
        if (!confirmReject) return;

        try {
            await api.post(`/admin/reject-doctor/${doctorId}`);
            setPendingDoctors(pendingDoctors.filter(doc => doc._id !== doctorId));
        } catch (err) {
            console.error('Error rejecting doctor:', err);
            alert('Failed to reject doctor');
        }
    };

    const renderContent = () => {
        if (activeSection === 'overview' || activeSection === 'appointments') {
            return (
                <div className="admin-content-area">
                    <h2 className="admin-section-title">
                        {activeSection === 'overview' && 'Dashboard Overview'}
                        {activeSection === 'appointments' && 'Manage Appointments'}
                    </h2>
                    <p style={{ color: '#718096' }}>This section is currently under development.</p>
                </div>
            );
        }

        if (activeSection === 'approved') {
            return (
                <div className="admin-content-area">
                    <h2 className="admin-section-title">Approved Doctors</h2>
                    {error && <p style={{ color: 'red' }}>{error}</p>}
                    {loading ? (
                        <p>Loading doctors...</p>
                    ) : approvedDoctors.length === 0 ? (
                        <p>No approved doctors found.</p>
                    ) : (
                        <div className="doctor-cards-grid">
                            {approvedDoctors.map((doc) => (
                                <div key={doc._id} className="doctor-card" style={{ borderColor: '#28a745' }}>
                                    <div className="doctor-card-info" style={{ marginBottom: 0 }}>
                                        <h3>{doc.name}</h3>
                                        <p><strong>Email:</strong> {doc.email}</p>
                                        <p><strong>Specialization:</strong> {doc.specialization || 'Not specified'}</p>
                                        <p style={{ color: '#28a745', fontWeight: 'bold', marginTop: '10px' }}>Active & Approved</p>
                                        {doc.license_doc && (
                                            <a
                                                href={`http://localhost:8000/${doc.license_doc.replace(/\\/g, '/')}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn-preview"
                                            >
                                                View License Document
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div className="admin-content-area">
                <h2 className="admin-section-title">Pending Doctor Approvals</h2>
                {error && <p style={{ color: 'red' }}>{error}</p>}

                {loading ? (
                    <p>Loading doctors...</p>
                ) : pendingDoctors.length === 0 ? (
                    <p>No pending doctor approvals at this time.</p>
                ) : (
                    <div className="doctor-cards-grid">
                        {pendingDoctors.map((doc) => (
                            <div key={doc._id} className="doctor-card">
                                <div className="doctor-card-info">
                                    <h3>{doc.name}</h3>
                                    <p><strong>Email:</strong> {doc.email}</p>
                                    <p><strong>Specialization:</strong> {doc.specialization || 'Not specified'}</p>
                                    {doc.license_doc && (
                                        <a
                                            href={`http://localhost:8000/${doc.license_doc.replace(/\\/g, '/')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn-preview"
                                        >
                                            View License Document
                                        </a>
                                    )}
                                </div>
                                <div className="doctor-card-actions">
                                    <button
                                        className="btn-approve"
                                        onClick={() => handleApprove(doc._id)}
                                    >
                                        Approve
                                    </button>
                                    <button
                                        className="btn-reject"
                                        onClick={() => handleReject(doc._id)}
                                    >
                                        Reject
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="admin-dashboard-container">
            {/* Left Sidebar */}
            <aside className="admin-sidebar">
                <div className="admin-sidebar-header">
                    Admin Portal
                </div>
                <div className="admin-sidebar-menu">
                    <div
                        className={`admin-sidebar-item ${activeSection === 'overview' ? 'active' : ''}`}
                        onClick={() => setActiveSection('overview')}
                    >
                        Dashboard Overview
                    </div>
                    <div
                        className={`admin-sidebar-item ${activeSection === 'pending' ? 'active' : ''}`}
                        onClick={() => setActiveSection('pending')}
                    >
                        Pending Doctor Approvals
                    </div>
                    <div
                        className={`admin-sidebar-item ${activeSection === 'approved' ? 'active' : ''}`}
                        onClick={() => setActiveSection('approved')}
                    >
                        Approved Doctors
                    </div>
                    <div
                        className={`admin-sidebar-item ${activeSection === 'appointments' ? 'active' : ''}`}
                        onClick={() => setActiveSection('appointments')}
                    >
                        Manage Appointments
                    </div>
                </div>
                <div
                    className="admin-sidebar-item logout"
                    onClick={logout}
                >
                    Logout
                </div>
            </aside>

            {/* Main Content */}
            <main className="admin-main">
                {/* Top Header */}
                <header className="admin-header">
                    <div className="admin-user-info">
                        User: Admin
                    </div>
                </header>

                {/* Banner Section */}
                <div className="admin-banner">
                    <div className="admin-banner-overlay"></div>
                    <div className="admin-banner-content">
                        <h1 className="admin-banner-title">Welcome, Admin</h1>
                        <p className="admin-banner-subtitle">Manage and monitor the telemedicine platform</p>
                    </div>
                </div>

                {/* Content Area */}
                {renderContent()}
            </main>
        </div>
    );
};

export default AdminDashboard;
