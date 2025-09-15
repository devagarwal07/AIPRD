import mongoose, { Schema } from 'mongoose';
const SnapshotSchema = new Schema({
    prdId: { type: Schema.Types.ObjectId, ref: 'PRD', required: true },
    note: { type: String },
    formData: { type: Schema.Types.Mixed, required: true },
    sections: { type: Schema.Types.Mixed, required: true },
    templateId: { type: String }
}, { timestamps: { createdAt: true, updatedAt: false } });
export const Snapshot = mongoose.model('Snapshot', SnapshotSchema);
