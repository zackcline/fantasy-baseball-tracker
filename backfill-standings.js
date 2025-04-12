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

// Fetch with retry
async function fetchWithRetry(url, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url);
            if (response.ok) return response;
            console.warn(`Fetch attempt ${i + 1} failed: Status ${response.status}`);
        } catch (error) {
            console.warn(`Fetch attempt ${i + 1} error: ${error.message}`);
        }
        if (i < retries - 1) await new Promise(resolve => setTimeout(resolve, delay));
    }
    throw new Error(`Failed to fetch ${url} after ${retries} attempts`);
}

// Calculate standings for a specific date
async function calculateStandingsForDate(dateStr) {
    try {
        // Try standings API first
        const standingsUrl = `https://statsapi.mlb.com/api/v1/standings?leagueId=103,104&season=2025&date=${dateStr}`;
        let teamData = {};
        let usedStandingsApi = true;

        try {
            const response = await fetchWithRetry(standingsUrl);
            const data = await response.json();

            if (data.records && Array.isArray(data.records)) {
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
            }
        } catch (error) {
            console.warn(`Standings API failed for ${dateStr}: ${error.message}, falling back to schedule API`);
            usedStandingsApi = false;
        }

        // Fallback to schedule API
        if (Object.keys(teamData).length === 0) {
            players.forEach(player => {
                player.teams.forEach(team => {
                    teamData[team] = { wins: 0, losses: 0 };
                });
            });

            const processedGames = new Set();
            let gameCount = 0;
            const startDate = new Date('2025-03-27');
            const endDate = new Date(dateStr);

            for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                const date = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
                const scheduleUrl = `https://statsapi.mlb.com/api/v1/schedule?date=${date}&sportId=1&gameType=R`;
                const response = await fetchWithRetry(scheduleUrl);
                const dayData = await response.json();

                if (dayData.dates && dayData.dates[0] && dayData.dates[0].games) {
                    for (const game of dayData.dates[0].games) {
                        if (
                            game.status.detailedState === 'Final' &&
                            game.gameType === 'R' &&
                            !processedGames.has(game.gamePk)
                        ) {
                            processedGames.add(game.gamePk);
                            const homeTeam = mapTeamName(game.teams.home.team.name);
                            const awayTeam = mapTeamName(game.teams.away.team.name);
                            const homeScore = game.teams.home.score;
                            const awayScore = game.teams.away.score;

                            if (
                                (teamData[homeTeam] || teamData[awayTeam]) &&
                                typeof homeScore === 'number' &&
                                typeof awayScore === 'number'
                            ) {
                                gameCount++;
                                console.log(`Game ${gameCount} on ${date}: ${homeTeam} (${homeScore}) vs ${awayTeam} (${awayScore})`);
                                if (homeScore > awayScore) {
                                    if (teamData[homeTeam]) teamData[homeTeam].wins += 1;
                                    if (teamData[awayTeam]) teamData[awayTeam].losses += 1;
                                } else if (awayScore > homeScore) {
                                    if (teamData[awayTeam]) teamData[awayTeam].wins += 1;
                                    if (teamData[homeTeam]) teamData[homeTeam].losses += 1;
                                }
                            }
                        }
                    }
                }
            }

            console.log(`Processed ${gameCount} games for ${dateStr}`);
            if (gameCount > 100) {
                console.warn(`⚠️ High game count: ${gameCount}`);
            }
        }

        // Validate team totals
        console.log(`Team totals for ${dateStr}:`);
        Object.keys(teamData).forEach(team => {
            const totalGames = teamData[team].wins + teamData[team].losses;
            console.log(`  ${team}: ${teamData[team].wins}W-${teamData[team].losses}L (${totalGames} games)`);
            if (totalGames > 15 && dateStr === '2025-04-12') {
                console.warn(`⚠️ High game count for ${team}: ${totalGames}`);
            }
        });

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

        // Log player totals
        console.log(`Player standings for ${dateStr} (Standings API: ${usedStandingsApi}):`);
        rankedStandings.forEach(player => {
            console.log(`  ${player.name}: ${player.wins}W-${player.losses}L`);
        });
