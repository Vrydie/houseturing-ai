const fs = require('fs');
const data = fs.readFileSync('out.json', 'utf8');
const lines = data.split('\n');
const jsonLine = lines.find(l => l.includes('{"level":'));
if (jsonLine) {
  try {
    const arr = JSON.parse(jsonLine);
    if (Array.isArray(arr)) {
      // Find the object with stack trace
      const err = arr.find(item => item && item.message && item.stack);
      if (err) {
        console.log("MESSAGE:", err.message);
        console.log("STACK:", err.stack);
      } else {
        // if the json is a flat array where strings are references
        const errIndex = arr.findIndex(item => typeof item === 'string' && item.includes('Error'));
        if (errIndex > -1) console.log(arr[errIndex]);
        
        // Find the index of the postgres node failure
        const postgresIdx = arr.findIndex(item => typeof item === 'string' && item.includes('Postgres'));
        console.log('Postgres indices:', arr.map((x, i) => typeof x === 'string' && (x.includes('Postgres') || x.includes('error')) ? `${i}: ${x}` : null).filter(Boolean));
        console.log(arr.slice(10, 30));
      }
    }
  } catch (e) {
    console.log("Could not parse json");
  }
}
