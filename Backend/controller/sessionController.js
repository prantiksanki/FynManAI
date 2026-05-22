const { nanoid } = require('nanoid');
const Session = require('../models/Session');

// POST /api/sessions — create a new session
async function createSession(req, res) {
  try {
    const { userId, title } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const sessionId = nanoid(12);
    const session = await Session.create({
      sessionId,
      userId,
      title: title || 'Untitled',
      prompts: [],
    });

    res.status(201).json({ sessionId: session.sessionId, _id: session._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/sessions?userId=xxx — list sessions for a user
async function listSessions(req, res) {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const sessions = await Session.find({ userId })
      .sort({ updatedAt: -1 })
      .select('sessionId title createdAt updatedAt prompts')
      .lean();

    const result = sessions.map(s => ({
      sessionId:   s.sessionId,
      title:       s.title,
      createdAt:   s.createdAt,
      updatedAt:   s.updatedAt,
      promptCount: s.prompts?.length || 0,
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/sessions/:sessionId — get full session with prompts+timelines
async function getSession(req, res) {
  try {
    const session = await Session.findOne({ sessionId: req.params.sessionId }).lean();
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// PUT /api/sessions/:sessionId — add a prompt+timeline or update title
async function updateSession(req, res) {
  try {
    const { title, prompt, timeline, yOffset } = req.body;
    const update = { updatedAt: new Date() };
    const ops = { $set: update };

    if (title) update.title = title;

    if (prompt && timeline) {
      ops.$push = {
        prompts: { prompt, timeline, yOffset: yOffset ?? 0, createdAt: new Date() },
      };
    }

    const session = await Session.findOneAndUpdate(
      { sessionId: req.params.sessionId },
      ops,
      { new: true }
    );

    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// DELETE /api/sessions/:sessionId
async function deleteSession(req, res) {
  try {
    await Session.deleteOne({ sessionId: req.params.sessionId });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// PUT /api/sessions/:sessionId/snapshot
async function saveSnapshot(req, res) {
  try {
    const { snapshot } = req.body;
    if (!snapshot) return res.status(400).json({ error: 'snapshot required' });
    const session = await Session.findOneAndUpdate(
      { sessionId: req.params.sessionId },
      { $set: { canvasSnapshot: snapshot, updatedAt: new Date() } },
      { new: true }
    );
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { createSession, listSessions, getSession, updateSession, deleteSession, saveSnapshot };
