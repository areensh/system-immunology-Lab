
const mysql = require('mysql2/promise');
const connections = require("../db/connections");

// New statistic: mutation levels and NS/S ratio for expanded vs non-expanded clones
// Split clones by a size threshold (min_clone_size, default 20 unique sequences)
// Returns mutation averages for "expanded" (>= threshold) and "rest" (< threshold) separately

exports.getMutationByCloneSize = async (req, res) => {
    try {
    const resultsFinal = [];
    const { repertoires, statistics } = req.body;

    const min_clone_size = req.body.min_clone_size || 20;
    const min_expanded_clones = req.body.min_expanded_clones || 0;

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

        if (statistics[0] === "mutation_rs_by_clone_size") {
            query = `
            WITH ${sampleMetaCTE},
            clone_data AS (
              SELECT cs.subject_id, cs.clone_id, sma.meta_values, sma.meta_keys,
                SUM(cs.unique_cnt) AS unique_size,
                -- CDR NS/S counts per clone
                AVG(
                  COALESCE(JSON_LENGTH(JSON_EXTRACT(cs.mutations, '$.regions.CDR1.conservative')), 0) +
                  COALESCE(JSON_LENGTH(JSON_EXTRACT(cs.mutations, '$.regions.CDR1.nonconservative')), 0) +
                  COALESCE(JSON_LENGTH(JSON_EXTRACT(cs.mutations, '$.regions.CDR2.conservative')), 0) +
                  COALESCE(JSON_LENGTH(JSON_EXTRACT(cs.mutations, '$.regions.CDR2.nonconservative')), 0) +
                  COALESCE(JSON_LENGTH(JSON_EXTRACT(cs.mutations, '$.regions.CDR3.conservative')), 0) +
                  COALESCE(JSON_LENGTH(JSON_EXTRACT(cs.mutations, '$.regions.CDR3.nonconservative')), 0)
                ) AS cdr_replacement,
                AVG(
                  COALESCE(JSON_LENGTH(JSON_EXTRACT(cs.mutations, '$.regions.CDR1.synonymous')), 0) +
                  COALESCE(JSON_LENGTH(JSON_EXTRACT(cs.mutations, '$.regions.CDR2.synonymous')), 0) +
                  COALESCE(JSON_LENGTH(JSON_EXTRACT(cs.mutations, '$.regions.CDR3.synonymous')), 0)
                ) AS cdr_synonymous,
                -- FW NS/S counts per clone
                AVG(
                  COALESCE(JSON_LENGTH(JSON_EXTRACT(cs.mutations, '$.regions.FW1.conservative')), 0) +
                  COALESCE(JSON_LENGTH(JSON_EXTRACT(cs.mutations, '$.regions.FW1.nonconservative')), 0) +
                  COALESCE(JSON_LENGTH(JSON_EXTRACT(cs.mutations, '$.regions.FW2.conservative')), 0) +
                  COALESCE(JSON_LENGTH(JSON_EXTRACT(cs.mutations, '$.regions.FW2.nonconservative')), 0) +
                  COALESCE(JSON_LENGTH(JSON_EXTRACT(cs.mutations, '$.regions.FW3.conservative')), 0) +
                  COALESCE(JSON_LENGTH(JSON_EXTRACT(cs.mutations, '$.regions.FW3.nonconservative')), 0) +
                  COALESCE(JSON_LENGTH(JSON_EXTRACT(cs.mutations, '$.regions.FW4.conservative')), 0) +
                  COALESCE(JSON_LENGTH(JSON_EXTRACT(cs.mutations, '$.regions.FW4.nonconservative')), 0)
                ) AS fw_replacement,
                AVG(
                  COALESCE(JSON_LENGTH(JSON_EXTRACT(cs.mutations, '$.regions.FW1.synonymous')), 0) +
                  COALESCE(JSON_LENGTH(JSON_EXTRACT(cs.mutations, '$.regions.FW2.synonymous')), 0) +
                  COALESCE(JSON_LENGTH(JSON_EXTRACT(cs.mutations, '$.regions.FW3.synonymous')), 0) +
                  COALESCE(JSON_LENGTH(JSON_EXTRACT(cs.mutations, '$.regions.FW4.synonymous')), 0)
                ) AS fw_synonymous,
                -- Total mutation count
                AVG(JSON_LENGTH(JSON_EXTRACT(cs.mutations, '$.positions'))) AS mutation_cnt
              FROM clone_stats cs
              JOIN sample_meta sma ON sma.sample_id = cs.sample_id
              WHERE cs.sample_id IS NOT NULL AND cs.functional = 1
                AND JSON_LENGTH(JSON_EXTRACT(cs.mutations, '$.positions')) > 0
            `;
            if (connection.config.database === "sykesIgblast") {
                query += `AND cs.subject_id NOT IN (12,13,11,14,15,22,19,18) `;
            }
            query += `
              GROUP BY cs.subject_id, cs.clone_id, sma.meta_values, sma.meta_keys
            )
            SELECT
              cd.subject_id,
              -- Expanded clones (>= threshold)
              AVG(CASE WHEN unique_size >= ${Number(min_clone_size)} THEN cdr_replacement END) AS expanded_cdr_ns,
              AVG(CASE WHEN unique_size >= ${Number(min_clone_size)} THEN cdr_synonymous END) AS expanded_cdr_s,
              AVG(CASE WHEN unique_size >= ${Number(min_clone_size)} THEN fw_replacement END) AS expanded_fw_ns,
              AVG(CASE WHEN unique_size >= ${Number(min_clone_size)} THEN fw_synonymous END) AS expanded_fw_s,
              AVG(CASE WHEN unique_size >= ${Number(min_clone_size)} THEN mutation_cnt END) AS expanded_mutation,
              COUNT(CASE WHEN unique_size >= ${Number(min_clone_size)} THEN 1 END) AS n_expanded,
              -- Non-expanded clones (< threshold)
              AVG(CASE WHEN unique_size < ${Number(min_clone_size)} THEN cdr_replacement END) AS rest_cdr_ns,
              AVG(CASE WHEN unique_size < ${Number(min_clone_size)} THEN cdr_synonymous END) AS rest_cdr_s,
              AVG(CASE WHEN unique_size < ${Number(min_clone_size)} THEN fw_replacement END) AS rest_fw_ns,
              AVG(CASE WHEN unique_size < ${Number(min_clone_size)} THEN fw_synonymous END) AS rest_fw_s,
              AVG(CASE WHEN unique_size < ${Number(min_clone_size)} THEN mutation_cnt END) AS rest_mutation,
              COUNT(CASE WHEN unique_size < ${Number(min_clone_size)} THEN 1 END) AS n_rest,
              COUNT(*) AS n_all,
              s.identifier,
              cd.meta_keys AS keey,
              cd.meta_values AS valuee
            FROM clone_data cd
            JOIN subjects s ON cd.subject_id = s.id
            GROUP BY cd.subject_id, cd.meta_values, cd.meta_keys, s.identifier
            `;
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
            // Expanded clone stats
            data.push({ clone_id: "expanded_cdr_ns", count: Number(current.expanded_cdr_ns) });
            data.push({ clone_id: "expanded_cdr_s", count: Number(current.expanded_cdr_s) });
            data.push({ clone_id: "expanded_fw_ns", count: Number(current.expanded_fw_ns) });
            data.push({ clone_id: "expanded_fw_s", count: Number(current.expanded_fw_s) });
            data.push({ clone_id: "expanded_mutation", count: Number(current.expanded_mutation) });
            data.push({ clone_id: "expanded_n", count: Number(current.n_expanded) });
            // Non-expanded clone stats
            data.push({ clone_id: "rest_cdr_ns", count: Number(current.rest_cdr_ns) });
            data.push({ clone_id: "rest_cdr_s", count: Number(current.rest_cdr_s) });
            data.push({ clone_id: "rest_fw_ns", count: Number(current.rest_fw_ns) });
            data.push({ clone_id: "rest_fw_s", count: Number(current.rest_fw_s) });
            data.push({ clone_id: "rest_mutation", count: Number(current.rest_mutation) });
            data.push({ clone_id: "rest_n", count: Number(current.n_rest) });
            data.push({ clone_id: "all_n", count: Number(current.n_all) });

            const payload = {
                repertoire: {
                    repertoire_id: `${connection.config.database}-${current.identifier}`,
                    meta_key: current.keys,
                    meta_value: current.values
                },
                statistics: [{
                    statistic_name: `mutation_rs_by_clone_size_threshold_${min_clone_size}`,
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
