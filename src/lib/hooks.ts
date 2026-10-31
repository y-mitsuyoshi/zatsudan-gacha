import { useCallback, useRef, useSyncExternalStore } from 'react';

const storageCache = new Map<string, unknown>();
const storageListeners = new Map<string, Set<() => void>>();

function readStorage<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined') {
        return fallback;
    }

    try {
        const item = window.localStorage.getItem(key);
        if (!item) {
            return fallback;
        }

        const parsed: unknown = JSON.parse(item);
        if (Array.isArray(fallback)) {
            return (Array.isArray(parsed)
                ? parsed.filter((value): value is string => typeof value === 'string')
                : fallback) as T;
        }

        return parsed as T;
    } catch (error) {
        console.error(error);
        return fallback;
    }
}

function getStorageSnapshot<T>(key: string, fallback: T): T {
    if (!storageCache.has(key)) {
        storageCache.set(key, readStorage(key, fallback));
    }
    return storageCache.get(key) as T;
}

function notifyStorageListeners(key: string) {
    storageListeners.get(key)?.forEach((listener) => listener());
}

function subscribeStorage(key: string, listener: () => void) {
    if (typeof window === 'undefined') {
        return () => {};
    }

    let listeners = storageListeners.get(key);
    if (!listeners) {
        listeners = new Set();
        storageListeners.set(key, listeners);
    }
    listeners.add(listener);

    const handleStorage = (event: StorageEvent) => {
        if (event.key === key || event.key === null) {
            storageCache.delete(key);
            listener();
        }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
        listeners?.delete(listener);
        window.removeEventListener('storage', handleStorage);
        if (listeners?.size === 0) {
            storageListeners.delete(key);
        }
    };
}

function writeStorage<T>(key: string, value: T) {
    storageCache.set(key, value);

    if (typeof window !== 'undefined') {
        try {
            window.localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error(error);
        }
    }

    notifyStorageListeners(key);
}

function useStorage<T>(key: string, initialValue: T) {
    const fallbackRef = useRef(initialValue);

    const subscribe = useCallback(
        (listener: () => void) => subscribeStorage(key, listener),
        [key]
    );
    const getSnapshot = useCallback(
        () => getStorageSnapshot(key, fallbackRef.current),
        [key]
    );

    const value = useSyncExternalStore(
        subscribe,
        getSnapshot,
        () => fallbackRef.current
    );

    const setValue = useCallback((nextValue: T | ((previous: T) => T)) => {
        const currentValue = getStorageSnapshot(key, fallbackRef.current);
        const valueToStore = typeof nextValue === 'function'
            ? (nextValue as (previous: T) => T)(currentValue)
            : nextValue;
        writeStorage(key, valueToStore);
    }, [key]);

    return [value, setValue] as const;
}

export const useFavorites = () => {
    const [favorites, setFavorites] = useStorage<string[]>('favorites', []);

    const toggleFavorite = useCallback((theme: string) => {
        setFavorites((currentFavorites) =>
            currentFavorites.includes(theme)
                ? currentFavorites.filter((favorite) => favorite !== theme)
                : [...currentFavorites, theme]
        );
    }, [setFavorites]);

    const clearFavorites = useCallback(() => {
        setFavorites([]);
    }, [setFavorites]);

    return { favorites, toggleFavorite, clearFavorites };
};

export const useHistory = () => {
    const [history, setHistory] = useStorage<string[]>('history', []);

    const addHistory = useCallback((theme: string) => {
        setHistory((currentHistory) => {
            const newHistory = [theme, ...currentHistory.filter((item) => item !== theme)];
            return newHistory.slice(0, 10);
        });
    }, [setHistory]);

    const clearHistory = useCallback(() => {
        setHistory([]);
    }, [setHistory]);

    return { history, addHistory, clearHistory };
};
