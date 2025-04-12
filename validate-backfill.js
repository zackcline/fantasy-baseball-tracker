const fs = require('fs');
const path = require('path');

// Load previousStandings.json
const previousStandings = JSON.parse(fs.readFileSync(path.join(__dirname, 'previousStandings.json')));

// Aggregate backfilled files
const startDate = new Date('2025-03-27');
const endDate = new Date('2025-04-12');
const totals = previousStandings.reduce((acc, player) => {
    acc[player.name] = { wins: 0, losses: 0 };
    return acc;
}, {});

let fileCount = 0;
for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    const filePath = path.join(__dirname, 'DailyStandings', `standings-${dateStr}.json`);
    
    if (fs.existsSync(filePath)) {
        const standings = JSON.parse(fs.readFileSync(filePath));
        standings.forEach(player => {
            totals[player.name].wins += player.wins;
            totals[player.name].losses += player.losses;
        });
        fileCount++;
    } else {
        console.warn(`Missing file: standings-${dateStr}.json`);
    }
}

// Compare totals
console.log(`Processed ${fileCount} files`);
previousStandings.forEach(player => {
    const expected = { wins: player.wins, losses: player.losses };
    const actual = totals[player.name];
    console.log(`${player.name}:`);
    console.log(`  Expected (previousStandings.json): ${expected.wins}W-${expected.losses}L`);
    console.log(`  Actual (backfilled sum): ${actual.wins}W-${actual.losses}L`);
    if (expected.wins === actual.wins && expected.losses === actual.losses) {
        console.log('  ✅ Match');
    } else {
        console.log('  ❌ Mismatch');
    }
});

// Spot-check sample day
const sampleDate = '2025-04-01';
const sampleFile = path.join(__dirname, 'DailyStandings', `standings-${sampleDate}.json`);
if (fs.existsSync(sampleFile)) {
    console.log(`\nSample day (${sampleDate}):`);
    const standings = JSON.parse(fs.readFileSync(sampleFile));
    standings.forEach(player => {
        console.log(`${player.name}: ${player.wins}W-${player.losses}L, Rank ${player.rank}`);
    });
}
