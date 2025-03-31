require('dotenv').config();
const { Pool } = require('pg');
const { faker } = require('@faker-js/faker');
const fs = require('fs');

// Configuración de la conexión a PostgreSQL
const pool = new Pool({
  user: process.env.DB_USR,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PSW,
  port: process.env.DB_PORT,
});

// Arrays para almacenar los IDs generados
const authorIds = [];
const publisherIds = [];
const bookIds = [];
const userIds = [];
const studentIds = [];
let studentRoleId = null;
let degreeIds = [];

async function getStudentRoleId() {
    const client = await pool.connect();
    try {
      const res = await client.query("SELECT id FROM role WHERE name = 'STUDENT'");
      if (res.rows.length === 0) {
        throw new Error('No se encontró el rol STUDENT en la base de datos');
      }
      studentRoleId = res.rows[0].id;
    } catch (err) {
      console.error('Error obteniendo el rol STUDENT:', err);
      throw err;
    } finally {
      client.release();
    }
}

// Función para obtener los IDs de las carreras (degrees)
async function getDegreeIds() {
    const client = await pool.connect();
    try {
      const res = await client.query("SELECT id FROM degree");
      degreeIds = res.rows.map(row => row.id);
      if (degreeIds.length === 0) {
        throw new Error('No se encontraron carreras en la base de datos');
      }
    } catch (err) {
      console.error('Error obteniendo las carreras:', err);
      throw err;
    } finally {
      client.release();
    }
}

// Función para insertar usuarios
async function insertUsers() {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      for (let i = 0; i < 50; i++) {
        const firstName = faker.person.firstName();
        const lastName = faker.person.lastName();
        const email = faker.internet.email({ firstName, lastName }).toLowerCase();
        
        const user = {
          email: `student${i+2}@cunoc.edu.gt`,
          password: '$2a$10$8uRZMJ6JNmWolT6.Vky9o./sMuCol51.tyNXOuTEiiH.miDo4sdH.', // Contraseña hasheada: "password"
          name: `${firstName} ${lastName}`,
          cui: faker.number.int({ min: 1000000000000, max: 9999999999999 }), // CUI de 13 dígitos
          birth_date: faker.date.birthdate({ min: 18, max: 30, mode: 'age' }),
          role_id: studentRoleId,
          is_approved: true,
          email_verified: true,
          image_url: null
        };
        
        const res = await client.query(
          `INSERT INTO user_account (
            email, password, name, cui, birth_date, role_id, 
            is_approved, email_verified, image_url
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
          RETURNING id`,
          [
            user.email,
            user.password,
            user.name,
            user.cui,
            user.birth_date,
            user.role_id,
            user.is_approved,
            user.email_verified,
            user.image_url
          ]
        );
        
        userIds.push(res.rows[0].id);
      }
      
      await client.query('COMMIT');
      console.log(`${userIds.length} usuarios insertados correctamente.`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error insertando usuarios:', err);
      throw err;
    } finally {
      client.release();
    }
  }
  
  // Función para insertar estudiantes
  async function insertStudents() {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      for (const userId of userIds) {
        const student = {
          user_id: userId,
          penalty: false, // 20% de probabilidad de tener penalización
          carnet: faker.number.int({ min: 200000000, max: 202499999 }), // Carnet de 9 dígitos empezando con 2
          degree_id: faker.helpers.arrayElement(degreeIds)
        };
        
        const res = await client.query(
          `INSERT INTO student (
            user_id, is_sanctioned, carnet, degree_id
          ) VALUES ($1, $2, $3, $4) 
          RETURNING id`,
          [
            student.user_id,
            student.penalty,
            student.carnet,
            student.degree_id
          ]
        );
        
        studentIds.push(res.rows[0].id);
      }
      
      await client.query('COMMIT');
      console.log(`${studentIds.length} estudiantes insertados correctamente.`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error insertando estudiantes:', err);
      throw err;
    } finally {
      client.release();
    }
  }
  

// Función para generar un código en formato 123-XXX
function generateBookCode() {
    const numbers = faker.string.numeric(3);
    const letters = faker.string.alpha(3).toUpperCase();
    return `${numbers}-${letters}`;
  }

// Función para insertar editoriales
async function insertPublishers() {
  const publishers = Array.from({ length: 20 }, () => ({
    name: faker.company.name(),
  }));

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    for (const publisher of publishers) {
      const res = await client.query(
        'INSERT INTO publisher (name) VALUES ($1) RETURNING id',
        [publisher.name]
      );
      publisherIds.push(res.rows[0].id);
    }
    
    await client.query('COMMIT');
    console.log(`${publishers.length} editoriales insertadas correctamente.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error insertando editoriales:', err);
    throw err;
  } finally {
    client.release();
  }
}

// Función para insertar autores
async function insertAuthors() {
  const authors = Array.from({ length: 20 }, () => ({
    name: faker.person.fullName(),
    nationality: faker.location.country(),
    birth_date: faker.date.birthdate({ min: 1900, max: 2005, mode: 'year' }),
  }));

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    for (const author of authors) {
      const res = await client.query(
        'INSERT INTO author (name, nationality, birth_date) VALUES ($1, $2, $3) RETURNING id',
        [author.name, author.nationality, author.birth_date]
      );
      authorIds.push(res.rows[0].id);
    }
    
    await client.query('COMMIT');
    console.log(`${authors.length} autores insertados correctamente.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error insertando autores:', err);
    throw err;
  } finally {
    client.release();
  }
}

// Función para insertar libros
async function insertBooks() {
    // Leer el archivo books.json
    const booksData = JSON.parse(fs.readFileSync('books.json', 'utf8'));
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      for (const bookData of booksData) {
        // Seleccionar un autor y editorial aleatorio de los IDs generados
        const randomAuthorId = faker.helpers.arrayElement(authorIds);
        const randomPublisherId = faker.helpers.arrayElement(publisherIds);
        
        // Generar datos aleatorios para los campos faltantes
        const quantity = faker.number.int({ min: 1, max: 50 });
        const availableCopies = faker.number.int({ min: 0, max: quantity });
        
        const book = {
          author_id: randomAuthorId,
          publisher_id: randomPublisherId,
          title: bookData.title,
          code: generateBookCode(),
          isbn: faker.commerce.isbn({separator:''}),
          quantity: quantity,
          publication_date: bookData.publishedDate?.$date 
            ? new Date(bookData.publishedDate.$date).toISOString().split('T')[0]
            : faker.date.past({ years: 10 }).toISOString().split('T')[0],
          available_copies: availableCopies,
          price: faker.commerce.price({ min: 80, max: 500, dec: 2 }),
          image_url: `${bookData._id}.jpg`
        };
        
        const res = await client.query(
          `INSERT INTO book (
            author_id, publisher_id, title, code, isbn, quantity, 
            publication_date, available_copies, price, image_url
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
          RETURNING id`,
          [
            book.author_id,
            book.publisher_id,
            book.title,
            book.code,
            book.isbn,
            book.quantity,
            book.publication_date,
            book.available_copies,
            book.price,
            book.image_url
          ]
        );
        
        bookIds.push(res.rows[0].id);
      }
      
      await client.query('COMMIT');
      console.log(`${booksData.length} libros insertados correctamente.`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error insertando libros:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  async function insertLoansAndPayments() {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
  
      // Obtener precios de los libros
      const bookPrices = {};
      const bookRes = await client.query('SELECT id, price FROM book WHERE id = ANY($1::uuid[])', [bookIds]);
      bookRes.rows.forEach(row => {
        bookPrices[row.id] = parseFloat(row.price);
      });
  
      // Insertar préstamos (últimos 4 meses)
      for (let i = 0; i < 500; i++) { // 40 préstamos de ejemplo
        const randomBookId = faker.helpers.arrayElement(bookIds);
        const randomStudentId = faker.helpers.arrayElement(studentIds);
        const bookPrice = bookPrices[randomBookId];
        
        // Fechas para el préstamo (últimos 4 meses)
        const loanDate = faker.date.between({ 
          from: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000), // 120 días = 4 meses
          to: new Date() 
        });
        
        const dueDate = new Date(loanDate);
        dueDate.setDate(dueDate.getDate() + 3); // Plazo de 7 días
        
        // 80% de probabilidad de devolución
        const isReturned = faker.datatype.boolean(0.8);
        let returnDate = isReturned ? 
          faker.date.between({
            from: loanDate,
            to: new Date() // Devuelto hasta hoy
          }) : null;
  
        // Calcular deuda según las reglas
        let debt = 0;
        let paymentDetails = [];
        
        if (returnDate) {
          const returnDateObj = new Date(returnDate);
          const dueDateObj = new Date(dueDate);
          const loanDateObj = new Date(loanDate);
          
          // 1. Pago NORMAL (10% del precio del libro)
          const normalPayment = bookPrice * 0.1;
          debt += normalPayment;
          paymentDetails.push({
            amount: normalPayment,
            type: 'NORMAL_LOAN',
            paid_date: returnDateObj
          });
  
          // 2. Pago OVERDUE (si hay retraso)
          if (returnDateObj > dueDateObj) {
            const overdueDays = Math.ceil((returnDateObj - dueDateObj) / (1000 * 60 * 60 * 24));
            let overduePayment = 0;
            
            if (overdueDays <= 3) {
              overduePayment = overdueDays * 5;
            } else if (overdueDays <= 30) {
              overduePayment = overdueDays * 15;
            }
            
            if (overduePayment > 0) {
              debt += overduePayment;
              paymentDetails.push({
                amount: overduePayment,
                type: 'OVERDUE_LOAN',
                paid_date: returnDateObj
              });
            }
          }
  
          // 3. Pago SANCTION (si más de 30 días de retraso)
          if (returnDateObj > new Date(dueDateObj.getTime() + 30 * 24 * 60 * 60 * 1000)) {
            const sanctionPayment = 150 + bookPrice;
            debt += sanctionPayment;
            paymentDetails.push({
              amount: sanctionPayment,
              type: 'SANCTION',
              paid_date: returnDateObj
            });
          }
        }
  
        // Insertar préstamo con deuda calculada
        const loanRes = await client.query(
          `INSERT INTO loan (
            book_id, student_id, loan_date, due_date, return_date, debt
          ) VALUES ($1, $2, $3, $4, $5, $6) 
          RETURNING id`,
          [
            randomBookId,
            randomStudentId,
            loanDate,
            dueDate,
            returnDate,
            debt
          ]
        );
  
        const loanId = loanRes.rows[0].id;
  
        // Insertar pagos solo si hay devolución
        if (returnDate && paymentDetails.length > 0) {
          for (const payment of paymentDetails) {
            await client.query(
              `INSERT INTO payment (
                loan_id, amount, paid_date, pay_type
              ) VALUES ($1, $2, $3, $4)`,
              [
                loanId,
                payment.amount,
                payment.paid_date,
                payment.type
              ]
            );
          }
        }
      }
  
      await client.query('COMMIT');
      console.log('Préstamos y pagos insertados correctamente con cálculo de deuda.');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error insertando préstamos y pagos:', err);
      throw err;
    } finally {
      client.release();
    }
  }

// Función principal
async function main() {
  try {
    // Insertar datos
    await insertPublishers();
    await insertAuthors();
    await insertBooks();

        // Obtener IDs necesarios primero
        await getStudentRoleId();
        await getDegreeIds();
        
        // Insertar datos en orden
        await insertUsers();
        await insertStudents();

        await insertLoansAndPayments();
    
    // Mostrar los IDs generados
    console.log('\nIDs de editoriales generados:', publisherIds);
    console.log('IDs de autores generados:', authorIds);
    
    // Guardar los IDs en un archivo para uso futuro
    const idsData = {
      publisherIds,
      authorIds,
      bookIds,
        userIds,
        studentIds,
        studentRoleId,
        degreeIds,
      generatedAt: new Date().toISOString()
    };
    
    require('fs').writeFileSync('generated_ids.json', JSON.stringify(idsData, null, 2));
    console.log('\nIDs guardados en generated_ids.json');
  } catch (err) {
    console.error('Error en el proceso principal:', err);
  } finally {
    await pool.end();
  }
}

// Ejecutar el script
main();