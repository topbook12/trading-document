import { Timestamp } from 'firebase/firestore';

export type Streak = 'losing' | 'winning' | 'none';
export type MarketCondition = 'buy-side' | 'sell-side' | 'ranging' | 'choppy';

export interface JournalEntry {
  id?: string;
  userId: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  title: string;
  notes: string;
  streak: Streak;
  marketCondition: MarketCondition;
  expectationFulfilled: boolean;
  tags: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
