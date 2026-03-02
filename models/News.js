const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    summary: {
      type: String,
      required: [true, 'Summary is required'],
      trim: true,
      maxlength: [500, 'Summary cannot exceed 500 characters'],
    },
    // Stored as TipTap HTML — may contain <img src="https://res.cloudinary.com/...">
    content: {
      type: String,
      required: [true, 'Content is required'],
    },
    author: {
      type: String,
      required: [true, 'Author is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: [
        'Football News',
        'Transfer Updates',
        'Match Reports',
        'Player Interviews',
        'League Updates',
        'International Football',
        'Club News',
        'Opinion & Analysis',
      ],
    },
    tags: {
      type: [String],
      default: [],
    },
    // Cover image (hero) — always a Cloudinary URL or null
    imageUrl: {
      type: String,
      default: null,
    },
    imagePublicId: {
      type: String,
      default: null,
    },
    // public_ids of ALL images embedded in the content body (for cleanup on delete)
    contentImagePublicIds: {
      type: [String],
      default: [],
    },
    featured: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    views: {
      type: Number,
      default: 0,
    },
    readTime: {
      type: Number, // minutes
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Strip HTML tags from a string to get plain text for word-count.
 */
const stripHtml = (html) =>
  html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

// Auto-compute read time before saving (strips HTML first so tags aren't counted)
newsSchema.pre('save', function (next) {
  const wordsPerMinute = 200;
  const plainText = stripHtml(this.content);
  const wordCount = plainText ? plainText.split(/\s+/).filter(Boolean).length : 0;
  this.readTime = Math.max(1, Math.ceil(wordCount / wordsPerMinute));
  next();
});

// Also recompute on findOneAndUpdate
newsSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();
  if (update && update.content) {
    const wordsPerMinute = 200;
    const plainText = stripHtml(update.content);
    const wordCount = plainText ? plainText.split(/\s+/).filter(Boolean).length : 0;
    update.readTime = Math.max(1, Math.ceil(wordCount / wordsPerMinute));
  }
  next();
});

// Indexes for fast queries
newsSchema.index({ status: 1, publishedAt: -1 });
newsSchema.index({ category: 1, status: 1 });
newsSchema.index({ featured: 1, status: 1 });
newsSchema.index({ slug: 1 });
newsSchema.index({ tags: 1 });

module.exports = mongoose.model('News', newsSchema);
