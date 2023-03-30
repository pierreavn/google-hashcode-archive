/**
 * This script extracts Google Hashcode scoreboard
 */

// Parameters
const EDITION = 2022;
const ROUND = "final"; // "qualification" or "final"
const SCOREBOARD_ID = "00000000008cacc6";

// Script
const fs = require('fs');
const request = require('request');

/**
 * Fetch single page of the scoreboard
 * @param {*} page Page number (0-based index)
 * @param {*} perPage Items per page
 * @returns 
 */
const scoreboardLoadPage = async (page = 0, perPage = 200) => {
    return new Promise((resolve, reject) => {
        const params = Buffer
            .from(JSON.stringify({
                min_rank: (page * perPage) + 1,
                num_consecutive_users: perPage,
            }), 'utf-8')
            .toString('base64')

        request(`https://codejam.googleapis.com/scoreboard/${SCOREBOARD_ID}/poll?p=${params}`, function (error, response, body) {
            if (!response || response.statusCode !== 200) {
                reject("Failed to fetch scoreboard");
                return;
            }
        
            try {
                const text = Buffer
                    .from(body, 'base64')
                    .toString('utf-8')
                const data = JSON.parse(text);
                resolve(data);
            } catch (error) {
                reject(error)
            }
        });
    })
}

/**
 * Fetch the entire scoreboard
 * @returns 
 */
const scoreboardLoad = async () => {
    console.log("Loading first page...")
    const perPage = 200;
    const firstItem = await scoreboardLoadPage(0, 1);
    const totalItems = firstItem.full_scoreboard_size;
    const pagesCount = Math.ceil(totalItems / perPage);
    const items = [];

    // Fetch each page
    for (let i = 1; i <= pagesCount; i++) {
        console.log(`Page ${i}/${pagesCount}`);
        try {
            const page = await scoreboardLoadPage(i-1, perPage);
            for (const item of page.user_scores) {
                items.push(item);
            }
        } catch (error) {
            console.log(error)
            console.log(`[!] Page ${i} failed!`)
        }
    }

    return {
        ...firstItem,
        user_scores: items,
    }
}

// Main script
scoreboardLoad().then(scoreboard => {
    const output = {
        id: SCOREBOARD_ID,
        edition: EDITION,
        round: ROUND,
        start_ms: scoreboard.challenge.start_ms,
        end_ms: scoreboard.challenge.end_ms,
        tests: scoreboard.challenge.tasks[0].tests.map(test => ({
            name: test.name,
        })),
        scoreboard_size: scoreboard.full_scoreboard_size,
        scoreboard: scoreboard.user_scores.map(score => ({
            rank: score.rank,
            name: score.displayname,
            score: score.score_1,
            country: score.country,
            competitors_countries: score.competitor.country,
            tests_scores: score.task_info[0]?.score_by_test ?? [],
        })),
    }
    
    console.log('Writing to disk...');
    const OUTPUT_FILE = `archive/${EDITION}/${ROUND}/hashcode_${EDITION}_${ROUND}_round_scoreboard.json`;
    fs.writeFile(OUTPUT_FILE, JSON.stringify(output, undefined, 2), 'utf8', () => {
        console.log('Done!');
    });
})
