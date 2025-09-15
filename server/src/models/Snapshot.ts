import mongoose, { Schema, Document } from 'mongoose';

export interface ISnapshot extends Document {
    prdId: mongoose.Types.ObjectId;
    note?: string;
    formData: any; // Keep flexible
    sections: any;
    templateId?: string;
    compressed?: boolean;
    schemaVersion: number;
    createdAt: Date;
}

const SnapshotSchema = new Schema<ISnapshot>({
    prdId: { type: Schema.Types.ObjectId, ref: 'PRD', required: true },
    note: { type: String },
    formData: { type: Schema.Types.Mixed, required: true },
    sections: { type: Schema.Types.Mixed, required: true },
    templateId: { type: String },
    compressed: { type: Boolean, default: false },
    schemaVersion: { type: Number, default: 1 }
}, { timestamps: { createdAt: true, updatedAt: false } });

export const Snapshot = mongoose.model<ISnapshot>('Snapshot', SnapshotSchema);
