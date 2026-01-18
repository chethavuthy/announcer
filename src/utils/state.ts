// Simple in-memory state store for admin message updates
// In production, consider using Redis or database for persistence

interface WaitingState {
  state: string; // Format: "config_type:group_id"
  timestamp: number;
}

const waitingStates = new Map<number, WaitingState>();

const TIMEOUT = 5 * 60 * 1000; // 5 minutes

export const StateManager = {
  setWaiting: (userId: number, state: string): void => {
    waitingStates.set(userId, { state, timestamp: Date.now() });
  },

  getWaiting: (userId: number): string | null => {
    const data = waitingStates.get(userId);
    if (!data) return null;
    
    // Check timeout
    if (Date.now() - data.timestamp > TIMEOUT) {
      waitingStates.delete(userId);
      return null;
    }
    
    return data.state;
  },

  clearWaiting: (userId: number): void => {
    waitingStates.delete(userId);
  },

  isWaiting(userId: number): boolean {
    const data = waitingStates.get(userId);
    if (!data) return false;
    
    // Check timeout
    if (Date.now() - data.timestamp > TIMEOUT) {
      waitingStates.delete(userId);
      return false;
    }
    
    return true;
  },
};
