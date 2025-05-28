const axios = require('axios');
const { getCachedData, TTL } = require('../utils/cache');

const footballApi = axios.create({
  baseURL: 'https://api.football-data.org/v4',
  headers: {
    'X-Auth-Token': process.env.FOOTBALL_API_KEY || "7021460337044c99aba2cd0cd512643c" // Replace with your actual API key
  }
});

/**
 * Get today matches
 * @returns {Promise<Array>}
 */
const getTodayMatches = async () => {
    return getCachedData('matches', async () => {
        const response = await footballApi.get("/matches")
        return response.data;
    }, TTL.TODAY)
}
/**
 * Get live matches
 * @returns {Promise<Array>} - Live matches data
 */
const getLiveMatches = async () => {
  return getCachedData('live_matches', async () => {
    const response = await footballApi.get('/matches?status=LIVE');
    return response.data;
  }, TTL.LIVE_MATCHES);
};

/**
 * Get upcoming matches
 * @returns {Promise<Array>} - Upcoming matches data
 */
const getUpcomingMatches = async () => {
  const today = new Date().toISOString().split('T')[0];
  // Get matches for next 7 days
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = nextWeek.toISOString().split('T')[0];
  
  return getCachedData(`upcoming_matches_${today}`, async () => {
    const response = await footballApi.get(`/matches?dateFrom=${today}&dateTo=${nextWeekStr}`);
    return response.data;
  }, TTL.FIXTURES);
};

/**
 * Get previous matches
 * @returns {Promise<Array>} - previous matches data
 */
const getPreviousMatches = async () => {
  const today = new Date("2024-08-16").toISOString().split('T')[0];
  const currentWeek = new Date();
  const currentWeekStr = currentWeek.toISOString().split('T')[0];
  
  return getCachedData(`previous-matches_${today}`, async () => {
    const response = await footballApi.get(`/matches?dateFrom=${today}&dateTo=${currentWeekStr}`);
    return response.data;
  }, TTL.FIXTURES);
};

/**
 * Get league standings
 * @param {number} leagueId - ID of the league
 * @returns {Promise<Object>} - League standings data
 */
const getLeagueStandings = async (leagueId) => {
  return getCachedData(`standings_${leagueId}`, async () => {
    const response = await footballApi.get(`/competitions/${leagueId}/standings`);
    return response.data;
  }, TTL.DEFAULT);
};

/**
 * Get a single league
 * @param {number} leagueId - code of the league
 * @returns {Promise<Object>} -single league data
 */
const getSingleLeague = async (leagueId) => {
  return getCachedData(`single_league_${leagueId}`, async () => {
    const response = await footballApi.get(`/competitions/${leagueId}`);
    return response.data;
  }, TTL.SINGLE_LEAGUE);
};
/**
 * Get a single league Matches
 * @param {number} leagueId - code of the league
 * @returns {Promise<Object>} -single league data
 */
const getSingleLeagueMatches = async (leagueId) => {
  const today = new Date().toISOString().split('T')[0];
  // Get matches for next 7 days
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = nextWeek.toISOString().split('T')[0];

  return getCachedData(`single-league-matches_${leagueId}`, async () => {
    const response = await footballApi.get(`/competitions/${leagueId}/matches?dateFrom=${today}&dateTo=${nextWeekStr}`);
    return response.data;
  }, TTL.STANDINGS);
};
/**
 * Get a single league Matches
 * @param {number} leagueId - code of the league
 * @returns {Promise<Object>} -single league data
 */
const getSingleLeaguePrevMatches = async (leagueId) => {
  const today = new Date("2024-08-16").toISOString().split('T')[0];
  // Get matches for next 7 days
  const currentWeek = new Date();
  const currentWeekStr = currentWeek.toISOString().split('T')[0];

  return getCachedData(`single-league-prev-matches_${leagueId}`, async () => {
    const response = await footballApi.get(`/competitions/${leagueId}/matches?dateFrom=${today}&dateTo=${currentWeekStr}`);
    return response.data;
  }, TTL.STANDINGS);
};

/**
 * Get competitions/leagues
 * @returns {Promise<Array>} - Competitions data
 */
const getCompetitions = async () => {
  return getCachedData('competitions', async () => {
    const response = await footballApi.get('/competitions');
    return response.data;
  }, TTL.DEFAULT);
};

/**
 * Get team information
 * @param {number} teamId - ID of the team
 * @returns {Promise<Object>} - Team data
 */
const getTeamInfo = async (teamId) => {
  return getCachedData(`team_${teamId}`, async () => {
    const response = await footballApi.get(`/teams/${teamId}`);
    return response.data;
  }, TTL.TEAM_INFO);
};
/**
 * Get single competion scorers
 * @param {number} teamId - ID of the team
 * @returns {Promise<Object>} - Team data
 */
const getSingleCompetitionScorers = async (leagueId) => {
  return getCachedData(`competition_${leagueId}`, async () => {
    const response = await footballApi.get(`/competitions/${leagueId}/scorers`);
    return response.data;
  }, TTL.TEAM_INFO);
};

/**
 * Get single competion scorers
 * @param {number} teamId - ID of the team
 * @returns {Promise<Object>} - Team data
 */
const getSingleTeamMatches = async (leagueId) => {
  return getCachedData(`team-matches_${leagueId}`, async () => {
    const response = await footballApi.get(`/teams/${leagueId}/matches`);
    return response.data;
  }, TTL.TEAM_INFO);
};

/**
 * Get single competion scorers
 * @param {number} teamId - ID of the team
 * @returns {Promise<Object>} - Team data
 */
const getSinglePlayer = async (playerId) => {
  return getCachedData(`player_${playerId}`, async () => {
    const response = await footballApi.get(`/persons/${playerId}`);
    return response.data;
  }, TTL.DEFAULT);
};

/**
 * Get match details
 * @param {number} matchId - ID of the match
 * @returns {Promise<Object>} - Match details
 */
const getMatchDetails = async (matchId) => {
  return getCachedData(`match_${matchId}`, async () => {
    const response = await footballApi.get(`/matches/${matchId}`);
    return response.data;
  }, TTL.LIVE_MATCHES);
};

/**
 * Fallback function to handle API rate limits or downtime
 * Returns mock data when API is unavailable
 * @param {string} dataType - Type of data to mock
 * @returns {Object} - Mock data
 */
const getMockData = (dataType) => {
  // Basic mock data for development/fallback
  const mockData = {
    liveMatches: {
      matches: [
        {
          id: 1,
          utcDate: new Date().toISOString(),
          status: 'IN_PLAY',
          minute: '45',
          homeTeam: { id: 65, name: 'Manchester City FC' },
          awayTeam: { id: 66, name: 'Manchester United FC' },
          score: {
            fullTime: { home: 2, away: 1 },
            halfTime: { home: 1, away: 0 }
          }
        },
        // Add more mock matches as needed
      ]
    },
    standings: {
      competition: { id: 2021, name: 'Premier League' },
      standings: [
        {
          type: 'TOTAL',
          table: [
            {
              position: 1,
              team: { id: 65, name: 'Manchester City FC' },
              playedGames: 38,
              won: 27,
              draw: 5,
              lost: 6,
              points: 86,
              goalsFor: 83,
              goalsAgainst: 32,
              goalDifference: 51
            },
            // Add more teams as needed
          ]
        }
      ]
    }
  };
  
  return mockData[dataType] || { message: 'No mock data available' };
};

module.exports = {
  getTodayMatches,
  getLiveMatches,
  getUpcomingMatches,
  getLeagueStandings,
  getCompetitions,
  getTeamInfo,
  getMatchDetails,
  getMockData,
  getSingleLeague,
  getPreviousMatches,
  getSingleLeagueMatches,
  getSingleLeaguePrevMatches,
  getSingleCompetitionScorers,
  getSingleTeamMatches,
  getSinglePlayer
};