const { neon } = require('@neondatabase/serverless');

exports.handler = async () => {
  try {
    const sql = neon(process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL);
    
    const result = await sql`SELECT jsonData FROM program_data WHERE id = 1;`;

    if (result && result.length > 0 && result[0].jsondata) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(result[0].jsondata),
      };
    } else {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({}),
      };
    }
  } catch (error) {
    console.error('Error al cargar desde la base de datos:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'No se pudieron cargar los datos.', details: error.message }),
    };
  }
};
