const fs = require('fs');
const path = require('path');
const swaggerSpec = require('./swagger');

const rootOutputPath = path.join(__dirname, 'openapi.json');
const interfacesDir = path.join(__dirname, 'interfaces');
const interfacesOutputPath = path.join(interfacesDir, 'openapi.json');

if (!fs.existsSync(interfacesDir)) {
  fs.mkdirSync(interfacesDir, { recursive: true });
}

const json = JSON.stringify(swaggerSpec, null, 2);
fs.writeFileSync(rootOutputPath, json);
fs.writeFileSync(interfacesOutputPath, json);
