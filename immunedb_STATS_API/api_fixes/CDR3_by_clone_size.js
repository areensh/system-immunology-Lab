
const mysql = require('mysql2/promise');
const connections = require("../db/connections");

// New statistic: CDR3 length for expanded vs non-expanded clones
// Split clones by a size threshold (min_clone_size, default 20 unique sequences)
// Returns average CDR3 for "expanded" (>= threshold) and "rest" (< threshold) separately
// Optional: filter to only individuals with at least min_expanded_clones in the expanded group

exports.getCDR3ByCloneSize = async (req, res) => {
    try {
    const resultsFinal = [];
    const { repertoires, statistics } = req.body;

    // Accept threshold parameters from the request
    const min_clone_size = req.body.min_clone_size || 20;
    const min_expanded_clones = req.body.min_expanded_clones || 0; // e.g., 100

    const KeyName = repertoires.meta_key;
    const ValueName = repertoires.meta_value;

    for (const connection of connections) {
        let whereClauses = [];
        let SUMClauses = [];
        let params = [];

        KeyName.forEach((key, index) => {
            const value = ValueName[index];
            if (value === 'ALL') {
                whereClauses.push(`(sm.key = ? AND sm.value != 'NA')`);
                params.push(key);
            } else {
                whereClauses.push(`(sm.key = ? AND sm.value = ?)`);
                params.push(key, value);
            }
        });
        KeyName.forEach((key, index) => {
            SUMClauses.push(`(sm.key = ?)`);
            params.push(key);
        });

        const sampleMetaCTE = `
        sample_meta AS (
          SELECT sm.sample_id,
            GROUP_CONCAT(DISTINCT sm.value ORDER BY sm.key SEPARATOR ',') AS meta_values,
            GROUP_CONCAT(DISTINCT sm.key ORDER BY sm.key SEPARATOR ',') AS meta_keys
          FROM sample_metadata sm
          WHERE (${whereClauses.join(' OR ')})
          GROUP BY sm.sample_id
          HAVING (${SUMClauses.map(clause => `SUM(${clause})`).join(' > 0 AND ')}) > 0
        )`;

        let query;

        if (statistics[0] === "cdr3_by_clone_size") {
            query = `
            WITH ${sampleMetaCTE},
            clone_data AS (
              SELECT clones.subject_id, clones.id AS clone_id, sma.meta_values, sma.meta_keys,
                LENGTH(cdr3_aa) AS cdr3_len,
                SUM(cs.unique_cnt) AS unique_size,
                SUM(cs.total_cnt) AS total_copies
              FROM clones
              JOIN clone_stats cs ON clones.id = cs.clone_id
              JOIN sample_meta sma ON sma.sample_id = cs.sample_id
              WHERE clones.functional = 1 AND cs.sample_id IS NOT NULL
            `;
            if (connection.config.database === "sykesIgblast") {
                query += `AND clones.subject_id NOT IN (12,13,11,14,15,22,19,18) `;
            }
            query += `
              GROUP BY clones.subject_id, clones.id, sma.meta_values, sma.meta_keys
            )
            SELECT
              cd.subject_id,
              -- Expanded clones (>= threshold)
              AVG(CASE WHEN unique_size >= ${Number(min_clone_size)} THEN cdr3_len END) AS avg_cdr3_expanded,
              STDDEV(CASE WHEN unique_size >= ${Number(min_clone_size)} THEN cdr3_len END) AS sd_cdr3_expanded,
              COUNT(CASE WHEN unique_size >= ${Number(min_clone_size)} THEN 1 END) AS n_expanded,
              -- Non-expanded clones (< threshold)
              AVG(CASE WHEN unique_size < ${Number(min_clone_size)} THEN cdr3_len END) AS avg_cdr3_rest,
              STDDEV(CASE WHEN unique_size < ${Number(min_clone_size)} THEN cdr3_len END) AS sd_cdr3_rest,
              COUNT(CASE WHEN unique_size < ${Number(min_clone_size)} THEN 1 END) AS n_rest,
              -- All clones
              AVG(cdr3_len) AS avg_cdr3_all,
              COUNT(*) AS n_all,
              s.identifier,
              cd.meta_keys AS keey,
              cd.meta_values AS valuee
            FROM clone_data cd
            JOIN subjects s ON cd.subject_id = s.id
            GROUP BY cd.subject_id, cd.meta_values, cd.meta_keys, s.identifier
            `;
            // Optional: filter to individuals with enough expanded clones
            if (min_expanded_clones > 0) {
                query += `HAVING COUNT(CASE WHEN unique_size >= ${Number(min_clone_size)} THEN 1 END) >= ${Number(min_expanded_clones)}`;
            }
        }

        const results = [];
        const [rows] = await connection.query(query, { replacements: params });
        for (const row of rows) results.push(row);

        const processedResults = results.map(row => ({
            ...row,
            values: row.valuee ? row.valuee.split(',') : [],
            keys: row.keey ? row.keey.split(',') : []
        }));

        processedResults.reduce((total, current) => {
            const data = [];
            data.push({ clone_id: "expanded_avg_cdr3", count: Number(current.avg_cdr3_expanded) });
            data.push({ clone_id: "expanded_sd_cdr3", count: Number(current.sd_cdr3_expanded) });
            data.push({ clone_id: "expanded_n", count: Number(current.n_expanded) });
            data.push({ clone_id: "rest_avg_cdr3", count: Number(current.avg_cdr3_rest) });
            data.push({ clone_id: "rest_sd_cdr3", count: Number(current.sd_cdr3_rest) });
            data.push({ clone_id: "rest_n", count: Number(current.n_rest) });
            data.push({ clone_id: "all_avg_cdr3", count: Number(current.avg_cdr3_all) });
            data.push({ clone_id: "all_n", count: Number(current.n_all) });

            const payload = {
                repertoire: {
                    repertoire_id: `${connection.config.database}-${current.identifier}`,
                    meta_key: current.keys,
                    meta_value: current.values
                },
                statistics: [{
                    statistic_name: `cdr3_by_clone_size_threshold_${min_clone_size}`,
                    total: null,
                    stats_value: data,
                }],
            };
            resultsFinal.push(payload);
            return total;
        }, {});
    }

    const finalPayload = {
        "Info": {
            "title": "iReceptorPlus Statistics API",
            "version": "0.3.0",
            "description": "Statistics API for the iReceptor Plus platform",
            "contact": {
                "name": "iReceptor Plus",
                "url": "https://www.ireceptor-plus.com",
                "email": "info@ireceptor-plus.com"
            }
        },
        "Result": resultsFinal,
    };

    res.status(200).json(finalPayload);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: error.message });
    }
};
