const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Ensure DailyStandings folder exists
const dailyStandingsDir = path.join(__dirname, 'DailyStandings');
if (!fs.existsSync(dailyStandingsDir)) {
    fs.mkdirSync(dailyStandingsDir);
}

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

// Map API team names
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

// Calculate standings up to a specific date
async function calculateStandingsForDate(endDateStr) {
    try {
        // Initialize team data
        const teamData = {};
        players.forEach(player => {
            player.teams.forEach(team => {
                teamData[team] = { wins: 0, losses: 0 };
            });
        });

        // Process games from season start to endDate
        const startDate = new Date('2025-03-27');
        const endDate = new Date(endDateStr);
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const date = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
            const response = await fetch(`https://statsapi.mlb.com/api/v1/schedule?date=${date}&sportId=1`);
            if (!response.ok) {
                console.warn(`HTTP error for ${date}: Status ${response.status}`);
                continue;
            }
            const dayData = await response.json();

            if (dayData.dates && dayData.dates[0] && dayData.dates[0].games) {
                dayData.dates[0].games.forEach(game => {
                    if (game.status.abstractGameCode === 'F') { // Final games
                        const homeTeam = mapTeamName(game.teams.home.team.name);
                        const awayTeam = mapTeamName(game.teams.away.team.name);
                        const homeScore = game.teams.home.score;
                        const awayScore = game.teams.away.score;

                        if (homeTeam && awayTeam && homeScore !== undefined && awayScore !== undefined) {
                            if (homeScore > awayScore) {
                                if (teamData[homeTeam]) teamData[homeTeam].wins += 1;
                                if (teamData[awayTeam]) teamData[awayTeam].losses += 1;
                            } else if (awayScore > homeScore) {
                                if (teamData[awayTeam]) teamData[awayTeam].wins += 1;
                                if (teamData[homeTeam]) teamData[homeTeam].losses += 1;
                            }
                        }
                    }
                });
            }
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
        return standings.map((player, index) => ({
            name: player.name,
            wins: player.wins,
            losses: player.losses,
            winPercentage: player.winPercentage,
            rank: index + 1
        }));
    } catch (error) {
        console.error(`Error calculating standings for ${endDateStr}:`, error.message);
        return null;
    }
}

// Backfill standings from March 27 to April 12
async function backfillStandings() {
    const startDate = new Date('2025-03-27');
    const endDate = new Date('2025-04-12');
    const dates = [];

    // Generate date strings
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const year = d.getUTCFullYear();
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        dates.push(`${year}-${month}-${day}`);
    }

    // Process each date
    for (const dateStr of dates) {
        console.log(`Processing ${dateStr}...`);
        const standings = await calculateStandingsForDate(dateStr);
        if (standings) {
            const filePath = path.join(dailyStandingsDir, `standings-${dateStr}.json`);
            fs.writeFileSync(filePath, JSON.stringify(standings, null, 2));
            console.log(`Saved DailyStandings/standings-${dateStr}.json`);
        } else {
            console.log(`Skipped ${dateStr} due to error`);
        }
    }
}

backfillStandings();
