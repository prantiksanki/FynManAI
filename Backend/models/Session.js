const mongoose = require('mongoose');

const promptEntrySchema = new mongoose.Schema({
  prompt:    { type: String, required: true },
  timeline:  { type: mongoose.Schema.Types.Mixed, required: true },
  yOffset:   { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

const sessionSchema = new mongoose.Schema({
  sessionId:      { type: String, required: true, unique: true, index: true },
  userId:         { type: String, required: true, index: true },
  title:          { type: String, default: 'Untitled' },
  prompts:        [promptEntrySchema],
  canvasSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Session', sessionSchema);
