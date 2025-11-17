// Shared helper for accessing Replit Auth user in non-React contexts
// Populated by AuthProvider in auth-context.tsx

type ReplitUser = {
  id: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  uid: string; // Alias for compatibility
};

let currentUser: ReplitUser | null = null;

export function setCurrentUser(user: ReplitUser | null) {
  currentUser = user;
}

export function getCurrentUser(): ReplitUser | null {
  return currentUser;
}
