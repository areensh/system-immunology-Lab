
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

    // sample_meta CTE: one row per sample with a metadata fingerprint.
    // Samples with identical metadata for all requested keys share the same fingerprint.
    // Grouping by (subject_id, meta_fp) merges those samples so COUNT(DISTINCT)
    // and SUM work correctly without double-counting across samples that share metadata.
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


if (statistics[0] == "clone_size"){
    query = `
      WITH ${sampleMetaCTE}
      SELECT cs.clone_id,
        SUM(cs.unique_cnt) AS count,
        cs.subject_id,
        s.identifier,
        sma.meta_values AS valuee,
        sma.meta_keys AS keey
      FROM clone_stats cs
      JOIN sample_meta sma ON sma.sample_id = cs.sample_id
      JOIN subjects s ON cs.subject_id = s.id
      GROUP BY
        cs.subject_id, cs.clone_id, sma.meta_values, sma.meta_keys, s.identifier
      HAVING
        SUM(cs.unique_cnt) > 20
    `;
}

if (statistics[0] == "clone_count" ){
    query = `
      WITH ${sampleMetaCTE}
      SELECT
        s.identifier,
        cs.subject_id,
        COUNT(DISTINCT cs.clone_id) AS count,
        sma.meta_values AS valuee,
        sma.meta_keys AS keey
      FROM clone_stats cs
      JOIN sample_meta sma ON sma.sample_id = cs.sample_id
      JOIN subjects s ON cs.subject_id = s.id
      GROUP BY
        cs.subject_id, sma.meta_values, sma.meta_keys, s.identifier;` ;
}


if (statistics[0] == "topX_clone_size_copies"){
    query = `
    WITH ${sampleMetaCTE},
    clone_totals AS (
      SELECT cs.subject_id, cs.clone_id, sma.meta_values, sma.meta_keys,
        SUM(cs.total_cnt) AS total_copies
      FROM clone_stats cs
      JOIN sample_meta sma ON sma.sample_id = cs.sample_id
      WHERE cs.functional = 1
      GROUP BY cs.subject_id, cs.clone_id, sma.meta_values, sma.meta_keys
    ),
    ranked_clones AS (
      SELECT subject_id, clone_id, meta_values, meta_keys, total_copies,
        ROW_NUMBER() OVER (PARTITION BY subject_id, meta_values ORDER BY total_copies DESC) AS rn
      FROM clone_totals
    )
    SELECT
      rc.subject_id,
      SUM(CASE WHEN rn <= 10 THEN total_copies ELSE 0 END) AS total_sum_10,
      SUM(CASE WHEN rn <= 100 THEN total_copies ELSE 0 END) AS total_sum_100,
      SUM(CASE WHEN rn <= 1000 THEN total_copies ELSE 0 END) AS total_sum_1000,
      SUM(total_copies) AS total_sum,
      s.identifier,
      rc.meta_keys AS keey,
      rc.meta_values AS valuee
    FROM ranked_clones rc
    JOIN subjects s ON rc.subject_id = s.id
    GROUP BY rc.subject_id, rc.meta_values, rc.meta_keys, s.identifier
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
