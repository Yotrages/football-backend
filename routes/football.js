// backend/routes/football.js
const express = require('express');
const router = express.Router();
const footballService = require('../services/footballservices');

// GET /api/football/live-matches
router.get('/live-matches', async (req, res) => {
  try {
    const liveMatches = await footballService.getLiveMatches();
    res.status(200).json(liveMatches);
  } catch (error) {
    console.error('Error fetching live matches:', error.message);
    // Fallback to mock data if API fails
    if (error.response && error.response.status === 429) {
      // API rate limit exceeded
      res.status(429).json(footballService.getMockData('liveMatches'));
    } else {
      res.status(500).json({ 
        error: 'Failed to fetch live matches',
        message: error.message 
      });
    }
  }
});

// GET /api/football/upcoming-matches
router.get('/upcoming-matches', async (req, res) => {
  try {
    const upcomingMatches = await footballService.getUpcomingMatches();
    res.json(upcomingMatches);
  } catch (error) {
    console.error('Error fetching upcoming matches:', error.message);
    res.status(500).json({ error: 'Failed to fetch upcoming matches' });
  }
});

// GET /api/football/previous-matches
router.get('/previous-matches', async (req, res) => {
  try {
    const previousMatches = await footballService.getPreviousMatches();
    res.json(previousMatches);
  } catch (error) {
    console.error('Error fetching upcoming matches:', error.message);
    res.status(500).json({ error: 'Failed to fetch upcoming matches' });
  }
});


// GET /api/football/matches
router.get("/matches", async (req, res) => {
    try {
        const todayMatches = await footballService.getTodayMatches()
        res.status(200).json(todayMatches)
    } catch (err) {
        console.log(err)
        res.status(500).json({error: err})
    }
})

// GET /api/football/leagues
router.get('/leagues', async (req, res) => {
  try {
    const competitions = await footballService.getCompetitions();
    res.json(competitions);
  } catch (error) {
    console.error('Error fetching competitions:', error.message);
    res.status(500).json({ error: 'Failed to fetch competitions' });
  }
});

// GET /api/football/leagues/:leagueId/standings
router.get('/leagues/:leagueId/standings', async (req, res) => {
  const { leagueId } = req.params;
  try {
    const standings = await footballService.getLeagueStandings(leagueId);
    res.json(standings);
  } catch (error) {
    console.error(`Error fetching standings for league ${leagueId}:`, error.message);
    
    // Fallback to mock data if API fails
    if (error.response && error.response.status === 429) {
      res.json(footballService.getMockData('standings'));
    } else {
      res.status(500).json({ error: 'Failed to fetch standings' });
    }
  }
});

// GET /api/football/leagues/LeagueId
router.get('/leagues/:leagueId', async (req, res) => {
  const { leagueId } = req.params;
  try {
    const singleLeague = await footballService.getSingleLeague(leagueId);
    res.status(200).json(singleLeague);
  } catch (error) {
    console.error(`Error fetching standings for league ${leagueId}:`, error.message);
      res.status(500).json({ error: 'Failed to fetch standings' });
  }
});
// GET /api/football/leagues/LeagueId/matches
router.get('/leagues/:leagueId/matches', async (req, res) => {
  const { leagueId } = req.params;
  try {
    const singleLeagueMatches = await footballService.getSingleLeagueMatches(leagueId);
    res.status(200).json(singleLeagueMatches);
  } catch (error) {
    console.error(`Error fetching standings for league ${leagueId}:`, error.message);
     res.status(500).json({ error: 'Failed to fetch standings' });
  }
});

// GET /api/football/leagues/LeagueId/prevmatches
router.get('/leagues/:leagueId/prevmatches', async (req, res) => {
  const { leagueId } = req.params;
  try {
    const singleLeaguePrevMatches = await footballService.getSingleLeaguePrevMatches(leagueId);
    res.status(200).json(singleLeaguePrevMatches);
  } catch (error) {
    console.error(`Error fetching standings for league ${leagueId}:`, error.message);
     res.status(500).json({ error: 'Failed to fetch standings' });
  }
});

// GET /api/football/teams/:teamId
router.get('/teams/:teamId', async (req, res) => {
  const { teamId } = req.params;
  try {
    const team = await footballService.getTeamInfo(teamId);
    res.json(team);
  } catch (error) {
    console.error(`Error fetching team ${teamId}:`, error.message);
    res.status(500).json({ error: 'Failed to fetch team information' });
  }
});

// GET /api/football/teams/:teamId/matches
router.get('/teams/:leagueId/matches', async (req, res) => {
  const { leagueId } = req.params;
  try {
    const teamMatches = await footballService.getSingleTeamMatches(leagueId);
    res.json(teamMatches);
  } catch (error) {
    console.error(`Error fetching team ${leagueId}:`, error.message);
    res.status(500).json({ error: 'Failed to fetch team information' });
  }
});

// GET /api/football/persons/:playerId/
router.get('/persons/:playerId', async (req, res) => {
  const { playerId } = req.params;
  try {
    const singlePlayer = await footballService.getSinglePlayer(playerId);
    res.json(singlePlayer);
  } catch (error) {
    console.error(`Error fetching team ${playerId}:`, error.message);
    res.status(500).json({ error: 'Failed to fetch team information' });
  }
});

// GET /api/football/competitions/:leagueId/scorers
router.get('/competitions/:leagueId/scorers', async (req, res) => {
  const { leagueId } = req.params;
  try {
    const topScorer = await footballService.getSingleCompetitionScorers(leagueId);
    res.json(topScorer);
  } catch (error) {
    console.error(`Error fetching team ${leagueId}:`, error.message);
    res.status(500).json({ error: 'Failed to fetch team information' });
  }
});

// GET /api/football/matches/:matchId
router.get('/matches/:matchId', async (req, res) => {
  const { matchId } = req.params;
  try {
    const match = await footballService.getMatchDetails(matchId);
    res.json(match);
  } catch (error) {
    console.error(`Error fetching match ${matchId}:`, error.message);
    res.status(500).json({ error: 'Failed to fetch match details' });
  }
});

module.exports = router;