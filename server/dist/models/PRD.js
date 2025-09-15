import mongoose, { Schema } from 'mongoose';
const PRDSchema = new Schema({
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
export const PRD = mongoose.model('PRD', PRDSchema);
