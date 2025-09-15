import mongoose, { Schema, Document } from 'mongoose';

export interface IPRD extends Document {
  title: string;
  problem: string;
  solution: string;
  objectives: string[];
  userStories: string[];
  requirements: string[];
  riceScores?: Array<{ id: string; name: string; reach: number; impact: number; confidence: number; effort: number; rice: number; category?: string }>;
  acceptanceCriteria?: Array<{ id: string; storyIndex: number; text: string; done: boolean }>;
  sections: {
    problem: boolean;
    solution: boolean;
    objectives?: boolean;
    userStories: boolean;
    requirements: boolean;
  };
  templateId?: string;
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

const PRDSchema = new Schema<IPRD>({
  title: { type: String, default: '' },
  problem: { type: String, default: '' },
  solution: { type: String, default: '' },
  objectives: { type: [String], default: [] },
  userStories: { type: [String], default: [] },
  requirements: { type: [String], default: [] },
  riceScores: { type: [Object], default: [] },
  acceptanceCriteria: { type: [Object], default: [] },
  sections: {
    problem: { type: Boolean, default: true },
    solution: { type: Boolean, default: true },
    objectives: { type: Boolean, default: true },
    userStories: { type: Boolean, default: true },
    requirements: { type: Boolean, default: true }
  },
  templateId: { type: String },
  schemaVersion: { type: Number, default: 1 }
}, { timestamps: true });

export const PRD = mongoose.model<IPRD>('PRD', PRDSchema);
