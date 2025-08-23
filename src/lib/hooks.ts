import { useState, useEffect } from 'react';

const isServer = typeof window === 'undefined';

function useStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
    const [storedValue, setStoredValue] = useState<T>(initialValue);

    useEffect(() => {
        if (isServer) {
            return;
        }
        try {
            const item = window.localStorage.getItem(key);
            if (item) {
                setStoredValue(JSON.parse(item));
            }
        } catch (error) {
            console.error(error);
        }
    }, [key]);

    const setValue = (value: T | ((val: T) => T)) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            if (!isServer) {
                window.localStorage.setItem(key, JSON.stringify(valueToStore));
            }
        } catch (error) {
            console.error(error);
        }
    };

    return [storedValue, setValue];
}


export const useFavorites = () => {
    const [favorites, setFavorites] = useStorage<string[]>('favorites', []);

    const toggleFavorite = (theme: string) => {
        setFavorites(prevFavorites =>
            prevFavorites.includes(theme)
                ? prevFavorites.filter(f => f !== theme)
                : [...prevFavorites, theme]
        );
    };

    return { favorites, toggleFavorite };
};

export const useHistory = () => {
    const [history, setHistory] = useStorage<string[]>('history', []);

    const addHistory = (theme: string) => {
        setHistory(prevHistory => {
            const newHistory = [theme, ...prevHistory.filter(h => h !== theme)];
            return newHistory.slice(0, 50); // 履歴は最新50件まで
        });
    };

    return { history, addHistory };
};
