import { v4 as uuidv4 } from 'uuid';
import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_ID_KEY = 'suntrace_user_id';
const ANON_ID_KEY = 'suntrace_anon_id';

export interface UserIdentity {
  userId?: string;
  anonymousId: string;
  isAnonymous: boolean;
}

export class UserIdentifier {
  private userIdentity: UserIdentity | null = null;
  private initialized = false;

  /**
   * Initialize the user identifier, loading from storage if available
   */
  async initialize(): Promise<UserIdentity> {
    if (this.initialized && this.userIdentity) {
      return this.userIdentity;
    }

    try {
      const storedUserId = await AsyncStorage.getItem(USER_ID_KEY);
      const storedAnonId = await AsyncStorage.getItem(ANON_ID_KEY);

      let userId: string | undefined = storedUserId || undefined;
      let anonymousId: string = storedAnonId || uuidv4();

      if (!storedAnonId) {
        await AsyncStorage.setItem(ANON_ID_KEY, anonymousId);
      }

      this.userIdentity = {
        userId,
        anonymousId,
        isAnonymous: !userId,
      };

      this.initialized = true;
      return this.userIdentity;
    } catch (error) {
      console.error('Error initializing user identifier:', error);
      // Fallback if storage fails
      this.userIdentity = {
        anonymousId: uuidv4(),
        isAnonymous: true,
      };
      this.initialized = true;
      return this.userIdentity;
    }
  }

  /**
   * Identify a user with an ID
   */
  async identify(userId: string): Promise<UserIdentity> {
    try {
      await AsyncStorage.setItem(USER_ID_KEY, userId);
      this.userIdentity = {
        userId,
        anonymousId: this.userIdentity?.anonymousId || uuidv4(),
        isAnonymous: false,
      };
      return this.userIdentity;
    } catch (error) {
      console.error('Error identifying user:', error);
      throw error;
    }
  }

  /**
   * Get current user identity
   */
  async getIdentity(): Promise<UserIdentity> {
    if (!this.initialized) {
      return this.initialize();
    }
    return this.userIdentity!;
  }

  /**
   * Merge two user identities
   */
  async mergeIdentities(fromUserId: string, toUserId: string): Promise<void> {
    // This would typically be handled server-side, but we provide a placeholder
    try {
      const identity = await this.getIdentity();
      if (identity.userId === fromUserId) {
        await this.identify(toUserId);
      }
    } catch (error) {
      console.error('Error merging identities:', error);
      throw error;
    }
  }

  /**
   * Clear user identity (logout)
   */
  async clear(): Promise<void> {
    try {
      await AsyncStorage.removeItem(USER_ID_KEY);
      if (this.userIdentity) {
        this.userIdentity = {
          userId: undefined,
          anonymousId: this.userIdentity.anonymousId,
          isAnonymous: true,
        };
      }
    } catch (error) {
      console.error('Error clearing user identity:', error);
      throw error;
    }
  }

  /**
   * Reset everything (for testing)
   */
  async reset(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([USER_ID_KEY, ANON_ID_KEY]);
      this.userIdentity = null;
      this.initialized = false;
    } catch (error) {
      console.error('Error resetting user identifier:', error);
    }
  }
}

// Global instance
let globalUserIdentifier: UserIdentifier | null = null;

export function getUserIdentifier(): UserIdentifier {
  if (!globalUserIdentifier) {
    globalUserIdentifier = new UserIdentifier();
  }
  return globalUserIdentifier;
}

export function resetUserIdentifier(): void {
  globalUserIdentifier = null;
}
