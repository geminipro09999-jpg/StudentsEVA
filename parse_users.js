const fs = require('fs');
const pdf = require('pdf-parse');

let dataBuffer = fs.readFileSync('c:\\Users\\unico\\Desktop\\New folder (15)\\updated_users (1).pdf');

pdf(dataBuffer).then(function(data) {
    console.log(data.text);
});
