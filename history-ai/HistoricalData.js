const mongoose = require('mongoose');

const HistoricalDataSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['Nhân vật', 'Sự kiện'], required: true },
  description: { type: String, required: true },
  year: { type: Number },
  embedding: { type: [Number], default: [] },
  additionalInfo: {
    imageUrl: { type: String },   
    videoUrl: { type: String },
    aliases: { type: [String] },
    keywords: { type: [String] },
  },
}, { timestamps: true });

module.exports = mongoose.model('lich_su', HistoricalDataSchema);
