import {useState } from 'react'

export const useAuth = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    return {
        user,
        loading,
        setUser,
        setLoading
    };
};
