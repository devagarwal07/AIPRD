import mongoose, { Schema } from 'mongoose';
const IntegrationConfigSchema = new Schema({
    userId: { type: String, required: true },
    jiraBaseUrl: String,
    jiraProjectHint: String,
    jiraProjectKey: String,
    linearWorkspace: String,
    linearTeamHint: String
}, { timestamps: true });
IntegrationConfigSchema.index({ userId: 1 }, { unique: true });
export const IntegrationConfig = mongoose.model('IntegrationConfig', IntegrationConfigSchema);
