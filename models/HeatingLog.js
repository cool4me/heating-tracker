const mongoose = require('mongoose');

const heatingLogSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  fuelType: {
    type: String,
    enum: ['Πετρέλαιο', 'Πέλλετ', 'Ξύλα', 'Άλλο'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  unit: {
    type: String,
    enum: ['λίτρα', 'σακιά (15kg)', 'κιλά', 'm³'],
    required: true
  },
  unitPrice: {
    type: Number,
    default: 0
  },
  totalCost: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    trim: true
  }
}, { timestamps: true });

// Υπολογισμός συνολικού κόστους πριν την αποθήκευση
heatingLogSchema.pre('save', function(next) {
  this.totalCost = (this.amount || 0) * (this.unitPrice || 0);
  next();
});

module.exports = mongoose.model('HeatingLog', heatingLogSchema);