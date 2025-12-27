'use client';

import { useState, useEffect } from 'react';
import { getFirebaseAuth, getFirebaseFirestore } from '@/lib/firebase';
import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { Room } from '@/types/shachiku-jinro';
import Lobby from '@/components/shachiku-jinro/Lobby';
import Dashboard from '@/components/shachiku-jinro/Dashboard';

export default function ShachikuJinroPage() {
  const [user, setUser] = useState<User | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);

  // Authentication
  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setLoading(false);
      return;
    }
    
    // すでにログインしているか確認
    if (auth.currentUser) {
      setUser(auth.currentUser);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        setLoading(false);
      } else {
        signInAnonymously(auth)
          .then((cred) => setUser(cred.user))
          .catch((e) => {
            console.error("Auth error:", e);
            setLoading(false);
          });
      }
    });
    return () => unsubscribe();
  }, []);

  // Room Listener
  useEffect(() => {
    if (!user || !roomId) return;

    const db = getFirebaseFirestore();
    if (!db) return;

    const unsub = onSnapshot(doc(db, 'shachiku_rooms', roomId), (doc) => {
      if (doc.exists()) {
        setRoom(doc.data() as Room);
      } else {
        // Room might have been deleted or invalid ID
        setRoom(null);
      }
    });

    return () => unsub();
  }, [user, roomId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 text-gray-600">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {!room || room.phase === 'LOBBY' ? (
        <Lobby
          user={user}
          currentRoomId={roomId}
          setRoomId={setRoomId}
          room={room}
        />
      ) : (
        <Dashboard
          user={user}
          room={room}
        />
      )}
    </div>
  );
}
