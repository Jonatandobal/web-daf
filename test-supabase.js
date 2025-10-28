import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Cargar variables de entorno desde .env si existe
dotenv.config();

// Obtener las credenciales de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Validar que las variables de entorno estén configuradas
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: SUPABASE_URL y SUPABASE_ANON_KEY deben estar configurados en las variables de entorno.');
  console.error('Puedes crearlas en un archivo .env en la raíz del proyecto:');
  console.error('  SUPABASE_URL=tu_url_de_supabase');
  console.error('  SUPABASE_ANON_KEY=tu_clave_anon');
  process.exit(1);
}

// Crear cliente de Supabase
const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('Conectando a Supabase...');
console.log(`URL: ${supabaseUrl}\n`);

async function listarTablas() {
  try {
    // Método 1: Intentar obtener tablas usando el esquema public
    // Nota: Esto requiere que el usuario tenga permisos para leer information_schema
    const { data, error } = await supabase
      .rpc('list_tables');

    if (error) {
      console.log('No se pudo usar RPC list_tables (es normal si no existe la función)');
      console.log('Error:', error.message);
      console.log('\nIntentando método alternativo...\n');

      // Método alternativo: Listar tablas conocidas o intentar queries directas
      console.log('Para listar las tablas, puedes:');
      console.log('1. Usar el Dashboard de Supabase en: ' + supabaseUrl.replace('.supabase.co', '.supabase.co/project/_/editor'));
      console.log('2. Intentar queries a tablas específicas que sepas que existen');
      console.log('\nProbando conexión con una query simple...\n');

      // Intentar una query simple para verificar la conexión
      const { data: testData, error: testError } = await supabase
        .from('orders')
        .select('*')
        .limit(1);

      if (testError) {
        if (testError.message.includes('relation') && testError.message.includes('does not exist')) {
          console.log('✓ Conexión exitosa a Supabase');
          console.log('✗ La tabla "orders" no existe en tu base de datos\n');
          console.log('Tablas comunes que podrías tener:');
          console.log('  - users');
          console.log('  - orders');
          console.log('  - products');
          console.log('  - etc.\n');
          console.log('Ve al Dashboard de Supabase para ver tus tablas exactas.');
        } else {
          console.error('Error al probar conexión:', testError.message);
        }
      } else {
        console.log('✓ Conexión exitosa a Supabase');
        console.log('✓ Tabla "orders" existe y contiene datos\n');
        console.log(`Encontrados ${testData.length} registros (mostrando primero):`);
        console.log(JSON.stringify(testData[0], null, 2));
      }
    } else {
      console.log('✓ Tablas encontradas:');
      console.log(data);
    }
  } catch (err) {
    console.error('Error inesperado:', err.message);
  }
}

// Ejecutar función
listarTablas();
