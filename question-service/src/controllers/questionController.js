const Question = require('../models/Question');

// POST /api/questions
exports.createQuestion = async (req, res) => {
  try {
    const question = await Question.create(req.body);
    res.status(201).json(question);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// GET /api/questions?subject=&chapter=&difficulty=&type=&search=&page=&limit=
exports.getQuestions = async (req, res) => {
  try {
    const { subject, chapter, difficulty, type, search, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (subject) filter.subject = subject;
    if (chapter) filter.chapter = chapter;
    if (difficulty) filter.difficulty = difficulty;
    if (type) filter.type = type;
    if (search) filter.$text = { $search: search };

    const numericPage = Math.max(Number(page) || 1, 1);
    const numericLimit = Math.min(Number(limit) || 20, 100);
    const skip = (numericPage - 1) * numericLimit;

    const [items, total] = await Promise.all([
      Question.find(filter).skip(skip).limit(numericLimit).sort({ createdAt: -1 }),
      Question.countDocuments(filter),
    ]);

    res.json({ total, page: numericPage, limit: numericLimit, items });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// GET /api/questions/:id
exports.getQuestionById = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) return res.status(404).json({ error: 'Question introuvable' });
    res.json(question);
  } catch (err) {
    res.status(400).json({ error: 'Identifiant invalide' });
  }
};

// PUT /api/questions/:id
exports.updateQuestion = async (req, res) => {
  try {
    const question = await Question.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!question) return res.status(404).json({ error: 'Question introuvable' });
    res.json(question);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// DELETE /api/questions/:id
exports.deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.id);
    if (!question) return res.status(404).json({ error: 'Question introuvable' });
    res.status(204).send();
  } catch (err) {
    res.status(400).json({ error: 'Identifiant invalide' });
  }
};
