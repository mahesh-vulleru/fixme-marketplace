import mongoose, { Schema, Document } from 'mongoose';

export interface IPartDocument extends Document {
  categoryId: mongoose.Types.ObjectId;
  brandId: mongoose.Types.ObjectId;
  partNumber: string;
  name: string;
  componentType:
    | 'left_earbud'
    | 'right_earbud'
    | 'charging_case'
    | 'battery'
    | 'charging_port'
    | 'motherboard'
    | 'display'
    | 'camera_module'
    | 'speaker_module'
    | 'other';
  description: string;
  specifications: Map<string, string>;
  oemReference?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PartSchema = new Schema<IPartDocument>(
  {
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    brandId: { type: Schema.Types.ObjectId, ref: 'Brand', required: true },
    partNumber: { type: String, required: true, unique: true, trim: true, maxlength: 80 },
    name: { type: String, required: true, trim: true, maxlength: 150 },
    componentType: {
      type: String,
      enum: [
        'left_earbud',
        'right_earbud',
        'charging_case',
        'battery',
        'charging_port',
        'motherboard',
        'display',
        'camera_module',
        'speaker_module',
        'other',
      ],
      required: true,
    },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    specifications: {
      type: Map,
      of: String,
      default: {},
    },
    oemReference: { type: String, trim: true, maxlength: 100 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

PartSchema.index({ categoryId: 1, componentType: 1 });
PartSchema.index({ name: 'text', partNumber: 'text', oemReference: 'text' });

export const PartModel = mongoose.model<IPartDocument>('Part', PartSchema);

