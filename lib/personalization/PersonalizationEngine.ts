import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserProfile {
  preferences: Record<string, any>;
  behaviors: {
    lastViewedCategories: string[];
    favoriteFeatures: string[];
    engagementScore: number;
  };
  interests: string[];
}

export interface PersonalizedContent {
  id: string;
  title: string;
  description: string;
  relevanceScore: number;
  category: string;
}

export class PersonalizationEngine {
  private static readonly PROFILE_KEY = '@everreach_user_profile';

  static async getUserProfile(): Promise<UserProfile> {
    try {
      const stored = await AsyncStorage.getItem(this.PROFILE_KEY);
      if (!stored) {
        return {
          preferences: {},
          behaviors: {
            lastViewedCategories: [],
            favoriteFeatures: [],
            engagementScore: 0,
          },
          interests: [],
        };
      }
      return JSON.parse(stored);
    } catch (error) {
      console.error('[PersonalizationEngine] Error loading profile:', error);
      return {
        preferences: {},
        behaviors: {
          lastViewedCategories: [],
          favoriteFeatures: [],
          engagementScore: 0,
        },
        interests: [],
      };
    }
  }

  static async updateUserBehavior(
    category: string,
    feature: string,
    engagement: number
  ): Promise<void> {
    try {
      const profile = await this.getUserProfile();

      // Update categories
      if (!profile.behaviors.lastViewedCategories.includes(category)) {
        profile.behaviors.lastViewedCategories.unshift(category);
        if (profile.behaviors.lastViewedCategories.length > 10) {
          profile.behaviors.lastViewedCategories.pop();
        }
      }

      // Update features
      if (!profile.behaviors.favoriteFeatures.includes(feature)) {
        profile.behaviors.favoriteFeatures.unshift(feature);
        if (profile.behaviors.favoriteFeatures.length > 5) {
          profile.behaviors.favoriteFeatures.pop();
        }
      }

      // Update engagement score (0-100)
      profile.behaviors.engagementScore = Math.min(
        100,
        profile.behaviors.engagementScore + engagement
      );

      await AsyncStorage.setItem(this.PROFILE_KEY, JSON.stringify(profile));
    } catch (error) {
      console.error('[PersonalizationEngine] Error updating behavior:', error);
    }
  }

  static async getRecommendations(
    allContent: PersonalizedContent[],
    limit: number = 5
  ): Promise<PersonalizedContent[]> {
    try {
      const profile = await this.getUserProfile();

      // Score all content based on user profile
      const scored = allContent.map(item => {
        let score = item.relevanceScore;

        // Boost score for favorite categories
        if (profile.behaviors.lastViewedCategories.includes(item.category)) {
          score += 20;
        }

        // Boost for matching interests
        const matchingInterests = profile.interests.filter(
          interest => item.description.toLowerCase().includes(interest.toLowerCase())
        ).length;
        score += matchingInterests * 15;

        return { ...item, relevanceScore: score };
      });

      // Sort by relevance and return top N
      return scored.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, limit);
    } catch (error) {
      console.error('[PersonalizationEngine] Error getting recommendations:', error);
      return allContent.slice(0, limit);
    }
  }

  static async setInterests(interests: string[]): Promise<void> {
    try {
      const profile = await this.getUserProfile();
      profile.interests = interests;
      await AsyncStorage.setItem(this.PROFILE_KEY, JSON.stringify(profile));
    } catch (error) {
      console.error('[PersonalizationEngine] Error setting interests:', error);
    }
  }
}
