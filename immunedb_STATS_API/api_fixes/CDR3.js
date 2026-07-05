
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
    let whereParams = [];
    let sumParams = [];

    KeyName.forEach((key, index) => {
        const value = ValueName[index];
        if (value === 'ALL') {
            whereClauses.push(`(sm.key = ? AND sm.value != 'NA')`);
            whereParams.push(key);
        } else {
            whereClauses.push(`(sm.key = ? AND sm.value = ?)`);
            whereParams.push(key, value);
        }
    });
    KeyName.forEach((key, index) => {
        SUMClauses.push(`(sm.key = ?)`);
        sumParams.push(key);
    });

    // filtered_samples CTE: find sample_ids that match ALL requested metadata.
    // This restricts computation to only samples from the correct tissue/disease/etc.
    const filteredSamplesCTE = `
    filtered_samples AS (
      SELECT sm.sample_id
      FROM sample_metadata sm
      WHERE (${whereClauses.join(' OR ')})
      GROUP BY sm.sample_id
      HAVING (${SUMClauses.map(clause => `SUM(${clause})`).join(' > 0 AND ')}) > 0
    )`;

    // params: CTE(where+sum) + outer(where+sum)
    const params = [...whereParams, ...sumParams, ...whereParams, ...sumParams];


// FIX v2: Filter clone_stats to only matching samples BEFORE ranking/aggregation,
// so CDR3 averages are computed per-tissue (not across all tissues).
if (statistics[0] == "topX_nt_AVG_CDR3_length"){
    query = `
    WITH ${filteredSamplesCTE},
   ranked_clones AS (
    SELECT
        clones.id,
        clones.subject_id,
        cdr3_num_nts ,
        clone_stats.sample_id,
        overall_total_cnt,
        ROW_NUMBER() OVER (PARTITION BY subject_id ORDER BY overall_total_cnt DESC) AS rn
    FROM
        clones
    JOIN clone_stats on clones.id = clone_stats.clone_id
        where clones.functional=1 and sample_id is not null
          AND clone_stats.sample_id IN (SELECT sample_id FROM filtered_samples)
`
if (connection.config.database == "sykesIgblast"){
    query += `AND clones.subject_id  not IN (12,13,11,14,15,22,19,18) `
}
query +=`),
top_10 AS (
    SELECT
        id,
        sample_id,
        subject_id,
        avg(cdr3_num_nts) AS avg_10
    FROM
        ranked_clones
    WHERE
        rn <= 10
    GROUP BY
       subject_id, id, sample_id
),
top_100 AS (
    SELECT
         id,
         sample_id,
        subject_id,
        avg(cdr3_num_nts) AS avg_100
    FROM
        ranked_clones
    WHERE
        rn <= 100
   GROUP BY
       subject_id, id, sample_id
),
top_1000 AS (
    SELECT
       id,
       sample_id,
        subject_id,
        avg(cdr3_num_nts) AS avg_1000
    FROM
        ranked_clones
    WHERE
        rn <= 1000
    GROUP BY
       subject_id, id, sample_id
)
SELECT
    agg.subject_id,
    agg.total_avg_10,
    agg.total_avg_100,
    agg.total_avg_1000,
    agg.identifier,
    GROUP_CONCAT(DISTINCT sm.key ORDER BY sm.key SEPARATOR ', ') AS keey,
    GROUP_CONCAT(DISTINCT sm.value ORDER BY sm.key SEPARATOR ', ') AS valuee
FROM (
    SELECT
        ts10.subject_id,
        avg(ts10.avg_10) AS total_avg_10,
        avg(ts100.avg_100) AS total_avg_100,
        avg(ts1000.avg_1000) AS total_avg_1000,
        s.identifier,
        MIN(ts10.sample_id) AS sample_id
    FROM
        top_10 ts10
    JOIN
        top_100 ts100 ON ts10.subject_id = ts100.subject_id AND ts10.sample_id = ts100.sample_id
    JOIN
        top_1000 ts1000 ON ts10.subject_id = ts1000.subject_id AND ts10.sample_id = ts1000.sample_id
    JOIN
        subjects s ON ts10.subject_id = s.id
    GROUP BY
        ts10.subject_id, s.identifier
) agg
JOIN
    sample_metadata sm ON sm.sample_id = agg.sample_id
WHERE
    (${whereClauses.join(' OR ')})
GROUP BY
    agg.subject_id, agg.identifier
HAVING
    (${SUMClauses.map(clause => `SUM(${clause})`).join(' > 0 AND ')}) > 0
`;
}

if (statistics[0] == "topX_AA_AVG_CDR3_length"){
    query = `
    WITH ${filteredSamplesCTE},
   ranked_clones AS (
    SELECT
        clones.id,
        clones.subject_id,
        length(cdr3_aa) AS CDR3_AA_length ,
        clone_stats.sample_id,
        overall_total_cnt,
        ROW_NUMBER() OVER (PARTITION BY subject_id ORDER BY overall_total_cnt DESC) AS rn
    FROM
        clones
    JOIN clone_stats on clones.id = clone_stats.clone_id
        where clones.functional=1 AND clone_stats.sample_id is not null
          AND clone_stats.sample_id IN (SELECT sample_id FROM filtered_samples)
`
if (connection.config.database == "sykesIgblast"){
    query += `AND clones.subject_id  not IN (12,13,11,14,15,22,19,18) `
}
query +=` ), top_10 AS (
    SELECT
        id,
        sample_id,
        subject_id,
        avg(CDR3_AA_length) AS avg_10
    FROM
        ranked_clones
    WHERE
        rn <= 10
    GROUP BY
       subject_id, id, sample_id
),
top_100 AS (
    SELECT
         id,
         sample_id,
        subject_id,
        avg(CDR3_AA_length) AS avg_100
    FROM
        ranked_clones
    WHERE
        rn <= 100
   GROUP BY
       subject_id, id, sample_id
),
top_1000 AS (
    SELECT
       id,
       sample_id,
        subject_id,
        avg(CDR3_AA_length) AS avg_1000
    FROM
        ranked_clones
    WHERE
        rn <= 1000
    GROUP BY
       subject_id, id, sample_id
)
SELECT
    agg.subject_id,
    agg.total_avg_10_AA,
    agg.total_avg_100_AA,
    agg.total_avg_1000_AA,
    agg.identifier,
    GROUP_CONCAT(DISTINCT sm.key ORDER BY sm.key SEPARATOR ', ') AS keey,
    GROUP_CONCAT(DISTINCT sm.value ORDER BY sm.key SEPARATOR ', ') AS valuee
FROM (
    SELECT
        ts10.subject_id,
        avg(ts10.avg_10) AS total_avg_10_AA,
        avg(ts100.avg_100) AS total_avg_100_AA,
        avg(ts1000.avg_1000) AS total_avg_1000_AA,
        s.identifier,
        MIN(ts10.sample_id) AS sample_id
    FROM
        top_10 ts10
    JOIN
        top_100 ts100 ON ts10.subject_id = ts100.subject_id AND ts10.sample_id = ts100.sample_id
    JOIN
        top_1000 ts1000 ON ts10.subject_id = ts1000.subject_id AND ts10.sample_id = ts1000.sample_id
    JOIN
        subjects s ON ts10.subject_id = s.id
    GROUP BY
        ts10.subject_id, s.identifier
) agg
JOIN
    sample_metadata sm ON sm.sample_id = agg.sample_id
WHERE
    (${whereClauses.join(' OR ')})
GROUP BY
    agg.subject_id, agg.identifier
HAVING
    (${SUMClauses.map(clause => `SUM(${clause})`).join(' > 0 AND ')}) > 0
`;
}
     const results = [];
      const [rows] =  await connection.query(query, params);
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
