import mongoose, { Schema, Document } from 'mongoose';

export interface IIntegrationConfig extends Document {
  userId: string; // placeholder until auth added
  jiraBaseUrl?: string;
  jiraProjectHint?: string;
  jiraProjectKey?: string; // explicit project key for API usage
  linearWorkspace?: string;
  linearTeamHint?: string;
  createdAt: Date;
  updatedAt: Date;
}

const IntegrationConfigSchema = new Schema<IIntegrationConfig>({
  userId: { type: String, required: true },
  jiraBaseUrl: String,
  jiraProjectHint: String,
  jiraProjectKey: String,
  linearWorkspace: String,
  linearTeamHint: String
}, { timestamps: true });

IntegrationConfigSchema.index({ userId: 1 }, { unique: true });

export const IntegrationConfig = mongoose.model<IIntegrationConfig>('IntegrationConfig', IntegrationConfigSchema);
