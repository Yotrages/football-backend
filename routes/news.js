const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const newsService = require('../services/newsService');

// Multer — store uploads in memory for Cloudinary streaming
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, '/tmp'),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only JPEG, PNG and WebP images are allowed'), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// ─── PUBLIC ROUTES ───────────────────────────────────────────────────────────

/**
 * GET /api/news
 * List published articles. Supports: page, limit, category, tag, featured, search
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 12, category, tag, featured, search } = req.query;
    const result = await newsService.getAll({
      page: parseInt(page),
      limit: parseInt(limit),
      category,
      tag,
      featured,
      search,
    });
    res.json(result);
  } catch (err) {
    console.error('GET /api/news error:', err.message);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

/**
 * GET /api/news/latest
 * Returns latest 6 published articles (for homepage widget)
 */
router.get('/latest', async (req, res) => {
  try {
    const { limit = 6 } = req.query;
    const articles = await newsService.getLatest(parseInt(limit));
    res.json({ articles });
  } catch (err) {
    console.error('GET /api/news/latest error:', err.message);
    res.status(500).json({ error: 'Failed to fetch latest news' });
  }
});

/**
 * GET /api/news/featured
 * Returns featured articles
 */
router.get('/featured', async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    const articles = await newsService.getFeatured(parseInt(limit));
    res.json({ articles });
  } catch (err) {
    console.error('GET /api/news/featured error:', err.message);
    res.status(500).json({ error: 'Failed to fetch featured news' });
  }
});

/**
 * GET /api/news/categories
 * Returns all categories with counts
 */
router.get('/categories', async (req, res) => {
  try {
    const categories = await newsService.getCategories();
    res.json({ categories });
  } catch (err) {
    console.error('GET /api/news/categories error:', err.message);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

/**
 * GET /api/news/admin
 * Returns all articles including drafts (admin)
 */
router.get('/admin', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, category } = req.query;
    const result = await newsService.getAllAdmin({
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      category,
    });
    res.json(result);
  } catch (err) {
    console.error('GET /api/news/admin error:', err.message);
    res.status(500).json({ error: 'Failed to fetch admin news' });
  }
});

/**
 * GET /api/news/:slug
 * Get a single article by slug + related articles
 */
router.get('/:slug', async (req, res) => {
  try {
    const article = await newsService.getBySlug(req.params.slug);
    if (!article) return res.status(404).json({ error: 'Article not found' });

    const related = await newsService.getRelated(article._id, article.category);
    res.json({ article, related });
  } catch (err) {
    console.error('GET /api/news/:slug error:', err.message);
    res.status(500).json({ error: 'Failed to fetch article' });
  }
});

// ─── WRITE ROUTES ─────────────────────────────────────────────────────────────

/**
 * POST /api/news
 * Create a new article (with optional image upload)
 */
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const article = await newsService.create(req.body, req.file || null);
    res.status(201).json({ article, message: `Article ${article.status === 'published' ? 'published' : 'saved as draft'}` });
  } catch (err) {
    console.error('POST /api/news error:', err.message);
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    res.status(500).json({ error: err.message || 'Failed to create article' });
  }
});

/**
 * PUT /api/news/:id
 * Update an existing article
 */
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const article = await newsService.update(req.params.id, req.body, req.file || null);
    res.json({ article, message: 'Article updated successfully' });
  } catch (err) {
    console.error('PUT /api/news/:id error:', err.message);
    if (err.message === 'Article not found') return res.status(404).json({ error: err.message });
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    res.status(500).json({ error: 'Failed to update article' });
  }
});

/**
 * DELETE /api/news/:id
 * Delete an article
 */
router.delete('/:id', async (req, res) => {
  try {
    const result = await newsService.delete(req.params.id);
    res.json(result);
  } catch (err) {
    console.error('DELETE /api/news/:id error:', err.message);
    if (err.message === 'Article not found') return res.status(404).json({ error: err.message });
    res.status(500).json({ error: 'Failed to delete article' });
  }
});

module.exports = router;
