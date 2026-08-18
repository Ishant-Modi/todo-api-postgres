const express = require('express');
const swaggerUi = require('swagger-ui-express');
const openapiSpec = require('./openapi.json');
const pool = require('./db');
const app = express();

app.use(express.json());

app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));


const PORT = 3000;

app.get('/', (req, res) => {
  res.json({
    name: "Task API",
    version: "1.0",
    endpoints: ["/tasks"]
  });
});

app.get('/health', (req, res) => {
  res.json({ status: "ok" });
});

app.get('/tasks', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM tasks');
  res.json(rows);
});
app.get('/tasks/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const { rows } = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);

  if (rows.length === 0) {
    return res.status(404).json({ error: `Task ${id} not found` });
  }

  res.json(rows[0]);
});

app.post('/tasks', async (req, res) => {
  const { title } = req.body;

  if (!title || title.trim() === '') {
    return res.status(400).json({ error: "Title is required" });
  }

  const { rows } = await pool.query(
    'INSERT INTO tasks (title, done) VALUES ($1, $2) RETURNING *',
    [title, false]
  );

  res.status(201).json(rows[0]);
});
app.put('/tasks/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const existing = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);

  if (existing.rows.length === 0) {
    return res.status(404).json({ error: `Task ${id} not found` });
  }

  const { title, done } = req.body;

  if (title !== undefined && title.trim() === '') {
    return res.status(400).json({ error: "Title cannot be empty" });
  }

  const newTitle = title !== undefined ? title : existing.rows[0].title;
  const newDone = done !== undefined ? done : existing.rows[0].done;

  const { rows } = await pool.query(
    'UPDATE tasks SET title = $1, done = $2 WHERE id = $3 RETURNING *',
    [newTitle, newDone, id]
  );

  res.json(rows[0]);
});


app.delete('/tasks/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const existing = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);

  if (existing.rows.length === 0) {
    return res.status(404).json({ error: `Task ${id} not found` });
  }

  await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
  res.status(204).send();
});


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});