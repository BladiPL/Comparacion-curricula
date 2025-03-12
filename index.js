const express = require('express');
const axios = require('axios');
const cors = require('cors');

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const app = express();
app.use(cors());

const API_URL = 'http://api-gestioncurricular-pregrado.unap.edu.pe/cursos_carga?prog=22';


app.get('/compare-curriculas', async (req, res) => {
    try {
        const response = await axios.get(API_URL);
        const data = response.data;

        const version1 = data.filter(item => item.version_currciula === 1);
        const version3 = data.filter(item => item.version_currciula === 2);
        if (!version1.length || !version3.length) {
            return res.status(404).json({ error: 'Una o ambas versiones curriculares no se encontraron' });
        }

        const differences = findDifferences(version1, version3);
        res.json(differences);

    } catch (error) {
        console.error('Error al procesar la solicitud:', error.message);
        res.status(500).json({ error: 'Error al procesar la solicitud' });
    }
});

// Endpoint para convertir CSV a JSON y comparar con la versión de la API
app.get('/compare-c1', async (req, res) => {
    const archivo = 'biologia pesqueria';
    const csvFilePath = path.join(__dirname, './Plan de Oti 21-25 v2.0/', `${archivo}.csv`);
    const csvFilePath2 = path.join(__dirname, './Plan de Oti 21-25 v2.0/', `${archivo}_c1.csv`);
    try {
        // Convertir CSV a JSON
        const version3 = await convertCsvToJson(csvFilePath);
        const version2 = await convertCsvToJson(csvFilePath2);

        // Obtener datos de la API
        const response = await axios.get(API_URL);
        const data = response.data;

        // Filtrar la versión 1 del currículum

        //const version1 = data.filter(item => item.version_currciula === 1);
        //const version1 = data.filter(item => item.version_currciula === 4);
        const version1 = data.filter(item => item.version_currciula === 2);
        if (!version1.length || !version3.length) {
            return res.status(404).json({ error: 'Una o ambas versiones curriculares no se encontraron' });
        }

        // Comparar las versiones
        const differences = diferencias2(version1,version2, version3);
        //const differences = diferencias(version1,version3)
        res.json(differences);

    } catch (error) {
        console.error('Error al procesar la solicitud:', error.message);
        res.status(500).json({ error: 'Error al procesar la solicitud' });
    }
});
/*
const results = [];
fs.access(csvFilePath, fs.constants.F_OK, (err) => {
    if (err) {
        return res.status(404).send('Archivo CSV no encontrado');
    }

    fs.createReadStream(csvFilePath)
        .pipe(csv({ separator: ';' })) // Especifica el delimitador

        .on('data', (data) => {
            results.push({
                curso_id: parseInt(data['n']),
                curso_codigo: data['Código'],
                curso_nombre: data['Curso'],
                curso_credito: parseInt(data['Cred.']),
                curso_ciclo: data['Ciclo'] 
            });
        })
        .on('end', () => {
            res.json(results);
        })
        .on('error', (err) => {
            res.status(500).send(`Error al procesar el archivo CSV: ${err.message}`);
        });
});
 
*/

function convertCsvToJson(csvFilePath) {
    return new Promise((resolve, reject) => {
        const results = [];

        fs.access(csvFilePath, fs.constants.F_OK, (err) => {
            if (err) {
                return reject(new Error('Archivo CSV no encontrado'));
            }

            fs.createReadStream(csvFilePath)
                .pipe(csv({ separator: ';' })) // Especifica el delimitador
                .on('data', (data) => {
                    results.push({
                        curso_id: parseInt(data['N']),
                        curso_codigo: data['CODIGO'],
                        curso_ciclo: data['CICLO'],
                        curso_nombre: data['CURSO'],
                        curso_ht: parseInt(data['HT']),
                        curso_hp: parseInt(data['HP']),
                        curso_totalh: parseInt(data['TH']),
                        curso_credito: parseInt(data['CRD']),
                        curso_pre: data['REQUE']
                    });
                })
                .on('end', () => {
                    resolve(results);
                })
                .on('error', (err) => {
                    reject(new Error(`Error al procesar el archivo CSV: ${err.message}`));
                });
        });
    });
}

// PARA DOS VERSIONES DENTRO DEL CURR
function findDifferences(version1, version3) {
    const cursos1 = version1[0]?.cursos || [];
    const cursos3 = version3[0]?.cursos || [];

    const combinedCourses = [];

    const map1 = new Map(cursos1.map(curso => [curso.curso_codigo, curso]));

    cursos3.forEach(curso3 => {
        const curso1 = map1.get(curso3.curso_codigo);

        if (curso1) {
            // Elimina los espacios antes y después del nombre
            const nombre1 = curso1.curso_nombre.trim().toUpperCase();
            const nombre3 = curso3.curso_nombre.trim().toUpperCase();

            const differences = [];

            if (nombre1 !== nombre3) differences.push('Nombre');
            if (curso1.curso_ht !== curso3.curso_ht) differences.push('HT');
            if (curso1.curso_hp !== curso3.curso_hp) differences.push('HP');
            if (curso1.curso_totalh !== curso3.curso_totalh) differences.push('TotalH');
            if (curso1.curso_credito !== curso3.curso_credito) differences.push('Credito');
            if (curso1.curso_areac !== curso3.curso_areac) differences.push('Areac');
            if (curso1.curso_ciclo !== curso3.curso_ciclo) differences.push('Ciclo');
            if (curso1.curso_tipo !== curso3.curso_tipo) differences.push('Tipo');
            if (curso1.curso_pre !== curso3.curso_pre) differences.push('Pre');
            if (curso1.curso_hvir !== curso3.curso_hvir) differences.push('Hvir');

            combinedCourses.push({
                ciclo1: curso1.curso_ciclo,
                areac1: curso1.curso_areac,
                codigo1: curso1.curso_codigo,
                nombre1: nombre1,
                ht1: curso1.curso_ht,
                hp1: curso1.curso_hp,
                th1: curso1.curso_totalh,
                creditos1: curso1.curso_credito,
                hv1: curso1.curso_hvir,
                pre1: curso1.curso_pre,

                ciclo3: curso3.curso_ciclo,
                areac3: curso3.curso_areac,
                codigo3: curso3.curso_codigo,
                nombre3: nombre3,
                ht3: curso3.curso_ht,
                hp3: curso3.curso_hp,
                th3: curso3.curso_totalh,
                creditos3: curso3.curso_credito,
                hv3: curso3.curso_hvir,
                pre3: curso3.curso_pre,

                result: differences.length > 0 ? `Diferente en: ${differences.join(', ')}` : 'Igual'
            });

            map1.delete(curso3.curso_codigo);
        } else {
            combinedCourses.push({
                ciclo1: '',
                areac1: '',
                codigo1: '',
                nombre1: '',
                ht1: '',
                hp1: '',
                th1: '',
                creditos1: '',
                hv1: '',
                pre1: '',

                ciclo3: curso3.curso_ciclo,
                areac3: curso3.curso_areac,
                codigo3: curso3.curso_codigo,
                nombre3: curso3.curso_nombre.trim(), // También elimina espacios aquí
                ht3: curso3.curso_ht,
                hp3: curso3.curso_hp,
                th3: curso3.curso_totalh,
                creditos3: curso3.curso_credito,
                hv3: curso3.curso_hvir,
                pre3: curso3.curso_pre,

                result: 'Solo en version 2.0'
            });
        }
    });

    map1.forEach((curso1) => {
        combinedCourses.push({
            ciclo1: curso1.curso_ciclo,
            areac1: curso1.curso_areac,
            codigo1: curso1.curso_codigo,
            nombre1: curso1.curso_nombre.trim(), // Elimina espacios aquí también
            ht1: curso1.curso_ht,
            hp1: curso1.curso_hp,
            th1: curso1.curso_totalh,
            creditos1: curso1.curso_credito,
            hv1: curso1.curso_hvir,
            pre1: curso1.curso_pre,

            ciclo3: '',
            areac3: '',
            codigo3: '',
            nombre3: '',
            ht3: '',
            hp3: '',
            th3: '',
            creditos3: '',
            hv3: '',
            pre3: '',

            result: 'Solo en version 1'
        });
    });

    return combinedCourses;
}
function sintilde(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

}

function diferencias1(version1, oti) {
    const cursos1 = version1[0]?.cursos || [];
    const cursos3 = Array.isArray(oti) ? oti : [];
    const combinedCourses = new Map();


    // Crear mapas para código a nombre
    const mapCodigoANombre1 = new Map(cursos1.map(curso => [curso.curso_codigo, curso.curso_nombre]));
    const mapCodigoANombre3 = new Map(cursos3.map(curso => [curso.curso_codigo, curso.curso_nombre]));

    // Función para obtener el prerrequisito formateado
    function obtenerPrerrequisito(pre, mapa) {
        if (!pre) return ''; // Si no hay prerrequisito, retornar vacío
        return pre.split(',').map(codigo => {
            const nombre = mapa.get(codigo.trim()) || '';
            return `${codigo.trim()} - ${nombre}`;
        }).join(', ');
    }

    // Crear un Map para los cursos de la primera versión, usando el nombre normalizado del curso como clave
    const map1 = new Map(
        cursos1.map(curso => [sintilde(curso.curso_nombre.trim().toUpperCase()), curso])
    );

    cursos3.forEach(curso3 => {
        const nombre3Normalizado = sintilde(curso3.curso_nombre.trim().toUpperCase());
        const curso1 = map1.get(nombre3Normalizado);

        if (curso1) {
            const differences = [];

            if (curso1.curso_ht !== curso3.curso_ht) differences.push('HT');
            if (curso1.curso_hp !== curso3.curso_hp) differences.push('HP');
            if (curso1.curso_totalh !== curso3.curso_totalh) differences.push('TotalH');
            if (curso1.curso_credito !== curso3.curso_credito) differences.push('Credito');
            if (curso1.curso_ciclo !== curso3.curso_ciclo) differences.push('Ciclo');

            // Reemplazar códigos de prerrequisitos por nombres antes de comparar
            const pre1Formateado = obtenerPrerrequisito(curso1.curso_pre, mapCodigoANombre1);
            const pre3Formateado = obtenerPrerrequisito(curso3.curso_pre, mapCodigoANombre3);
            if (pre1Formateado !== pre3Formateado) differences.push('Pre');

            combinedCourses.set(nombre3Normalizado, {
                ciclo1: curso1.curso_ciclo,
                areac1: curso1.curso_areac,
                codigo1: curso1.curso_codigo,
                nombre1: curso1.curso_nombre.trim(),
                ht1: curso1.curso_ht,
                hp1: curso1.curso_hp,
                th1: curso1.curso_totalh,
                creditos1: curso1.curso_credito,
                hv1: curso1.curso_hvir,
                pre1: curso1.curso_pre,

                ciclo3: curso3.curso_ciclo,
                areac3: curso3.curso_areac,
                codigo3: curso3.curso_codigo,
                nombre3: curso3.curso_nombre.trim(),
                ht3: curso3.curso_ht,
                hp3: curso3.curso_hp,
                th3: curso3.curso_totalh,
                creditos3: curso3.curso_credito,
                hv3: curso3.curso_hvir,
                pre3: curso3.curso_pre,

                result: differences.length > 0 ? `Diferente en: ${differences.join(', ')}` : 'Igual'
            });

            map1.delete(nombre3Normalizado);
        } else {
            combinedCourses.set(nombre3Normalizado, {
                ciclo1: '',
                areac1: '',
                codigo1: '',
                nombre1: '',
                ht1: '',
                hp1: '',
                th1: '',
                creditos1: '',
                hv1: '',
                pre1: '',

                ciclo3: curso3.curso_ciclo,
                areac3: curso3.curso_areac,
                codigo3: curso3.curso_codigo,
                nombre3: curso3.curso_nombre.trim(),
                ht3: curso3.curso_ht,
                hp3: curso3.curso_hp,
                th3: curso3.curso_totalh,
                creditos3: curso3.curso_credito,
                hv3: curso3.curso_hvir,
                pre3: obtenerPrerrequisito(curso3.curso_pre, mapCodigoANombre3),

                result: 'Solo en versión OTI'
            });
        }
    });

    map1.forEach((curso1, nombre1Normalizado) => {
        combinedCourses.set(nombre1Normalizado, {
            ciclo1: curso1.curso_ciclo,
            areac1: curso1.curso_areac,
            codigo1: curso1.curso_codigo,
            nombre1: curso1.curso_nombre.trim(),
            ht1: curso1.curso_ht,
            hp1: curso1.curso_hp,
            th1: curso1.curso_totalh,
            creditos1: curso1.curso_credito,
            hv1: curso1.curso_hvir,
            pre1: obtenerPrerrequisito(curso1.curso_pre, mapCodigoANombre1),

            ciclo3: '',
            areac3: '',
            codigo3: '',
            nombre3: '',
            ht3: '',
            hp3: '',
            th3: '',
            creditos3: '',
            hv3: '',
            pre3: '',

            result: 'Solo en versión 1'
        });
    });

    return Array.from(combinedCourses.values());
}

// Helper function to compare two sets for equality
function areSetsEqual(setA, setB) {
    if (setA.size !== setB.size) return false;
    for (let item of setA) {
        if (!setB.has(item)) return false;
    }
    return true;
}
function diferencias(version1, oti) {
    const cursos1 = version1[0]?.cursos || [];
    const cursos3 = Array.isArray(oti) ? oti : [];

    const combinedCourses = new Map();

    // Crear un Map para los cursos de la primera versión, usando el nombre normalizado del curso como clave
    const map1 = new Map(
        cursos1.map(curso => [sintilde(curso.curso_nombre.trim().toUpperCase()), curso])
    );

    // Crear un Map para los códigos de cursos a nombres en versión 1
    const codeToNameMap1 = new Map(
        cursos1.map(curso => [curso.curso_codigo, curso.curso_nombre.trim()])
    );

    // Crear un Map para los códigos de cursos a nombres en versión OTI
    const codeToNameMap3 = new Map(
        cursos3.map(curso => [curso.curso_codigo, curso.curso_nombre.trim()])
    );

    cursos3.forEach(curso3 => {
        const nombre3Normalizado = sintilde(curso3.curso_nombre.trim().toUpperCase());
        const curso1 = map1.get(nombre3Normalizado);

        if (curso1) {
            const differences = [];

            // Convertir códigos de prerrequisitos a nombres para comparación
            const pre1Names = curso1.curso_pre.split(',').map(code => codeToNameMap1.get(code)).filter(name => name).map(name => sintilde(name.trim().toUpperCase()));
            const pre3Names = curso3.curso_pre.split(',').map(code => codeToNameMap3.get(code)).filter(name => name).map(name => sintilde(name.trim().toUpperCase()));

            // Comparar solo los nombres de los prerrequisitos
            const pre1NamesSet = new Set(pre1Names);
            const pre3NamesSet = new Set(pre3Names);

            if (curso1.curso_codigo !== curso3.curso_codigo) differences.push('Codigo')
            if (curso1.curso_ht !== curso3.curso_ht) differences.push('HT');
            if (curso1.curso_hp !== curso3.curso_hp) differences.push('HP');
            if (curso1.curso_totalh !== curso3.curso_totalh) differences.push('TotalH');
            if (curso1.curso_credito !== curso3.curso_credito) differences.push('Credito');
            if (curso1.curso_ciclo !== curso3.curso_ciclo) differences.push('Ciclo');
            if (!areSetsEqual(pre1NamesSet, pre3NamesSet)) differences.push('Pre');
            if (curso1.curso_hvir !== 2) differences.push('Hvir');

            combinedCourses.set(nombre3Normalizado, {
                ciclo1: curso1.curso_ciclo,
                areac1: curso1.curso_areac,
                codigo1: curso1.curso_codigo,
                nombre1: curso1.curso_nombre.trim(),
                ht1: curso1.curso_ht,
                hp1: curso1.curso_hp,
                th1: curso1.curso_totalh,
                creditos1: curso1.curso_credito,
                hv1: curso1.curso_hvir,
                pre1: curso1.curso_pre.split(',').map(code => `${code} - ${codeToNameMap1.get(code) || code}`).join(', '),

                ciclo3: curso3.curso_ciclo,
                areac3: curso3.curso_areac,
                codigo3: curso3.curso_codigo,
                nombre3: curso3.curso_nombre.trim(),
                ht3: curso3.curso_ht,
                hp3: curso3.curso_hp,
                th3: curso3.curso_totalh,
                creditos3: curso3.curso_credito,
                hv3: curso3.curso_hvir,
                pre3: curso3.curso_pre.split(',').map(code => `${code} - ${codeToNameMap3.get(code) || code}`).join(', '),

                result: differences.length > 0 ? `Diferente en: ${differences.join(', ')}` : 'Igual'
            });

            map1.delete(nombre3Normalizado);
        } else {
            const pre3Names = curso3.curso_pre.split(',').map(code => codeToNameMap3.get(code)).filter(name => name).map(name => sintilde(name.trim().toUpperCase()));

            combinedCourses.set(nombre3Normalizado, {
                ciclo1: '',
                areac1: '',
                codigo1: '',
                nombre1: '',
                ht1: '',
                hp1: '',
                th1: '',
                creditos1: '',
                hv1: '',
                pre1: '',

                ciclo3: curso3.curso_ciclo,
                areac3: curso3.curso_areac,
                codigo3: curso3.curso_codigo,
                nombre3: curso3.curso_nombre.trim(),
                ht3: curso3.curso_ht,
                hp3: curso3.curso_hp,
                th3: curso3.curso_totalh,
                creditos3: curso3.curso_credito,
                hv3: curso3.curso_hvir,
                pre3: curso3.curso_pre.split(',').map(code => `${code} - ${codeToNameMap3.get(code) || code}`).join(', '),

                result: 'Diferente en nombre'
            });
        }
    });

    map1.forEach((curso1, nombre1Normalizado) => {
        const pre1Names = curso1.curso_pre.split(',').map(code => codeToNameMap1.get(code)).filter(name => name).map(name => sintilde(name.trim().toUpperCase()));

        combinedCourses.set(nombre1Normalizado, {
            ciclo1: curso1.curso_ciclo,
            areac1: curso1.curso_areac,
            codigo1: curso1.curso_codigo,
            nombre1: curso1.curso_nombre.trim(),
            ht1: curso1.curso_ht,
            hp1: curso1.curso_hp,
            th1: curso1.curso_totalh,
            creditos1: curso1.curso_credito,
            hv1: curso1.curso_hvir,
            pre1: curso1.curso_pre.split(',').map(code => `${code} - ${codeToNameMap1.get(code) || code}`).join(', '),

            ciclo3: '',
            areac3: '',
            codigo3: '',
            nombre3: '',
            ht3: '',
            hp3: '',
            th3: '',
            creditos3: '',
            hv3: '',
            pre3: '',

            result: 'Diferente en nombre'
        });
    });

    return Array.from(combinedCourses.values());
}

function diferencias2(gestion, oti, c1) {
    const cursos1 = gestion[0]?.cursos || [];
    const cursos2 = Array.isArray(c1) ? c1 : [];
    const cursos3 = Array.isArray(oti) ? oti : [];

    const combinedCourses = new Map();

    // Crear Maps para los cursos de las tres versiones
    const map2 = new Map(cursos2.map(curso => [sintilde(curso.curso_nombre.trim().toUpperCase()), curso]));
    const map3 = new Map(cursos3.map(curso => [sintilde(curso.curso_nombre.trim().toUpperCase()), curso]));

    // Crear Maps para los códigos de cursos a nombres
    const codeToNameMap1 = new Map(cursos1.map(curso => [curso.curso_codigo, curso.curso_nombre.trim()]));
    const codeToNameMap2 = new Map(cursos2.map(curso => [curso.curso_codigo, curso.curso_nombre.trim()]));
    const codeToNameMap3 = new Map(cursos3.map(curso => [curso.curso_codigo, curso.curso_nombre.trim()]));

    // Iterar sobre los cursos de la versión de Gestión Curricular (cursos1)
    cursos1.forEach(curso1 => {
        const nombre1Normalizado = sintilde(curso1.curso_nombre.trim().toUpperCase());
        const curso2 = map2.get(nombre1Normalizado);
        const curso3 = map3.get(nombre1Normalizado);

        const differences = [];

        // Convertir códigos de prerrequisitos a nombres para comparación
        const pre1Names = curso1.curso_pre.split(',').map(code => codeToNameMap1.get(code)).filter(name => name).map(name => sintilde(name.trim().toUpperCase()));
        const pre2Names = curso2 ? curso2.curso_pre.split(',').map(code => codeToNameMap2.get(code)).filter(name => name).map(name => sintilde(name.trim().toUpperCase())) : [];

        // Crear Sets para comparar prerrequisitos
        const pre1NamesSet = new Set(pre1Names);
        const pre2NamesSet = new Set(pre2Names);
        
        // Comparar campos entre los tres conjuntos de datos
        if (!curso2 || !curso3) {
            differences.push('Falta en una versión');
        } else {
            if (curso1.curso_codigo !== curso2.curso_codigo) differences.push('Codigo')
            if (curso1.curso_ht !== curso2.curso_ht || curso1.curso_ht !== curso3.curso_ht) differences.push('HT');
            if (curso1.curso_hp !== curso2.curso_hp || curso1.curso_hp !== curso3.curso_hp) differences.push('HP');
            if (curso1.curso_totalh !== curso2.curso_totalh || curso1.curso_totalh !== curso3.curso_totalh) differences.push('TotalH');
            if (curso1.curso_credito !== curso2.curso_credito || curso1.curso_credito !== curso3.curso_credito) differences.push('Credito');
            if (curso1.curso_ciclo !== curso2.curso_ciclo || curso1.curso_ciclo !== curso3.curso_ciclo) differences.push('Ciclo');
            if (!areSetsEqual(pre1NamesSet, pre2NamesSet) ) differences.push('Pre');
        }

        // Crear el objeto con los resultados de la comparación
        combinedCourses.set(nombre1Normalizado, {
            ciclo1: curso1.curso_ciclo,
            areac1: curso1.curso_areac,
            codigo1: curso1.curso_codigo,
            nombre1: curso1.curso_nombre.trim(),
            ht1: curso1.curso_ht,
            hp1: curso1.curso_hp,
            th1: curso1.curso_totalh,
            creditos1: curso1.curso_credito,
            hv1: curso1.curso_hvir,
            pre1: curso1.curso_pre.split(',').map(code => `${code} - ${codeToNameMap1.get(code) || code}`).join(', '),

            ciclo2: curso2?.curso_ciclo || '',
            codigo2: curso2?.curso_codigo || '',
            nombre2: curso2?.curso_nombre.trim() || '',
            ht2: curso2?.curso_ht || '',
            hp2: curso2?.curso_hp || '',
            th2: curso2?.curso_totalh || '',
            creditos2: curso2?.curso_credito || '',
            pre2: curso2 ? curso2.curso_pre.split(',').map(code => `${code} - ${codeToNameMap2.get(code) || code}`).join(', ') : '',

            ciclo3: curso3?.curso_ciclo || '',
            nombre3: curso3?.curso_nombre.trim() || '',
            ht3: curso3?.curso_ht || '',
            hp3: curso3?.curso_hp || '',
            th3: curso3?.curso_totalh || '',
            creditos3: curso3?.curso_credito || '',

            result: differences.length > 0 ? `Diferente en: ${differences.join(', ')}` : 'Igual'
        });

        map2.delete(nombre1Normalizado);
        map3.delete(nombre1Normalizado);
    });

    // Para los cursos que solo están en C1 o OTI pero no en Gestión
    map2.forEach((curso2, nombre2Normalizado) => {
        combinedCourses.set(nombre2Normalizado, {
            ciclo1: '',
            areac1: '',
            codigo1: '',
            nombre1: '',
            ht1: '',
            hp1: '',
            th1: '',
            creditos1: '',
            hv1: '',
            pre1: '',

            ciclo2: curso2.curso_ciclo,
            areac2: curso2.curso_areac,
            codigo2: curso2.curso_codigo,
            nombre2: curso2.curso_nombre.trim(),
            ht2: curso2.curso_ht,
            hp2: curso2.curso_hp,
            th2: curso2.curso_totalh,
            creditos2: curso2.curso_credito,
            hv2: curso2.curso_hvir,
            pre2: curso2.curso_pre.split(',').map(code => `${code} - ${codeToNameMap2.get(code) || code}`).join(', '),

            ciclo3: '',
            areac3: '',
            codigo3: '',
            nombre3: '',
            ht3: '',
            hp3: '',
            th3: '',
            creditos3: '',
            hv3: '',
            pre3: '',

            result: 'Solo en SISTEMA ACADÉMICO'
        });
    });

    map3.forEach((curso3, nombre3Normalizado) => {
        combinedCourses.set(nombre3Normalizado, {
            ciclo1: '',
            areac1: '',
            codigo1: '',
            nombre1: '',
            ht1: '',
            hp1: '',
            th1: '',
            creditos1: '',
            hv1: '',
            pre1: '',

            ciclo2: '',
            areac2: '',
            codigo2: '',
            nombre2: '',
            ht2: '',
            hp2: '',
            th2: '',
            creditos2: '',
            hv2: '',
            pre2: '',

            ciclo3: curso3.curso_ciclo,
            areac3: curso3.curso_areac,
            codigo3: curso3.curso_codigo,
            nombre3: curso3.curso_nombre.trim(),
            ht3: curso3.curso_ht,
            hp3: curso3.curso_hp,
            th3: curso3.curso_totalh,
            creditos3: curso3.curso_credito,
            hv3: curso3.curso_hvir,
            pre3: curso3.curso_pre.split(',').map(code => `${code} - ${codeToNameMap3.get(code) || code}`).join(', '),

            result: 'Solo en FORMATO C1'
        });
    });

    return Array.from(combinedCourses.values());
}


app.listen(3000, () => {
    console.log('Servidor corriendo en el puerto 3000');
});
