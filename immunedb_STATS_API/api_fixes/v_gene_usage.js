
const mysql = require('mysql2/promise');
const connections = require("../db/connections");

exports.getVGeneUsage = async (req, res) => {
    try {
    const resultsFinal= [];
    const { repertoires, statistics } = req.body;

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

    if (statistics[0] == "v_gene_usage") {
        query = `
        WITH ${sampleMetaCTE}
        SELECT
          cs.subject_id,
          c.v_gene,
          COUNT(DISTINCT c.id) AS clone_count,
          SUM(cs.total_cnt) AS total_copies,
          s.identifier,
          sma.meta_keys AS keey,
          sma.meta_values AS valuee
        FROM clones c
        JOIN clone_stats cs ON c.id = cs.clone_id
        JOIN sample_meta sma ON sma.sample_id = cs.sample_id
        JOIN subjects s ON c.subject_id = s.id
        WHERE c.functional = 1 AND cs.sample_id IS NOT NULL
    `;
        if (connection.config.database == "sykesIgblast") {
            query += `AND c.subject_id NOT IN (12,13,11,14,15,22,19,18) `;
        }
        query += `
        GROUP BY cs.subject_id, c.v_gene, sma.meta_values, sma.meta_keys, s.identifier
        `;
    }

    const results = [];
    const [rows] = await connection.query(query, { replacements: params });
    for (const row of rows) results.push(row);

    const processedResults = results.map(row => ({
      ...row,
      values: row.valuee ? row.valuee.split(',') : [],
      keys: row.keey ? row.keey.split(',') : []
    }));

    const subjectGenes = {};
    for (const current of processedResults) {
        const subjectKey = `${current.subject_id}_${current.valuee}`;
        if (!subjectGenes[subjectKey]) {
            subjectGenes[subjectKey] = {
                subject_id: current.subject_id,
                identifier: current.identifier,
                keys: current.keys,
                values: current.values,
                genes: []
            };
        }
        subjectGenes[subjectKey].genes.push({
            clone_id: current.v_gene,
            count: Number(current.clone_count),
            copies: Number(current.total_copies)
        });
    }

    for (const key of Object.keys(subjectGenes)) {
        const subj = subjectGenes[key];
        const payload = {
            repertoire: {
                repertoire_id: `${connection.config.database}-${subj.identifier}`,
                meta_key: subj.keys,
                meta_value: subj.values
            },
            statistics: [
                {
                    statistic_name: statistics[0],
                    total: null,
                    stats_value: subj.genes,
                },
            ],
        };
        resultsFinal.push(payload);
    }

}

    const finalPayload = {
      "Info":
      {
          "title": "iReceptorPlus Statistics API",
          "version": "0.3.0",
          "description": " Statistics API for the iReceptor Plus platform",
          "contact":
          {
              "name": "iReceptor Plus",
              "url": "https://www.ireceptor-plus.com",
              "email": "info@ireceptor-plus.com"
          }
      },
     "Result" : resultsFinal,
    };

    res.status(200).json(finalPayload);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
};
