import React, { createContext, useState, useEffect, useContext } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { ref, onValue } from 'firebase/database';
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
    let unsubscribeProfile: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Use onValue instead of get to react immediately when RegisterScreen creates the profile
        const profileRef = ref(db, `kabutech/users/${firebaseUser.uid}`);
        unsubscribeProfile = onValue(profileRef, (snapshot) => {
          const userProfile = snapshot.val();
          
          setUser(firebaseUser);
          if (userProfile) {
            setProfile(userProfile);
          } else {
            setProfile(null);
          }
          setIsLoading(false);
        }, (error) => {
          console.error("Error fetching user profile:", error);
          setUser(null);
          setProfile(null);
          setIsLoading(false);
        });
      } else {
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = undefined;
        }
        setUser(null);
        setProfile(null);
        setIsLoading(false);
      }
    });

    return () => {
      if (unsubscribeProfile) unsubscribeProfile();
      unsubscribeAuth();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
