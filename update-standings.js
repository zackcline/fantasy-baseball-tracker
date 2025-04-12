const fetch = require('node-fetch');

const players = [
    { name: "Kaleb", teams: ["Dodgers", "Twins", "Brewers", "Marlins"] },
    { name: "Clay", teams: ["Braves", "Astros", "Tigers", "Nationals"] },
    { name: "Chris", teams: ["Phillies", "Mariners", "Royals", "A's"] },
    { name: "Pat", teams: ["Rangers", "Cubs", "Blue Jays", "Pirates"] },
    { name: "Tyler", teams: ["Mets", "Padres", "Guardians", "Cardinals"] },
    { name: "Zack", teams: ["Orioles", "Yankees", "Rays", "Angels"] },
    { name: "Terry", teams: ["Red Sox", "Diamondbacks", "Reds", "Giants"] }
];

async function fetchMLBData() {
    try {
        const response = await fetch('https://statsapi.mlb.com/api/v1/standings?leagueId=103,104&season=2025');
        const data = await response.json();
        const teamData = {};

        data.records.forEach(division => {
            division.teamRecords.forEach(team => {
                const teamName = team.team.name;
                const wins = team.wins;
                const losses = team.losses;
                const mappedName = mapTeamName(teamName);
                if (mappedName) {
                    teamData[mappedName] = { wins, losses };
                }
            });
        });

        return teamData;
    } catch (error) {
        console.error('Error fetching MLB data:', error);
        return null;
    }
}

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

async function updateStandings() {
    const teamData = await fetchMLBData();
    if (!teamData) {
        console.error('Failed to fetch MLB data. Using default standings.');
        return players.map(player => ({
            name: player.name,
            wins: 0,
            losses: 0,
            winPercentage: "0.000",
            rank: 0
        }));
    }

    let standings = [];

    players.forEach(player => {
        let totalWins = 0;
        let totalLosses = 0;

        player.teams.forEach(team => {
            const teamStats = teamData[team];
            const wins = teamStats ? teamStats.wins : 0;
            const losses = teamStats ? teamStats.losses : 0;
            totalWins += wins;
            totalLosses += losses;
        });

        const winPercentage = totalWins + totalLosses > 0 ? (totalWins / (totalWins + totalLosses)).toFixed(3) : "0.000";
        standings.push({
            name: player.name,
            wins: totalWins,
            losses: totalLosses,
            winPercentage: winPercentage
        });
    });

    standings.sort((a, b) => parseFloat(b.winPercentage) - parseFloat(a.winPercentage));
    const rankedStandings = standings.map((player, index) => ({
        name: player.name,
        wins: player.wins,
        losses: player.losses,
        winPercentage: player.winPercentage,
        rank: index + 1
    }));

    return rankedStandings;
}

(async () => {
    const standings = await updateStandings();
    console.log(JSON.stringify(standings, null, 2));
    require('fs').writeFileSync('previousStandings.json', JSON.stringify(standings, null, 2));
})();
