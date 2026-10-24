require('dotenv').config();
const mongoose = require('mongoose');
const xlsx = require('xlsx');
const HeatingLog = require('./models/HeatingLog');

async function importExcelData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Σύνδεση στη MongoDB επιτυχής!');

        // Καθαρισμός των προηγούμενων κενών/μηδενικών εγγραφών
        await HeatingLog.deleteMany({});
        console.log('Καθαρίστηκαν οι παλιές μηδενικές εγγραφές.');

        const workbook = xlsx.readFile('heating.xlsx');
        let totalImported = 0;

        for (const sheetName of workbook.SheetNames) {
            console.log(`Επεξεργασία φύλλου: ${sheetName}`);
            const sheet = workbook.Sheets[sheetName];
            const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });

            let fuelType = 'Πέλλετ';
            if (sheetName.toLowerCase().includes('ξύλα') || sheetName.toLowerCase().includes('xylo')) {
                fuelType = 'Ξύλα';
            }

            for (let i = 2; i < rawData.length; i++) {
                const row = rawData[i];
                if (!row) continue;

                // 1. Κατανάλωση (Στήλη H: Ημερομηνία, I: KG, J: Ποσό)
                const dateCons = row[7]; 
                const kgCons = parseNum(row[8]); 
                const costCons = parseNum(row[9]); 

                if (dateCons && (kgCons > 0 || costCons > 0)) {
                    const newLog = new HeatingLog({
                        date: parseExcelDate(dateCons),
                        unit: fuelType,
                        amount: kgCons,
                        unitPrice: 0,
                        totalCost: costCons,
                        notes: `Κατανάλωση [${sheetName}]`
                    });
                    await newLog.save();
                    totalImported++;
                }

                // 2. Αγορά (Στήλη K: Ημερομηνία, L: Ποσό, M: Κιλά)
                const dateBuy = row[10]; 
                const costBuy = parseNum(row[11]); 
                const kgBuy = parseNum(row[12]); 

                if (dateBuy && (costBuy > 0 || kgBuy > 0)) {
                    const newLog = new HeatingLog({
                        date: parseExcelDate(dateBuy),
                        unit: fuelType + ' (Αγορά)',
                        amount: kgBuy,
                        unitPrice: (kgBuy > 0 && costBuy > 0) ? (costBuy / kgBuy) : 0,
                        totalCost: costBuy,
                        notes: `Αγορά [${sheetName}]`
                    });
                    await newLog.save();
                    totalImported++;
                }
            }
        }

        console.log(` Επιτυχής εισαγωγή ${totalImported} έγκυρων εγγραφών με τα σωστά ποσά!`);
        process.exit(0);
    } catch (err) {
        console.error('Σφάλμα κατά την εισαγωγή:', err);
        process.exit(1);
    }
}

// Βοηθητική συνάρτηση για τη σωστή ανάγνωση αριθμών με κόμματα και ευρώ
function parseNum(val) {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    let clean = val.toString().replace('€', '').trim();
    clean = clean.replace(/\./g, '').replace(',', '.');
    return parseFloat(clean) || 0;
}

// Βοηθητική συνάρτηση για τις ημερομηνίες
function parseExcelDate(val) {
    if (!val) return new Date();
    if (typeof val === 'number') {
        const date = new Date(Math.round((val - (25567 + 2)) * 86400 * 1000));
        return isNaN(date.getTime()) ? new Date() : date;
    }
    const parsed = new Date(val);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
}

importExcelData();