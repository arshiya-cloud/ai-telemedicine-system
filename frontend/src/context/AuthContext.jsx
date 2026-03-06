import { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const role = localStorage.getItem('role');
        const user_id = localStorage.getItem('user_id');
        const name = localStorage.getItem('name');
        if (token && role) {
            setUser({ token, role, user_id, name });
        }
    }, []);

    const login = (data) => {
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('role', data.role);
        localStorage.setItem('user_id', data.user_id);
        localStorage.setItem('name', data.name || 'User');
        setUser({ token: data.access_token, role: data.role, user_id: data.user_id, name: data.name || 'User' });
    };

    const logout = () => {
        localStorage.clear();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
