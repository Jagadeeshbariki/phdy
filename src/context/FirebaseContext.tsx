import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db, testConnection } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface FirebaseContextType {
  user: User | null;
  role: string | null;
  loading: boolean;
  isAdmin: boolean;
  isTreasurer: boolean;
}

const FirebaseContext = createContext<FirebaseContextType>({
  user: null,
  role: null,
  loading: true,
  isAdmin: false,
  isTreasurer: false,
});

export const useFirebase = () => useContext(FirebaseContext);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    testConnection();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user && user.email) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.email));
          if (userDoc.exists()) {
            setRole(userDoc.data().role);
          } else if (user.email?.toLowerCase() === 'vyomanautjagadeesh@gmail.com') {
            setRole('admin');
          } else {
            setRole('user');
          }
        } catch (e) {
          console.error("Error fetching user role:", e);
          if (user.email?.toLowerCase() === 'vyomanautjagadeesh@gmail.com') {
            setRole('admin');
          } else {
            setRole('user');
          }
        }
      } else {
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const isAdmin = role === 'admin';
  const isTreasurer = role === 'treasurer' || isAdmin;

  return (
    <FirebaseContext.Provider value={{ user, role, loading, isAdmin, isTreasurer }}>
      {children}
    </FirebaseContext.Provider>
  );
};
