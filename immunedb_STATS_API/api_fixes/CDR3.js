
const mysql = require('mysql2/promise');
const connections = require("../db/connections");

exports.getCDR3Length = async (req, res) => {
    try {
    const resultsFinal= [];
    const { repertoires, statistics } = req.body;

    const statisticsLength = statistics.length;
    let clonesBySubjects;
    let query;

    const KeyName = repertoires.meta_key;
    const ValueName = repertoires.meta_value;


for (const connection of connections) {
  let totaValue;
  let whereClauses = [];
    let SUMClauses =[];
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

    // sample_meta CTE: one row per sample with a metadata fingerprint.
    // Grouping by (subject_id, meta_fp) merges samples with identical metadata.
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


if (statistics[0] == "topX_nt_AVG_CDR3_length"){
    query = `
    WITH ${sampleMetaCTE},
    clone_cdr3 AS (
      SELECT clones.subject_id, clones.id AS clone_id, sma.meta_values, sma.meta_keys,
        cdr3_num_nts AS cdr3_len,
        SUM(cs.total_cnt) AS total_copies
      FROM clones
      JOIN clone_stats cs ON clones.id = cs.clone_id
      JOIN sample_meta sma ON sma.sample_id = cs.sample_id
      WHERE clones.functional = 1 AND cs.sample_id IS NOT NULL
`
if (connection.config.database == "sykesIgblast"){
    query += `AND clones.subject_id NOT IN (12,13,11,14,15,22,19,18) `
}
query += `
      GROUP BY clones.subject_id, clones.id, sma.meta_values, sma.meta_keys
    ),
    ranked_clones AS (
      SELECT *, ROW_NUMBER() OVER (PARTITION BY subject_id, meta_values ORDER BY total_copies DESC) AS rn
      FROM clone_cdr3
    )
    SELECT
      rc.subject_id,
      AVG(CASE WHEN rn <= 10 THEN cdr3_len END) AS total_avg_10,
      AVG(CASE WHEN rn <= 100 THEN cdr3_len END) AS total_avg_100,
      AVG(CASE WHEN rn <= 1000 THEN cdr3_len END) AS total_avg_1000,
      s.identifier,
      rc.meta_keys AS keey,
      rc.meta_values AS valuee
    FROM ranked_clones rc
    JOIN subjects s ON rc.subject_id = s.id
    GROUP BY rc.subject_id, rc.meta_values, rc.meta_keys, s.identifier
`;
}

if (statistics[0] == "topX_AA_AVG_CDR3_length"){
    query = `
    WITH ${sampleMetaCTE},
    clone_cdr3 AS (
      SELECT clones.subject_id, clones.id AS clone_id, sma.meta_values, sma.meta_keys,
        LENGTH(cdr3_aa) AS cdr3_len,
        SUM(cs.total_cnt) AS total_copies
      FROM clones
      JOIN clone_stats cs ON clones.id = cs.clone_id
      JOIN sample_meta sma ON sma.sample_id = cs.sample_id
      WHERE clones.functional = 1 AND cs.sample_id IS NOT NULL
`
if (connection.config.database == "sykesIgblast"){
    query += `AND clones.subject_id NOT IN (12,13,11,14,15,22,19,18) `
}
query += `
      GROUP BY clones.subject_id, clones.id, sma.meta_values, sma.meta_keys
    ),
    ranked_clones AS (
      SELECT *, ROW_NUMBER() OVER (PARTITION BY subject_id, meta_values ORDER BY total_copies DESC) AS rn
      FROM clone_cdr3
    )
    SELECT
      rc.subject_id,
      AVG(CASE WHEN rn <= 10 THEN cdr3_len END) AS total_avg_10_AA,
      AVG(CASE WHEN rn <= 100 THEN cdr3_len END) AS total_avg_100_AA,
      AVG(CASE WHEN rn <= 1000 THEN cdr3_len END) AS total_avg_1000_AA,
      s.identifier,
      rc.meta_keys AS keey,
      rc.meta_values AS valuee
    FROM ranked_clones rc
    JOIN subjects s ON rc.subject_id = s.id
    GROUP BY rc.subject_id, rc.meta_values, rc.meta_keys, s.identifier
`;
}
     const results = [];
      const [rows] =  await connection.query(query, { replacements: params });
      results.push(...rows);


    const processedResults = results.map(row => ({
      ...row,
      values: row.valuee ? row.valuee.split(',') : [],
      keys: row.keey ? row.keey.split(',') : []
    }));


            clonesBySubjects = processedResults.reduce((total, current)=>{
            let subjectsArray = {...total}

            currentSubject = current.subject_id

            if (!total[currentSubject]) {
              subjectsArray[currentSubject] = {
                subject_id:currentSubject,
                clones:[]
              }
            }

            subjectsArray[currentSubject] = {
              ...subjectsArray[currentSubject],
              clones: [...subjectsArray[currentSubject].clones, current]
            }
             const data = [];
            if (statistics[0] == "topX_nt_AVG_CDR3_length"){
                data.push({
                  clone_id: "Top_10_nt",
                  count: Number(current.total_avg_10)
                });
               data.push({
                  clone_id: "Top_100_nt",
                  count: Number(current.total_avg_100)
                });

               data.push({
                  clone_id: "Top_1000_nt",
                  count: Number(current.total_avg_1000)
                });
            }

            if (statistics[0] == "topX_AA_AVG_CDR3_length"){
                data.push({
                  clone_id: "Top_10_AA",
                  count: Number(current.total_avg_10_AA)
                });
               data.push({
                  clone_id: "Top_100_AA",
                  count: Number(current.total_avg_100_AA)
                });

               data.push({
                  clone_id: "Top_1000_AA",
                  count: Number(current.total_avg_1000_AA)
                });
            }



                        payload = {
              repertoire: {
                repertoire_id: `${connection.config.database}-${ current.identifier}`,
                meta_key: current.keys,
                meta_value: current.values
              },
              statistics: [
                {
                  statistic_name: statistics[0],
                  total: null,
                  stats_value: data,
                },
              ],
            };
             resultsFinal.push(payload);
            return subjectsArray
          },{})



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
