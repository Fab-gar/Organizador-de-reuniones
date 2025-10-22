import { neon } from '@netlify/neon';

const sql = neon();

export const handler = async () => {
  try {
    // Leemos los datos de nuestra tabla. Asumimos que solo hay un registro con id=1.
    const [data] = await sql`SELECT jsonData FROM program_data WHERE id = 1;`;

    if (data && data.jsonData) {
      return {
        statusCode: 200,
        // Devolvemos el JSON que está guardado en la base de datos.
        body: JSON.stringify(data.jsonData),
      };
    } else {
      // Si no hay datos, devolvemos un objeto vacío.
      return {
        statusCode: 200,
        body: JSON.stringify({}),
      };
    }
  } catch (error) {
    console.error('Error al cargar desde la base de datos:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'No se pudieron cargar los datos.' }),
    };
  }
};