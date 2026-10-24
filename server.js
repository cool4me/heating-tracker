require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const HeatingLog = require('./models/HeatingLog');

const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Σύνδεση με MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Σύνδεση στη MongoDB επιτυχής!'))
    .catch(err => console.error('Σφάλμα σύνδεσης MongoDB:', err));

// --- ROUTES ---

// 1. Αρχική σελίδα (Εμφάνιση καταχωρήσεων και υπολογισμοί)
app.get('/', async (req, res) => {
    try {
        const logs = await HeatingLog.find().sort({ date: -1 });
        
        let totalCostAll = 0;
        const totalsByFuel = {};
        
        logs.forEach(log => {
            const cost = log.totalCost || 0;
            totalCostAll += cost;
            
            if (!totalsByFuel[log.unit]) {
                totalsByFuel[log.unit] = 0;
            }
            totalsByFuel[log.unit] += cost;
        });

        res.render('index', { logs, totalCostAll, totalsByFuel });
    } catch (err) {
        console.error(err);
        res.status(500).send('Σφάλμα φόρτωσης δεδομένων');
    }
});

// 2. Προσθήκη νέας καταχώρησης (POST)
app.post('/add', async (req, res) => {
    try {
        const { 
            amount, unit, unitPrice, notes, 
            vitaraGas, chainsawGas, chainOil, mixOil, accessoriesCost, accessoriesNote 
        } = req.body;
        
        const parsedAmount = parseFloat(amount) || 0;
        let totalCost = 0;

        // Αν είναι ξύλα, το κόστος είναι το άθροισμα των εξόδων μεταφοράς/κοπής
        if (unit && unit.toLowerCase().includes('ξύλ')) {
            const vGas = parseFloat(vitaraGas) || 0;
            const cGas = parseFloat(chainsawGas) || 0;
            const cOil = parseFloat(chainOil) || 0;
            const mOil = parseFloat(mixOil) || 0;
            const accCost = parseFloat(accessoriesCost) || 0;
            
            totalCost = vGas + cGas + cOil + mOil + accCost;
        } else {
            // Για τα υπόλοιπα καύσιμα (π.χ. πετρέλαιο)
            const parsedUnitPrice = unitPrice ? parseFloat(unitPrice) : 0;
            totalCost = parsedAmount * parsedUnitPrice;
        }

        const newLog = new HeatingLog({
            amount: parsedAmount,
            unit,
            unitPrice: unitPrice ? parseFloat(unitPrice) : 0,
            totalCost,
            notes,
            vitaraGas: parseFloat(vitaraGas) || 0,
            chainsawGas: parseFloat(chainsawGas) || 0,
            chainOil: parseFloat(chainOil) || 0,
            mixOil: parseFloat(mixOil) || 0,
            accessoriesCost: parseFloat(accessoriesCost) || 0,
            accessoriesNote: accessoriesNote || ''
        });

        await newLog.save();
        res.redirect('/');
    } catch (err) {
        console.error("Σφάλμα αποθήκευσης:", err);
        res.status(400).send('Σφάλμα αποθήκευσης: ' + err.message);
    }
});

// 3. Σελίδα Επεξεργασίας (GET)
app.get('/edit/:id', async (req, res) => {
    try {
        const log = await HeatingLog.findById(req.params.id);
        if (!log) return res.redirect('/');
        res.render('edit', { log });
    } catch (err) {
        console.error(err);
        res.redirect('/');
    }
});

// 4. Ενημέρωση καταχώρησης (POST)
app.post('/edit/:id', async (req, res) => {
    try {
        const { 
            amount, unit, unitPrice, notes, 
            vitaraGas, chainsawGas, chainOil, mixOil, accessoriesCost, accessoriesNote 
        } = req.body;
        
        const parsedAmount = parseFloat(amount) || 0;
        let totalCost = 0;

        if (unit && unit.toLowerCase().includes('ξύλ')) {
            const vGas = parseFloat(vitaraGas) || 0;
            const cGas = parseFloat(chainsawGas) || 0;
            const cOil = parseFloat(chainOil) || 0;
            const mOil = parseFloat(mixOil) || 0;
            const accCost = parseFloat(accessoriesCost) || 0;
            
            totalCost = vGas + cGas + cOil + mOil + accCost;
        } else {
            const parsedUnitPrice = unitPrice ? parseFloat(unitPrice) : 0;
            totalCost = parsedAmount * parsedUnitPrice;
        }

        await HeatingLog.findByIdAndUpdate(req.params.id, {
            amount: parsedAmount,
            unit,
            unitPrice: unitPrice ? parseFloat(unitPrice) : 0,
            totalCost,
            notes,
            vitaraGas: parseFloat(vitaraGas) || 0,
            chainsawGas: parseFloat(chainsawGas) || 0,
            chainOil: parseFloat(chainOil) || 0,
            mixOil: parseFloat(mixOil) || 0,
            accessoriesCost: parseFloat(accessoriesCost) || 0,
            accessoriesNote: accessoriesNote || ''
        });

        res.redirect('/');
    } catch (err) {
        console.error("Σφάλμα ενημέρωσης:", err);
        res.status(400).send('Σφάλμα ενημέρωσης: ' + err.message);
    }
});

// Εκκίνηση Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Ο server ξεκίνησε στη θύρα ${PORT}`);
});