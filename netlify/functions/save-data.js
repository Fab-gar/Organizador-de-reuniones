const { neon } = require('@neondatabase/serverless');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const data = JSON.parse(event.body);

    await sql`
      INSERT INTO program_data (id, jsonData) 
      VALUES (1, ${JSON.stringify(data)}::jsonb) 
      ON CONFLICT (id) 
      DO UPDATE SET jsonData = ${JSON.stringify(data)}::jsonb;
    `;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: 'Datos guardados correctamente' }),
    };
  } catch (error) {
    console.error('Error al guardar en la base de datos:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'No se pudieron guardar los datos.', details: error.message }),
    };
  }
};
