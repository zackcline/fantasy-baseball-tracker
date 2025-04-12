const fs = require('fs');
const path = require('path');

// Load previousStandings.json
const previousStandings = JSON.parse(fs.readFileSync(path.join(__dirname, 'previousStandings.json')));

// Compare final backfilled file (2025-04-12)
const finalDate = '2025-04-12';
const finalFile = path.join(__dirname, 'DailyStandings', `standings-${finalDate}.json`);

console.log(`Validating final backfilled file: ${finalDate}`);
if (fs.existsSync(finalFile)) {
    const finalStandings = JSON.parse(fs.readFileSync(finalFile));
    let allMatch = true;

    previousStandings.forEach(expected => {
        const actual = finalStandings.find(s => s.name === expected.name);
        console.log(`${expected.name}:`);
        console.log(`  Expected (previousStandings.json): ${expected.wins}W-${expected.losses}L`);
        if (actual) {
            console.log(`  Actual (standings-${finalDate}.json): ${actual.wins}W-${actual.losses}L`);
            if (expected.wins === actual.wins && expected.losses === actual.losses) {
                console.log('  ✅ Match');
            } else {
                console.log('  ❌ Mismatch');
                allMatch = false;
            }
        } else {
            console.log('  ❌ Missing player');
            allMatch = false;
        }
    });

    if (allMatch) {
        console.log('\nFinal file matches previousStandings.json!');
    } else {
        console.log('\nFinal file has mismatches.');
    }
} else {
    console.error(`Missing file: standings-${finalDate}.json`);
}

// Check intermediate files for reasonableness
console.log('\nChecking intermediate files...');
const startDate = new Date('2025-03-27');
const endDate = new Date('2025-04-12');
let fileCount = 0;

for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    const filePath = path.join(__dirname, 'DailyStandings', `standings-${dateStr}.json`);
    
    if (fs.existsSync(filePath)) {
        fileCount++;
        const standings = JSON.parse(fs.readFileSync(filePath));
        console.log(`File: standings-${dateStr}.json`);
        standings.forEach(player => {
            const totalGames = player.wins + player.losses;
            console.log(`  ${player.name}: ${player.wins}W-${player.losses}L (${totalGames} games)`);
            // Warn if totals seem high (e.g., >60 games by April 12)
            if (dateStr === '2025-04-12' && totalGames > 60) {
                console.warn(`  ⚠️ High game count for ${player.name}`);
            }
        });
    } else {
        console.warn(`Missing file: standings-${dateStr}.json`);
    }
}

console.log(`\nProcessed ${fileCount} files`);
