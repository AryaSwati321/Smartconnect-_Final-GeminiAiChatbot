const mongoose = require('mongoose');

const ServiceCategorySchema = new mongoose.Schema({
  name: String,
  keywords: [String]
});

ServiceCategorySchema.index({ name: 'text', keywords: 'text' });

module.exports = mongoose.model('ServiceCategory', ServiceCategorySchema);
