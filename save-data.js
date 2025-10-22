import { neon } from '@netlify/neon';

// La URL de la base de datos se toma automáticamente de las variables de entorno de Netlify
const sql = neon();

export const handler = async (event) => {
  // Solo permitimos peticiones POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const data = JSON.parse(event.body);

    // Guardamos todos los datos de la aplicación en una única fila y columna JSONB.
    // Usamos 'ON CONFLICT' para actualizar el registro si ya existe (upsert).
    // Asumimos una tabla 'program_data' con una columna 'id' (INT) y 'jsonData' (JSONB).
    await sql`
      INSERT INTO program_data (id, jsonData) 
      VALUES (1, ${JSON.stringify(data)}) 
      ON CONFLICT (id) 
      DO UPDATE SET jsonData = ${JSON.stringify(data)};
    `;

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Datos guardados correctamente' }),
    };
  } catch (error) {
    console.error('Error al guardar en la base de datos:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'No se pudieron guardar los datos.' }),
    };
  }
};