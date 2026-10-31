require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const HeatingLog = require('./models/HeatingLog');

const app = express();

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Σύνδεση στη MongoDB επιτυχής!'))
    .catch(err => console.error('Σφάλμα σύνδεσης στη MongoDB:', err));

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get('/', async (req, res) => {
    try {
        const selectedFuel = req.query.fuel;
        const selectedYear = req.query.year;

        let filter = {};
        
        if (selectedFuel) {
            filter.unit = new RegExp(selectedFuel, 'i');
        }

        if (selectedYear) {
            const start = new Date(`${selectedYear}-01-01T00:00:00.000Z`);
            const end = new Date(`${selectedYear}-12-31T23:59:59.999Z`);
            filter.date = { $gte: start, $lte: end };
        }

        let logs = [];
        if (selectedFuel || selectedYear) {
            logs = await HeatingLog.find(filter).sort({ date: -1 });
        }
        
        let totalSpent = logs.reduce((sum, log) => sum + (log.totalCost || 0), 0);

        let yearlyFuelBreakdown = {};
        let woodTotals = {
            gasVitara: 0,
            gasChainsaw: 0,
            oilChainsaw: 0,
            oilMix: 0,
            accessories: 0,
            total: 0
        };

        if (selectedYear) {
            const yearStart = new Date(`${selectedYear}-01-01T00:00:00.000Z`);
            const yearEnd = new Date(`${selectedYear}-12-31T23:59:59.999Z`);
            const yearLogs = await HeatingLog.find({ date: { $gte: yearStart, $lte: yearEnd } });
            
            yearLogs.forEach(log => {
                const baseUnit = log.unit.replace(' (Αγορά)', '').trim();
                if (!yearlyFuelBreakdown[baseUnit]) {
                    yearlyFuelBreakdown[baseUnit] = 0;
                }
                yearlyFuelBreakdown[baseUnit] += (log.totalCost || 0);

                if (baseUnit.includes('Ξύλα')) {
                    woodTotals.gasVitara += (log.gasVitara || 0);
                    woodTotals.gasChainsaw += (log.gasChainsaw || 0);
                    woodTotals.oilChainsaw += (log.oilChainsaw || 0);
                    woodTotals.oilMix += (log.oilMix || 0);
                    woodTotals.accessories += (log.accessories || 0);
                    woodTotals.total += (log.totalCost || 0);
                }
            });
        }

        const allLogs = await HeatingLog.find({});
        const fuels = [...new Set(allLogs.map(l => l.unit.replace(' (Αγορά)', '').trim()))];
        const years = [...new Set(allLogs.map(l => new Date(l.date).getFullYear()))].filter(y => !isNaN(y)).sort((a, b) => b - a);

        res.render('index', { 
            logs, 
            totalSpent, 
            fuels, 
            years, 
            selectedFuel, 
            selectedYear,
            yearlyFuelBreakdown,
            woodTotals
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

app.get('/edit/:id', async (req, res) => {
    try {
        const log = await HeatingLog.findById(req.params.id);
        if (!log) {
            return res.status(404).send("Η εγγραφή δεν βρέθηκε.");
        }
        res.render('edit', { log });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

app.post('/edit/:id', async (req, res) => {
    try {
        const { date, unit, amount, totalCost, notes, vehicle, gasVitara, gasChainsaw, oilChainsaw, oilMix, accessories } = req.body;
        
        let finalCost = totalCost;
        if (unit.includes('Ξύλα')) {
            finalCost = (parseFloat(gasVitara) || 0) + 
                        (parseFloat(gasChainsaw) || 0) + 
                        (parseFloat(oilChainsaw) || 0) + 
                        (parseFloat(oilMix) || 0) + 
                        (parseFloat(accessories) || 0);
        }

        await HeatingLog.findByIdAndUpdate(req.params.id, {
            date: date ? new Date(date) : new Date(),
            unit,
            amount: amount || 0,
            totalCost: finalCost || 0,
            notes,
            vehicle: vehicle || '',
            gasVitara: parseFloat(gasVitara) || 0,
            gasChainsaw: parseFloat(gasChainsaw) || 0,
            oilChainsaw: parseFloat(oilChainsaw) || 0,
            oilMix: parseFloat(oilMix) || 0,
            accessories: parseFloat(accessories) || 0
        });
        res.redirect('/');
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error during update");
    }
});

app.post('/add', async (req, res) => {
    try {
        const { date, unit, amount, unitPrice, totalCost, notes, vehicle, gasVitara, gasChainsaw, oilChainsaw, oilMix, accessories } = req.body;
        
        let calculatedCost = totalCost;
        if (unit.includes('Ξύλα')) {
            calculatedCost = (parseFloat(gasVitara) || 0) + 
                             (parseFloat(gasChainsaw) || 0) + 
                             (parseFloat(oilChainsaw) || 0) + 
                             (parseFloat(oilMix) || 0) + 
                             (parseFloat(accessories) || 0);
        } else if ((!totalCost || totalCost == 0) && unitPrice && amount) {
            calculatedCost = amount * unitPrice;
        }

        const newLog = new HeatingLog({
            date: date ? new Date(date) : new Date(),
            unit,
            amount: amount || 0,
            unitPrice: unitPrice || 0,
            totalCost: calculatedCost || 0,
            notes,
            vehicle: vehicle || '',
            gasVitara: parseFloat(gasVitara) || 0,
            gasChainsaw: parseFloat(gasChainsaw) || 0,
            oilChainsaw: parseFloat(oilChainsaw) || 0,
            oilMix: parseFloat(oilMix) || 0,
            accessories: parseFloat(accessories) || 0
        });

        await newLog.save();
        res.redirect('/');
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error during add");
    }
});

app.post('/delete/:id', async (req, res) => {
    try {
        await HeatingLog.findByIdAndDelete(req.params.id);
        res.redirect('/');
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error during delete");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Ο Server τρέχει στη θύρα ${PORT}`);
});