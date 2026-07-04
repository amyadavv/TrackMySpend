import mongoose from 'mongoose';

const VALID_CATEGORIES = [
  'Food',
  'Utilities',
  'Entertainment',
  'Transport',
  'Housing',
  'Health',
  'Education',
  'Others',
];

const expenseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [1, 'Amount must be at least 1 cent'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: VALID_CATEGORIES,
        message: '{VALUE} is not a valid category',
      },
    },
    description: {
      type: String,
      default: '',
      maxlength: [255, 'Description cannot exceed 255 characters'],
    },
    date: {
      type: String, // stored as YYYY-MM-DD to match existing API contract
      required: [true, 'Date is required'],
    },
    idempotencyKey: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

// Compound index for fast per-user queries sorted by date
expenseSchema.index({ userId: 1, date: -1 });

// Sparse index on idempotencyKey for fast duplicate lookups
// (only indexes documents where the field is not null)
expenseSchema.index({ userId: 1, idempotencyKey: 1 }, { sparse: true });

const Expense = mongoose.model('Expense', expenseSchema);
export { VALID_CATEGORIES };
export default Expense;
