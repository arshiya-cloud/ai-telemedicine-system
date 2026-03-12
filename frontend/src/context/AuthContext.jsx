import { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        const token = sessionStorage.getItem('token');
        const role = sessionStorage.getItem('role');
        const user_id = sessionStorage.getItem('user_id');
        const name = sessionStorage.getItem('name');
        if (token && role) {
            return { token, role, user_id, name };
        }
        return null;
    });

    const login = (data) => {
        sessionStorage.setItem('token', data.access_token);
        sessionStorage.setItem('role', data.role);
        sessionStorage.setItem('user_id', data.user_id);
        sessionStorage.setItem('name', data.name || 'User');
        setUser({ token: data.access_token, role: data.role, user_id: data.user_id, name: data.name || 'User' });
    };

    const logout = () => {
        sessionStorage.clear();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
