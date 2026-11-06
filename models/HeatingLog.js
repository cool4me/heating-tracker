const mongoose = require('mongoose');

const heatingLogSchema = new mongoose.Schema({
    date: { type: Date, required: true },
    unit: { type: String, required: true },
    amount: { type: Number, default: 0 },
    unitPrice: { type: Number, default: 0 },
    totalCost: { type: Number, default: 0 },
    notes: { type: String, default: '' },
    
    // Ειδικά πεδία για τα Ξύλα (Έξοδα)
    vehicle: { type: String, default: '' },
    gasVitara: { type: Number, default: 0 },
    gasChainsaw: { type: Number, default: 0 },
    oilChainsaw: { type: Number, default: 0 },
    oilMix: { type: Number, default: 0 },
    accessories: { type: Number, default: 0 },

    // Ειδικό πεδίο για Ξύλα (Κατανάλωση)
    fillFrequency: { type: String, default: '' }
});

module.exports = mongoose.model('HeatingLog', heatingLogSchema);