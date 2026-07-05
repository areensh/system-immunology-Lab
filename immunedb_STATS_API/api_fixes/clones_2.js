
const mysql = require('mysql2/promise');
const connections = require("../db/connections");

exports.getClonesCount = async (req, res) => {
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

    // Construct the WHERE clause dynamically — always use 'sm' alias
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


// Aggregate per sample (not per subject) so each sample gets its own metadata.
// This avoids mixing data from different tissues/timepoints within a subject,
// and ensures the metadata labels (tissue, disease, etc.) are accurate per row.
if (statistics[0] == "clone_size"){
    query = `
      SELECT cs_agg.clone_id,
        MAX(cs_agg.count) AS count,
        cs_agg.subject_id,
        s.identifier,
        GROUP_CONCAT(DISTINCT sm.value ORDER BY sm.key SEPARATOR ',') AS valuee,
        GROUP_CONCAT(DISTINCT sm.key ORDER BY sm.key SEPARATOR ',') AS keey
      FROM (
        SELECT clone_id, SUM(unique_cnt) AS count, subject_id, sample_id
        FROM clone_stats
        GROUP BY sample_id, subject_id, clone_id
        HAVING count > 20
      ) cs_agg
      JOIN
        sample_metadata sm ON sm.sample_id = cs_agg.sample_id
      JOIN
        subjects s ON cs_agg.subject_id = s.id
      WHERE
        ${whereClauses.join(' OR ')}
      GROUP BY
        cs_agg.sample_id, cs_agg.subject_id, cs_agg.clone_id, s.identifier
      HAVING
        ( ${SUMClauses.map(clause => `SUM(${clause})`).join(' > 0 AND ')} > 0 )
    `;
}

if (statistics[0] == "clone_count" ){
    query = `
      SELECT
        s.identifier,
        cs_agg.subject_id,
        MAX(cs_agg.count) AS count,
        GROUP_CONCAT(DISTINCT sm.value ORDER BY sm.key SEPARATOR ',') AS valuee,
        GROUP_CONCAT(DISTINCT sm.key ORDER BY sm.key SEPARATOR ',') AS keey
      FROM (
        SELECT subject_id, sample_id, COUNT(DISTINCT clone_id) AS count
        FROM clone_stats
        GROUP BY subject_id, sample_id
      ) cs_agg
      JOIN
        sample_metadata sm ON sm.sample_id = cs_agg.sample_id
      JOIN
        subjects s ON cs_agg.subject_id = s.id
      WHERE
        ${whereClauses.join(' OR ')}
      GROUP BY
        cs_agg.subject_id, cs_agg.sample_id, s.identifier
      HAVING
        (${SUMClauses.map(clause => `SUM(${clause})`).join(' > 0 AND ')}) > 0;` ;
}


if (statistics[0] == "topX_clone_size_copies"){
    query = `
    WITH ranked_clones AS (
    SELECT
        sample_id,
        subject_id,
        total_cnt AS copies,
        ROW_NUMBER() OVER (PARTITION BY sample_id ORDER BY total_cnt DESC) AS rn
    FROM
        clone_stats
    WHERE clone_stats.functional = 1 AND sample_id IS NOT NULL

),
top_10 AS (
    SELECT
        sample_id,
        subject_id,
        SUM(copies) AS sum_10
    FROM
        ranked_clones
    WHERE
        rn <= 10
    GROUP BY
        sample_id, subject_id
),
top_100 AS (
    SELECT
        sample_id,
        subject_id,
        SUM(copies) AS sum_100
    FROM
        ranked_clones
    WHERE
        rn <= 100
    GROUP BY
        sample_id, subject_id
),
top_1000 AS (
    SELECT
        sample_id,
        subject_id,
        SUM(copies) AS sum_1000
    FROM
        ranked_clones
    WHERE
        rn <= 1000
    GROUP BY
        sample_id, subject_id
),
total_sum AS (
    SELECT
        sample_id,
        subject_id,
        SUM(total_cnt) AS total_sum
    FROM
        clone_stats
    GROUP BY
        sample_id, subject_id
)
SELECT
    ts10.subject_id,
    MAX(ts10.sum_10) AS total_sum_10,
    MAX(ts100.sum_100) AS total_sum_100,
    MAX(ts1000.sum_1000) AS total_sum_1000,
    MAX(ts.total_sum) AS total_sum,
    s.identifier,
    GROUP_CONCAT(DISTINCT sm.key ORDER BY sm.key SEPARATOR ', ') AS keey,
    GROUP_CONCAT(DISTINCT sm.value ORDER BY sm.key SEPARATOR ', ') AS valuee
FROM
    top_10 ts10
JOIN
    top_100 ts100 ON ts10.sample_id = ts100.sample_id
JOIN
    top_1000 ts1000 ON ts10.sample_id = ts1000.sample_id
JOIN
    total_sum ts ON ts10.sample_id = ts.sample_id
JOIN
    subjects s ON ts10.subject_id = s.id
JOIN
    sample_metadata sm ON ts10.sample_id = sm.sample_id
WHERE
    (${whereClauses.join(' OR ')})
GROUP BY
    ts10.subject_id, ts10.sample_id, s.identifier
HAVING
    (${SUMClauses.map(clause => `SUM(${clause})`).join(' > 0 AND ')}) > 0
`;
}




     const results = [];
      const [rows] = await connection.query(query, { replacements: params });
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
             const count = Number(current.count)

             if (statistics[0] =="clone_count"){
              totaValue = null
              data.push({
                  clone_id: "ALL",
                  count: count
                });
             }
             if ( statistics[0] =="topX_clone_size_copies"){
              totaValue = Number(current.total_sum)
               data.push({
                  clone_id: "Top_10",
                  count: Number(current.total_sum_10)
                });
               data.push({
                  clone_id: "Top_100",
                  count: Number(current.total_sum_100)
                });

               data.push({
                  clone_id: "Top_1000",
                  count: Number(current.total_sum_1000)
                });
             }
             if ( statistics[0] =="clone_size"){
              totaValue = null
              data.push({
                  clone_id: current.clone_id,
                  count: count
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
                  total: totaValue,
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


exports.getClonesForMAya = async (req, res) => {
  try {
    const results = [];


    let clonesBySubjects;
    let query;
    query = `SELECT distinct clone_id, sum(unique_cnt) as count, subject_id, sample_metadata.value,sample_metadata.key FROM clone_stats join sample_metadata on sample_metadata.sample_id = clone_stats.sample_id where sample_metadata.key= 'sex'`;

    query += `
        GROUP BY subject_id,clone_id, sample_metadata.value, sample_metadata.key
    `;
            let row;
            let payload;
            const [rows] = await connections[1].query(query);
            clonesBySubjects = rows.reduce((total, current)=>{
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
             const count = Number(current.count)
                data.push({
                  clone_id: current.clone_id,
                  count: count
                });
                        payload = {
              repertoire: {
                repertoire_id: `${connections[1].config.database}-${ current.subject_id}`,
                meta_key: "sex",
                meta_value: current.value
              },
              statistics: [
                {
                  statistic_name: "clone_size",
                  total: null,
                  stats_value: data,
                },
              ],
            };
             results.push(payload);
            return subjectsArray
          },{})






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
     Result: results,
    };

    res.status(200).json(finalPayload);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
};
