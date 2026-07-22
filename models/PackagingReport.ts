import mongoose, { Document, Model } from 'mongoose';

export interface IPackagingReport extends Document {
  userEmail: string;
  barcode: string;
  material: string;
  createdAt: Date;
  updatedAt: Date;
}

const PackagingReportSchema = new mongoose.Schema(
  {
    userEmail: { type: String, required: true, index: true },
    barcode: {
      type: String,
      required: true,
      validate: {
        validator: (value: string) => /^\d{8,14}$/.test(value),
        message: 'Barcode must be 8-14 digits',
      },
    },
    material: { type: String, required: true, trim: true, maxlength: 80 },
  },
  { timestamps: true }
);

PackagingReportSchema.index({ barcode: 1, userEmail: 1 });

const PackagingReport: Model<IPackagingReport> =
  (mongoose.models.PackagingReport as Model<IPackagingReport>) ||
  mongoose.model<IPackagingReport>(
    'PackagingReport',
    PackagingReportSchema
  );

export default PackagingReport;
