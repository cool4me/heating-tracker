const mongoose = require('mongoose');

const heatingLogSchema = new mongoose.Schema({
    date: { type: Date, default: Date.now },
    amount: { type: Number, required: true },
    unit: { type: String, required: true },
    unitPrice: { type: Number, default: 0 },
    totalCost: { type: Number, default: 0 },
    notes: { type: String },
    // Επιπλέον αναλυτικά έξοδα για τα ξύλα
    vitaraGas: { type: Number, default: 0 },
    chainsawGas: { type: Number, default: 0 },
    chainOil: { type: Number, default: 0 },
    mixOil: { type: Number, default: 0 },
    accessoriesCost: { type: Number, default: 0 },
    accessoriesNote: { type: String, default: '' }
});

module.exports = mongoose.model('HeatingLog', heatingLogSchema);