const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Player data (same as script.js)
const players = [
    { name: "Kaleb", teams: ["Dodgers", "Twins", "Brewers", "Marlins"] },
    { name: "Clay", teams: ["Braves", "Astros", "Tigers", "Nationals"] },
    { name: "Chris", teams: ["Phillies", "Mariners", "Royals", "A's"] },
    { name: "Pat", teams: ["Rangers", "Cubs", "Blue Jays", "Pirates"] },
    { name: "Tyler", teams: ["Mets", "Padres", "Guardians", "Cardinals"] },
    { name: "Zack", teams: ["Orioles", "Yankees", "Rays", "Angels"] },
    { name: "Terry", teams: ["Red Sox", "Diamondbacks", "Reds", "Giants"] }
];

// Map API team names to our format (same as script.js)
function mapTeamName(apiName) {
    const nameMap = {
        "Los Angeles Dodgers": "Dodgers",
        "Atlanta Braves": "Braves",
        "Philadelphia Phillies": "Phillies",
        "Texas Rangers": "Rangers",
        "New York Mets": "Mets",
        "Baltimore Orioles": "Orioles",
        "Boston Red Sox": "Red Sox",
        "Arizona Diamondbacks": "Diamondbacks",
        "New York Yankees": "Yankees",
        "San Diego Padres": "Padres",
        "Chicago Cubs": "Cubs",
        "Seattle Mariners": "Mariners",
        "Houston Astros": "Astros",
        "Minnesota Twins": "Twins",
        "Milwaukee Brewers": "Brewers",
        "Detroit Tigers": "Tigers",
        "Kansas City Royals": "Royals",
        "Toronto Blue Jays": "Blue Jays",
        "Cleveland Guardians": "Guardians",
        "Tampa Bay Rays": "Rays",
        "Cincinnati Reds": "Reds",
        "San Francisco Giants": "Giants",
        "Los Angeles Angels": "Angels",
        "St. Louis Cardinals": "Cardinals",
        "Pittsburgh Pirates": "Pirates",
        "Oakland Athletics": "A's",
        "Washington Nationals": "Nationals",
        "Miami Marlins": "Marlins"
    };
    return nameMap[apiName] || null;
}

// Fetch and save standings
async function saveStandings() {
    try {
        // Fetch MLB data using node-fetch
        const response = await fetch('https://statsapi.mlb.com/api/v1/standings?leagueId=103,104&season=2025');
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();

        if (!data.records || !Array.isArray(data.records)) {
            throw new Error('Invalid MLB API response');
        }

        // Process team data
        const teamData = {};
        data.records.forEach(division => {
            if (division.teamRecords && Array.isArray(division.teamRecords)) {
                division.teamRecords.forEach(team => {
                    const mappedName = mapTeamName(team.team.name);
                    if (mappedName) {
                        teamData[mappedName] = { wins: team.wins || 0, losses: team.losses || 0 };
                    }
                });
            }
        });

        if (Object.keys(teamData).length === 0) {
            throw new Error('No valid team data processed');
        }

        // Calculate player standings
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

        // Sort and rank
        standings.sort((a, b) => parseFloat(b.winPercentage) - parseFloat(a.winPercentage));
        const rankedStandings = standings.map((player, index) => ({
            name: player.name,
            wins: player.wins,
            losses: player.losses,
            winPercentage: player.winPercentage,
            rank: index + 1
        }));

        // Generate filename based on current date (e.g., standings-2025-04-13.json)
        const today = new Date();
        const year = today.getUTCFullYear();
        const month = String(today.getUTCMonth() + 1).padStart(2, '0');
        const day = String(today.getUTCDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        const weeklyFile = `standings-${dateStr}.json`;

        // Save weekly standings and update previousStandings.json
        fs.writeFileSync(path.join(__dirname, weeklyFile), JSON.stringify(rankedStandings, null, 2));
        fs.writeFileSync(path.join(__dirname, 'previousStandings.json'), JSON.stringify(rankedStandings, null, 2));

        console.log(`Saved ${weeklyFile} and updated previousStandings.json`);
    } catch (error) {
        console.error('Error saving standings:', error.message);
        process.exit(1);
    }
}

saveStandings();
