import mongoose, { Schema, Document } from 'mongoose';

export interface IPRD extends Document {
  title: string;
  problem: string;
  solution: string;
  objectives: string[];
  userStories: string[];
  requirements: string[];
  sections: {
    problem: boolean;
    solution: boolean;
    objectives?: boolean;
    userStories: boolean;
    requirements: boolean;
  };
  templateId?: string;
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
  sections: {
    problem: { type: Boolean, default: true },
    solution: { type: Boolean, default: true },
    objectives: { type: Boolean, default: true },
    userStories: { type: Boolean, default: true },
    requirements: { type: Boolean, default: true }
  },
  templateId: { type: String }
}, { timestamps: true });

export const PRD = mongoose.model<IPRD>('PRD', PRDSchema);
