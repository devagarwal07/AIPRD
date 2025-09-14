import mongoose, { Schema, Document } from 'mongoose';

export interface ISnapshot extends Document {
    prdId: mongoose.Types.ObjectId;
    note?: string;
    formData: any; // Keep flexible
    sections: any;
    templateId?: string;
    createdAt: Date;
}

const SnapshotSchema = new Schema<ISnapshot>({
    prdId: { type: Schema.Types.ObjectId, ref: 'PRD', required: true },
    note: { type: String },
    formData: { type: Schema.Types.Mixed, required: true },
    sections: { type: Schema.Types.Mixed, required: true },
    templateId: { type: String }
}, { timestamps: { createdAt: true, updatedAt: false } });

export const Snapshot = mongoose.model<ISnapshot>('Snapshot', SnapshotSchema);
