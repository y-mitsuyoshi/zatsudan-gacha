import { useState, useEffect } from 'react';

const isServer = typeof window === 'undefined';

function useStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
    const [storedValue, setStoredValue] = useState<T>(() => {
        if (isServer) {
            return initialValue;
        }
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(error);
            return initialValue;
        }
    });

    useEffect(() => {
        if (!isServer) {
            try {
                const valueToStore = storedValue instanceof Function ? storedValue(storedValue) : storedValue;
                window.localStorage.setItem(key, JSON.stringify(valueToStore));
            } catch (error) {
                console.error(error);
            }
        }
    }, [key, storedValue]);

    return [storedValue, setStoredValue];
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
