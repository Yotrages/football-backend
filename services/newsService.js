const News = require('../models/News');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const generateSlug = async (title, existingId = null) => {
  let base = title
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();

  let count = 0;
  let slug = base;
  while (true) {
    const q = { slug };
    if (existingId) q._id = { $ne: existingId };
    if (!(await News.findOne(q))) break;
    slug = `${base}-${++count}`;
  }
  return slug;
};

/**
 * Upload a single base64 data-URI to Cloudinary and return { url, publicId }.
 */
const uploadBase64 = async (dataUri, folder = 'football-news-content') => {
  const result = await cloudinary.uploader.upload(dataUri, {
    folder,
    transformation: [{ width: 1200, crop: 'limit', quality: 'auto', fetch_format: 'auto' }],
  });
  return { url: result.secure_url, publicId: result.public_id };
};

/**
 * Scan HTML content for base64 <img src="data:..."> tags,
 * upload each one to Cloudinary, replace the src in-place, and
 * return { processedHtml, uploadedPublicIds[] }.
 *
 * This keeps the stored HTML clean (real URLs only) and avoids
 * bloating MongoDB with huge base64 strings.
 */
const processContentImages = async (html) => {
  if (!html) return { processedHtml: html, uploadedPublicIds: [] };

  const uploadedPublicIds = [];
  // Match <img ... src="data:image/...;base64,..." ...>
  const base64Regex = /(<img[^>]+src=")data:image\/[^;]+;base64,[^"]+("[^>]*>)/gi;

  const matches = [];
  let m;
  // Collect all matches first (can't await inside replace directly)
  const regex2 = /src="(data:image\/[^;]+;base64,[^"]+)"/gi;
  let match;
  while ((match = regex2.exec(html)) !== null) {
    matches.push({ fullMatch: match[0], dataUri: match[1], index: match.index });
  }

  if (matches.length === 0) return { processedHtml: html, uploadedPublicIds };

  // Upload all base64 images in parallel
  const uploads = await Promise.all(
    matches.map(({ dataUri }) => uploadBase64(dataUri).catch(() => null))
  );

  // Replace in reverse order to preserve indices
  let processedHtml = html;
  for (let i = matches.length - 1; i >= 0; i--) {
    const { fullMatch, index } = matches[i];
    const upload = uploads[i];
    if (!upload) continue; // skip failed uploads — keep original
    uploadedPublicIds.push(upload.publicId);
    const replaced = fullMatch.replace(/src="data:[^"]+"/i, `src="${upload.url}"`);
    processedHtml =
      processedHtml.slice(0, index) +
      replaced +
      processedHtml.slice(index + fullMatch.length);
  }

  return { processedHtml, uploadedPublicIds };
};

// ─── Service ──────────────────────────────────────────────────────────────────

const newsService = {

  getAll: async ({ page = 1, limit = 12, category, tag, featured, search } = {}) => {
    const skip = (page - 1) * limit;
    const query = { status: 'published' };

    if (category) query.category = category;
    if (tag) query.tags = tag;
    if (featured !== undefined) query.featured = featured === 'true' || featured === true;
    if (search) {
      query.$or = [
        { title:   { $regex: search, $options: 'i' } },
        { summary: { $regex: search, $options: 'i' } },
        { tags:    { $regex: search, $options: 'i' } },
        { author:  { $regex: search, $options: 'i' } },
      ];
    }

    const [articles, total] = await Promise.all([
      News.find(query)
        .sort({ featured: -1, publishedAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-content -contentImagePublicIds'),
      News.countDocuments(query),
    ]);

    return {
      articles,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  },

  getBySlug: async (slug) => {
    const article = await News.findOneAndUpdate(
      { slug, status: 'published' },
      { $inc: { views: 1 } },
      { new: true }
    ).select('-contentImagePublicIds');
    return article;
  },

  getById: async (id) => News.findById(id),

  getRelated: async (articleId, category, limit = 3) =>
    News.find({ _id: { $ne: articleId }, category, status: 'published' })
      .sort({ publishedAt: -1 })
      .limit(limit)
      .select('title slug summary imageUrl publishedAt author category readTime'),

  getFeatured: async (limit = 5) =>
    News.find({ status: 'published', featured: true })
      .sort({ publishedAt: -1 })
      .limit(limit)
      .select('title slug summary imageUrl publishedAt author category readTime'),

  getLatest: async (limit = 6) =>
    News.find({ status: 'published' })
      .sort({ publishedAt: -1 })
      .limit(limit)
      .select('title slug summary imageUrl publishedAt author category readTime featured'),

  getCategories: async () =>
    News.aggregate([
      { $match: { status: 'published' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { category: '$_id', count: 1, _id: 0 } },
    ]),

  // ── Create ────────────────────────────────────────────────────────────────

  create: async (data, imageFile = null) => {
    // 1. Upload cover image
    let imageUrl = data.imageUrl || null;
    let imagePublicId = null;
    if (imageFile) {
      const result = await cloudinary.uploader.upload(imageFile.path, {
        folder: 'football-news-covers',
        transformation: [{ width: 1200, height: 630, crop: 'fill', quality: 'auto', fetch_format: 'auto' }],
      });
      imageUrl      = result.secure_url;
      imagePublicId = result.public_id;
    }

    // 2. Process inline base64 images in the HTML content
    const { processedHtml, uploadedPublicIds } = await processContentImages(data.content);

    const slug        = await generateSlug(data.title);
    const publishedAt = data.status === 'published' ? new Date() : null;
    const tags        = Array.isArray(data.tags)
      ? data.tags
      : (data.tags || '').split(',').map(t => t.trim()).filter(Boolean);

    const article = new News({
      ...data,
      content: processedHtml,
      slug,
      imageUrl,
      imagePublicId,
      contentImagePublicIds: uploadedPublicIds,
      publishedAt,
      tags,
    });

    return article.save();
  },

  // ── Update ────────────────────────────────────────────────────────────────

  update: async (id, data, imageFile = null) => {
    const existing = await News.findById(id);
    if (!existing) throw new Error('Article not found');

    // 1. Cover image
    let imageUrl      = data.imageUrl !== undefined ? data.imageUrl : existing.imageUrl;
    let imagePublicId = existing.imagePublicId;
    if (imageFile) {
      if (existing.imagePublicId) await cloudinary.uploader.destroy(existing.imagePublicId).catch(() => {});
      const result = await cloudinary.uploader.upload(imageFile.path, {
        folder: 'football-news-covers',
        transformation: [{ width: 1200, height: 630, crop: 'fill', quality: 'auto', fetch_format: 'auto' }],
      });
      imageUrl      = result.secure_url;
      imagePublicId = result.public_id;
    }

    // 2. Content images — upload any new base64 blobs
    let contentImagePublicIds = existing.contentImagePublicIds || [];
    let processedHtml = data.content !== undefined ? data.content : existing.content;
    if (data.content) {
      const { processedHtml: ph, uploadedPublicIds } = await processContentImages(data.content);
      processedHtml = ph;
      contentImagePublicIds = [...contentImagePublicIds, ...uploadedPublicIds];

      // Cleanup: remove old content images that are no longer referenced in updated HTML
      const stillReferenced = (existing.contentImagePublicIds || []).filter(pid =>
        processedHtml.includes(pid.split('/').pop())
      );
      const toDelete = (existing.contentImagePublicIds || []).filter(pid => !stillReferenced.includes(pid));
      if (toDelete.length) {
        await Promise.all(toDelete.map(pid => cloudinary.uploader.destroy(pid).catch(() => {})));
      }
      contentImagePublicIds = [...stillReferenced, ...uploadedPublicIds];
    }

    // 3. Slug — regenerate only if title changed
    let slug = existing.slug;
    if (data.title && data.title !== existing.title) slug = await generateSlug(data.title, id);

    // 4. Publish timestamp
    let publishedAt = existing.publishedAt;
    if (data.status === 'published' && existing.status !== 'published') publishedAt = new Date();

    const tags = data.tags !== undefined
      ? (Array.isArray(data.tags) ? data.tags : data.tags.split(',').map(t => t.trim()).filter(Boolean))
      : existing.tags;

    return News.findByIdAndUpdate(
      id,
      { ...data, content: processedHtml, slug, imageUrl, imagePublicId, contentImagePublicIds, publishedAt, tags },
      { new: true, runValidators: true }
    );
  },

  // ── Delete ────────────────────────────────────────────────────────────────

  delete: async (id) => {
    const article = await News.findById(id);
    if (!article) throw new Error('Article not found');

    // Delete cover + all content images from Cloudinary
    const toDelete = [
      article.imagePublicId,
      ...(article.contentImagePublicIds || []),
    ].filter(Boolean);

    if (toDelete.length) {
      await Promise.all(toDelete.map(pid => cloudinary.uploader.destroy(pid).catch(() => {})));
    }

    await News.findByIdAndDelete(id);
    return { message: 'Article deleted successfully' };
  },

  // ── Admin ─────────────────────────────────────────────────────────────────

  getAllAdmin: async ({ page = 1, limit = 20, status, category } = {}) => {
    const skip = (page - 1) * limit;
    const query = {};
    if (status) query.status = status;
    if (category) query.category = category;

    const [articles, total] = await Promise.all([
      News.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-content -contentImagePublicIds'),
      News.countDocuments(query),
    ]);

    return {
      articles,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  },
};

module.exports = newsService;
