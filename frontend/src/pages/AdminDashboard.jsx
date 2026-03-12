import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './AdminDashboard.css';

const AdminDashboard = () => {
    const { user, logout } = useContext(AuthContext);
    const [activeSection, setActiveSection] = useState('overview');
    const [pendingDoctors, setPendingDoctors] = useState([]);
    const [approvedDoctors, setApprovedDoctors] = useState([]);
    const [stats, setStats] = useState(null);
    const [doctors, setDoctors] = useState([]);
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        if (activeSection === 'pending') {
            fetchPendingDoctors();
        } else if (activeSection === 'approved') {
            fetchApprovedDoctors();
        } else if (activeSection === 'overview') {
            fetchStats();
        } else if (activeSection === 'reviews') {
            fetchAllDoctors();
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

    const fetchStats = async () => {
        try {
            setLoading(true);
            const res = await api.get('/admin/stats');
            setStats(res.data);
            setError('');
        } catch (err) {
            console.error('Failed to fetch stats:', err);
            setError('Failed to load dashboard statistics.');
        } finally {
            setLoading(false);
        }
    };

    const fetchAllDoctors = async () => {
        try {
            setLoading(true);
            const res = await api.get('/admin/doctors');
            setDoctors(res.data);
            setError('');
        } catch (err) {
            console.error('Failed to fetch doctors:', err);
            setError('Failed to load doctors list.');
        } finally {
            setLoading(false);
        }
    };

    const fetchReviewsForDoctor = async (doctorId) => {
        try {
            const res = await api.get(`/admin/doctors/${doctorId}/reviews`);
            setReviews(res.data);
        } catch (err) {
            console.error('Failed to fetch reviews:', err);
            alert('Failed to load reviews for this doctor.');
        }
    };

    const handleDeleteReview = async (reviewId) => {
        const confirmDelete = window.confirm('Are you sure you want to delete this review?');
        if (!confirmDelete) return;

        try {
            await api.delete(`/admin/reviews/${reviewId}`);
            setReviews(reviews.filter(r => r._id !== reviewId));
        } catch (err) {
            console.error('Error deleting review:', err);
            alert('Failed to delete review');
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
        if (activeSection === 'overview') {
            return (
                <div className="admin-content-area">
                    <h2 className="admin-section-title">Dashboard Overview</h2>
                    {error && <p style={{ color: 'red' }}>{error}</p>}
                    {loading && !stats ? (
                        <p>Loading statistics...</p>
                    ) : stats ? (
                        <>
                            <div className="stats-grid">
                                <div className="stat-card">
                                    <div className="stat-card-title">Total Doctors</div>
                                    <div className="stat-card-value">{stats.total_doctors}</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-card-title">Approved Doctors</div>
                                    <div className="stat-card-value">{stats.approved_doctors}</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-card-title">Pending Approvals</div>
                                    <div className="stat-card-value">{stats.pending_doctors}</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-card-title">Total Patients</div>
                                    <div className="stat-card-value">{stats.total_patients}</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-card-title">Total Appointments</div>
                                    <div className="stat-card-value">{stats.total_appointments}</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-card-title">Completed Consultations</div>
                                    <div className="stat-card-value">{stats.completed_appointments}</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-card-title">Total Reviews</div>
                                    <div className="stat-card-value">{stats.total_reviews}</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-card-title">Average Rating</div>
                                    <div className="stat-card-value">{stats.average_rating} ⭐</div>
                                </div>
                            </div>

                            <div className="recent-activity-section">
                                <h3>Recent Activity</h3>
                                {stats.recent_activity && stats.recent_activity.length > 0 ? (
                                    <ul className="recent-activity-list">
                                        {stats.recent_activity.map((activity, index) => (
                                            <li key={index}>{activity}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p style={{ color: '#718096' }}>No recent activity to display.</p>
                                )}
                            </div>
                        </>
                    ) : null}
                </div>
            );
        }

        if (activeSection === 'reviews') {
            return (
                <div className="admin-content-area">
                    <h2 className="admin-section-title">Doctor Reviews</h2>
                    {error && <p style={{ color: 'red' }}>{error}</p>}
                    <div className="reviews-layout">
                        <div className="reviews-doctor-list">
                            <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Select a Doctor</h3>
                            {loading && doctors.length === 0 ? (
                                <p>Loading doctors...</p>
                            ) : doctors.length === 0 ? (
                                <p>No doctors found.</p>
                            ) : (
                                doctors.map(doc => (
                                    <div
                                        key={doc._id}
                                        className={`reviews-doctor-item ${selectedDoctor?._id === doc._id ? 'active' : ''}`}
                                        onClick={() => {
                                            setSelectedDoctor(doc);
                                            fetchReviewsForDoctor(doc._id);
                                        }}
                                    >
                                        <h4>{doc.name}</h4>
                                        <p>{doc.specialization || 'General'}</p>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="reviews-content">
                            {!selectedDoctor ? (
                                <div className="empty-state">
                                    <p>Select a doctor from the list to view their reviews.</p>
                                </div>
                            ) : (
                                <>
                                    <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Reviews for {selectedDoctor.name}</h3>
                                    {reviews.length === 0 ? (
                                        <p>No reviews yet for this doctor.</p>
                                    ) : (
                                        reviews.map(review => (
                                            <div key={review._id} className="review-card">
                                                <div className="review-card-header">
                                                    <div className="review-rating">
                                                        {'⭐'.repeat(review.rating)}
                                                    </div>
                                                </div>
                                                <div className="review-comment">
                                                    "{review.comment}"
                                                </div>
                                                <button
                                                    className="btn-delete-review"
                                                    onClick={() => handleDeleteReview(review._id)}
                                                >
                                                    Delete Review
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </>
                            )}
                        </div>
                    </div>
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
                        className={`admin-sidebar-item ${activeSection === 'reviews' ? 'active' : ''}`}
                        onClick={() => setActiveSection('reviews')}
                    >
                        Doctor Reviews
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
