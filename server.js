require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const ExcelJS = require('exceljs');
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
  .then(() => console.log('✅ Σύνδεση στη MongoDB επιτυχής!'))
  .catch(err => console.error('❌ Σφάλμα σύνδεσης MongoDB:', err));

// --- ROUTES ---

// 1. Αρχική Σελίδα (Φόρμα + Λίστα + Στατιστικά)
app.get('/', async (req, res) => {
  try {
    const logs = await HeatingLog.find().sort({ date: -1, createdAt: -1 });

    let totalCostAll = 0;
    const totalsByFuel = {
      'Πετρέλαιο': { amount: 0, unit: 'λίτρα', cost: 0 },
      'Πέλλετ': { amount: 0, unit: 'σακιά/κιλά', cost: 0 },
      'Ξύλα': { amount: 0, unit: 'κιλά/m³', cost: 0 },
      'Άλλο': { amount: 0, unit: 'μονάδες', cost: 0 }
    };

    logs.forEach(log => {
      totalCostAll += log.totalCost || 0;
      if (totalsByFuel[log.fuelType]) {
        totalsByFuel[log.fuelType].amount += log.amount;
        totalsByFuel[log.fuelType].cost += log.totalCost || 0;
      }
    });

    res.render('index', { logs, totalCostAll, totalsByFuel });
  } catch (err) {
    res.status(500).send('Σφάλμα διακομιστή: ' + err.message);
  }
});

// 2. Προσθήκη Νέας Καταγραφής
app.post('/add', async (req, res) => {
  try {
    const { date, fuelType, amount, unit, unitPrice, notes } = req.body;
    
    const newLog = new HeatingLog({
      date: date ? new Date(date) : new Date(),
      fuelType,
      amount: parseFloat(amount),
      unit,
      unitPrice: unitPrice ? parseFloat(unitPrice) : 0,
      notes
    });

    await newLog.save();
    res.redirect('/');
  } catch (err) {
    res.status(400).send('Σφάλμα αποθήκευσης: ' + err.message);
  }
});

// 3. Σελίδα Επεξεργασίας
app.get('/edit/:id', async (req, res) => {
  try {
    const log = await HeatingLog.findById(req.params.id);
    if (!log) return res.redirect('/');
    res.render('edit', { log });
  } catch (err) {
    res.redirect('/');
  }
});

// 4. Ενημέρωση Καταγραφής
app.post('/edit/:id', async (req, res) => {
  try {
    const { date, fuelType, amount, unit, unitPrice, notes } = req.body;
    const parsedAmount = parseFloat(amount);
    const parsedUnitPrice = unitPrice ? parseFloat(unitPrice) : 0;
    const totalCost = parsedAmount * parsedUnitPrice;

    await HeatingLog.findByIdAndUpdate(req.params.id, {
      date: new Date(date),
      fuelType,
      amount: parsedAmount,
      unit,
      unitPrice: parsedUnitPrice,
      totalCost,
      notes
    });

    res.redirect('/');
  } catch (err) {
    res.status(400).send('Σφάλμα ενημέρωσης: ' + err.message);
  }
});

// 5. Διαγραφή Καταγραφής
app.post('/delete/:id', async (req, res) => {
  try {
    await HeatingLog.findByIdAndDelete(req.params.id);
    res.redirect('/');
  } catch (err) {
    res.status(500).send('Σφάλμα διαγραφής: ' + err.message);
  }
});

// 6. Εξαγωγή σε Excel
app.get('/export', async (req, res) => {
  try {
    const logs = await HeatingLog.find().sort({ date: -1 });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Καταγραφές Θέρμανσης');

    worksheet.columns = [
      { header: 'Ημερομηνία', key: 'date', width: 15 },
      { header: 'Είδος Καυσίμου', key: 'fuelType', width: 18 },
      { header: 'Ποσότητα', key: 'amount', width: 12 },
      { header: 'Μονάδα', key: 'unit', width: 15 },
      { header: 'Τιμή Μονάδας (€)', key: 'unitPrice', width: 16 },
      { header: 'Συνολικό Κόστος (€)', key: 'totalCost', width: 20 },
      { header: 'Σημειώσεις', key: 'notes', width: 30 }
    ];

    logs.forEach(log => {
      worksheet.addRow({
        date: new Date(log.date).toISOString().split('T')[0],
        fuelType: log.fuelType,
        amount: log.amount,
        unit: log.unit,
        unitPrice: log.unitPrice ? log.unitPrice.toFixed(2) : '0.00',
        totalCost: log.totalCost ? log.totalCost.toFixed(2) : '0.00',
        notes: log.notes || ''
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=heating_logs.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).send('Σφάλμα εξαγωγής Excel: ' + err.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Ο διακομιστής τρέχει στο port ${PORT}`));