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

// 1. Αρχική σελίδα (Εμφάνιση καταχωρήσεων)
app.get('/', async (req, res) => {
    try {
        const logs = await HeatingLog.find().sort({ date: -1 });
        res.render('index', { logs });
    } catch (err) {
        console.error(err);
        res.status(500).send('Σφάλμα φόρτωσης δεδομένων');
    }
});

// 2. Προσθήκη νέας καταχώρησης (POST)
app.post('/add', async (req, res) => {
    try {
        const { amount, unit, unitPrice, notes } = req.body;
        const parsedAmount = parseFloat(amount) || 0;
        const parsedUnitPrice = unitPrice ? parseFloat(unitPrice) : 0;
        const totalCost = parsedAmount * parsedUnitPrice;

        const newLog = new HeatingLog({
            amount: parsedAmount,
            unit,
            unitPrice: parsedUnitPrice,
            totalCost,
            notes
        });
        await newLog.save();
        res.redirect('/');
    } catch (err) {
        console.error("Σφάλμα αποθήκευσης:", err);
        res.status(400).send('Σφάλμα αποθήκευσης: ' + err.message);
    }
});

// 4. Ενημέρωση καταχώρησης (POST)
app.post('/edit/:id', async (req, res) => {
    try {
        const { amount, unit, unitPrice, notes } = req.body;
        const parsedAmount = parseFloat(amount) || 0;
        const parsedUnitPrice = unitPrice ? parseFloat(unitPrice) : 0;
        const totalCost = parsedAmount * parsedUnitPrice;

        await HeatingLog.findByIdAndUpdate(req.params.id, {
            amount: parsedAmount,
            unit,
            unitPrice: parsedUnitPrice,
            totalCost,
            notes
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