import React, { createContext, useState, useEffect, useContext } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { auth, db } from '../services/firebase';
import { UserProfile } from '../types/firebase';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  isLoading: true,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch user profile from database
        const profileRef = ref(db, `kabutech/users/${firebaseUser.uid}`);
        try {
          const snapshot = await get(profileRef);
          const userProfile = snapshot.val();
          
          if (userProfile && !userProfile.approved) {
            // Unapproved users cannot log in. They should be handled at the LoginScreen level,
            // but we ensure the profile is available for checking.
            setUser(firebaseUser);
            setProfile(userProfile);
          } else if (userProfile) {
            setUser(firebaseUser);
            setProfile(userProfile);
          } else {
            // Profile missing, handle dynamically or reject
            setUser(firebaseUser);
            setProfile(null);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          setUser(null);
          setProfile(null);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
