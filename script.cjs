const fs = require('fs');
let content = fs.readFileSync('src/data/productos.js', 'utf8');

// Fix 'Cama '
content = content.replace(/nombre: "Cama /g, 'nombre: "');

// Fix Maxima
content = content.replace(/nombre: "Maxima",/g, 'nombre: "MÁXIMO",');

// Fix Missisipi
content = content.replace(/nombre: "Missisipi",/g, 'nombre: "MISSISSIPPI",');

// Add Oslo
const osloLine = '  {id: 71,nombre: "Oslo",precio: 580,categoria: "Camas",subcategoria: "Camas Clásicas",imagen: "/muebles/oslo.png",desc: "Base Lisa Individual",tallas: [{nombre: "Individual 1,00x1,90 M",precio: 580},{nombre: "Matrimonial 1,40x1,90 M",precio: 655},{nombre: "Queen 1,60x1,90 M",precio: 765},{nombre: "King 2,00x2,00 M",precio: 850}]}';

content = content.replace('  {id: 70,nombre: "Mesa Paris",precio: 170,categoria: "Mesas",imagen: "/mesas/paris.png",desc: "Diseño Exclusivo"}', '  {id: 70,nombre: "Mesa Paris",precio: 170,categoria: "Mesas",imagen: "/mesas/paris.png",desc: "Diseño Exclusivo"},\n' + osloLine);

// Add subcategories
const lines = content.split('\n');
const newLines = lines.map(line => {
  if (line.includes('categoria: "Camas"') && !line.includes('subcategoria:')) {
    let sub = 'Camas Clásicas';
    if (line.includes('MÁXIMO')) {
      sub = 'Camas Kids';
    } else {
      const match = line.match(/precio: (\d+)/);
      if (match && parseInt(match[1]) >= 880) {
        sub = 'Camas Alta Gama';
      }
    }
    return line.replace('categoria: "Camas"', 'categoria: "Camas", subcategoria: "' + sub + '"');
  }
  return line;
});

fs.writeFileSync('src/data/productos.js', newLines.join('\n'), 'utf8');
console.log("Success");
