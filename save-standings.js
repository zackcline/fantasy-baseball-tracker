const axios = require('axios');
const fs = require('fs');
const path = require('path');

const players = [/* Same as script.js */];
function mapTeamName(apiName) {/* Same as script.js */}

async function saveStandings() {
    try {
        // Mock API (replace with proxy or local data)
        const response = await axios.get('https://statsapi.mlb.com/api/v1/standings?leagueId=103,104&season=2025');
        const teamData = {};
        response.data.records.forEach(division => {
            division.teamRecords.forEach(team => {
                const mappedName = mapTeamName(team.team.name);
                if (mappedName) teamData[mappedName] = { wins: team.wins || 0, losses: team.losses || 0 };
            });
        });

        const standings = players.map(player => {
            let totalWins = 0, totalLosses = 0;
            player.teams.forEach(team => {
                const stats = teamData[team] || { wins: 0, losses: 0 };
                totalWins += stats.wins;
                totalLosses += stats.losses;
            });
            const winPercentage = totalWins + totalLosses > 0 ? (totalWins / (totalWins + totalLosses)).toFixed(3) : "0.000";
            return { name: player.name, wins: totalWins, losses: totalLosses, winPercentage };
        });

        standings.sort((a, b) => parseFloat(b.winPercentage) - parseFloat(a.winPercentage));
        const rankedStandings = standings.map((player, index) => ({
            ...player,
            rank: index + 1
        }));

        const today = new Date();
        const seasonStart = new Date('2025-03-27');
        const weekNumber = Math.ceil((today - seasonStart) / (7 * 24 * 60 * 60 * 1000));
        const weeklyFile = `standings-2025-week${weekNumber}.json`;

        fs.writeFileSync(path.join(__dirname, weeklyFile), JSON.stringify(rankedStandings, null, 2));
        fs.writeFileSync(path.join(__dirname, 'previousStandings.json'), JSON.stringify(rankedStandings, null, 2));

        console.log(`Saved ${weeklyFile} and updated previousStandings.json`);
    } catch (error) {
        console.error('Error saving standings:', error);
        process.exit(1);
    }
}

saveStandings();
