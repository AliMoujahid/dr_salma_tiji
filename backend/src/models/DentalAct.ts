import mongoose, { Schema, Document } from 'mongoose';

export interface IDentalAct extends Document {
  code: string;
  name: string;
  category: string;
  defaultPrice: number;
  description?: string;
  isFavorite: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DentalActSchema: Schema = new Schema(
  {
    code: { type: String, trim: true },
    name: { type: String, required: true, trim: true, index: true },
    category: {
      type: String,
      required: true,
      default: 'Soins Conservateurs',
      index: true,
    },
    defaultPrice: { type: Number, required: true, min: 0, default: 0 },
    description: { type: String, trim: true },
    isFavorite: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<IDentalAct>('DentalAct', DentalActSchema);
