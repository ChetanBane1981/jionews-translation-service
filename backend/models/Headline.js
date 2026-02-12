const mongoose = require('mongoose');

const headlineSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  link: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String
  },
  content: {
    type: String
  },
  category: {
    type: String
  },
  creator: {
    type: String
  },
  pubDate: {
    type: Date
  },
  guid: {
    type: String,
    unique: true
  },
  imageUrl: {
    type: String
  },
  isoDate: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for faster queries
headlineSchema.index({ pubDate: -1 });
headlineSchema.index({ category: 1 });

module.exports = mongoose.model('Headline', headlineSchema);
