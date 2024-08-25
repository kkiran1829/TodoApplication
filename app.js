const express = require('express')
const sqlite3 = require('sqlite3')
const {open} = require('sqlite')
const {format, parseISO, isValid} = require('date-fns')

// Create an Express app
const app = express()
app.use(express.json())

// Open the database
const dbPromise = open({
  filename: 'todoApplication.db',
  driver: sqlite3.Database,
})

// Helper functions to validate input
const isValidStatus = status =>
  ['TO DO', 'IN PROGRESS', 'DONE'].includes(status)
const isValidPriority = priority => ['HIGH', 'MEDIUM', 'LOW'].includes(priority)
const isValidCategory = category =>
  ['WORK', 'HOME', 'LEARNING'].includes(category)
const isValidDate = date => isValid(parseISO(date))

// API 1: GET /todos/
app.get('/todos/', async (req, res) => {
  const db = await dbPromise
  const {status, priority, search_q, category} = req.query

  let query = 'SELECT * FROM todo WHERE 1=1'
  const conditions = []

  if (status) {
    if (!isValidStatus(status)) {
      return res.status(400).send('Invalid Todo Status')
    }
    conditions.push(`status = '${status}'`)
  }
  if (priority) {
    if (!isValidPriority(priority)) {
      return res.status(400).send('Invalid Todo Priority')
    }
    conditions.push(`priority = '${priority}'`)
  }
  if (search_q) {
    conditions.push(`todo LIKE '%${search_q}%'`)
  }
  if (category) {
    if (!isValidCategory(category)) {
      return res.status(400).send('Invalid Todo Category')
    }
    conditions.push(`category = '${category}'`)
  }

  if (conditions.length > 0) {
    query += ' AND ' + conditions.join(' AND ')
  }

  const todos = await db.all(query)
  res.json(
    todos.map(todo => ({
      id: todo.id,
      todo: todo.todo,
      priority: todo.priority,
      status: todo.status,
      category: todo.category,
      dueDate: format(parseISO(todo.due_date), 'yyyy-MM-dd'),
    })),
  )
})

// API 2: GET /todos/:todoId/
app.get('/todos/:todoId/', async (req, res) => {
  const db = await dbPromise
  const {todoId} = req.params

  const todo = await db.get('SELECT * FROM todo WHERE id = ?', [todoId])
  if (!todo) {
    return res.status(404).send('Todo Not Found')
  }

  res.json({
    id: todo.id,
    todo: todo.todo,
    priority: todo.priority,
    status: todo.status,
    category: todo.category,
    dueDate: format(parseISO(todo.due_date), 'yyyy-MM-dd'),
  })
})

// API 3: GET /agenda/
app.get('/agenda/', async (req, res) => {
  const db = await dbPromise
  const {date} = req.query

  if (!isValidDate(date)) {
    return res.status(400).send('Invalid Due Date')
  }

  const todos = await db.all('SELECT * FROM todo WHERE due_date = ?', [
    format(parseISO(date), 'yyyy-MM-dd'),
  ])
  res.json(
    todos.map(todo => ({
      id: todo.id,
      todo: todo.todo,
      priority: todo.priority,
      status: todo.status,
      category: todo.category,
      dueDate: format(parseISO(todo.due_date), 'yyyy-MM-dd'),
    })),
  )
})

// API 4: POST /todos/
app.post('/todos/', async (req, res) => {
  const db = await dbPromise
  const {id, todo, priority, status, category, dueDate} = req.body

  if (!isValidStatus(status)) {
    return res.status(400).send('Invalid Todo Status')
  }
  if (!isValidPriority(priority)) {
    return res.status(400).send('Invalid Todo Priority')
  }
  if (!isValidCategory(category)) {
    return res.status(400).send('Invalid Todo Category')
  }
  if (!isValidDate(dueDate)) {
    return res.status(400).send('Invalid Due Date')
  }

  await db.run(
    'INSERT INTO todo (id, todo, priority, status, category, due_date) VALUES (?, ?, ?, ?, ?, ?)',
    [
      id,
      todo,
      priority,
      status,
      category,
      format(parseISO(dueDate), 'yyyy-MM-dd'),
    ],
  )

  res.send('Todo Successfully Added')
})

// API 5: PUT /todos/:todoId/
app.put('/todos/:todoId/', async (req, res) => {
  const db = await dbPromise
  const {todoId} = req.params
  const {status, priority, category, todo, dueDate} = req.body

  if (status && !isValidStatus(status)) {
    return res.status(400).send('Invalid Todo Status')
  }
  if (priority && !isValidPriority(priority)) {
    return res.status(400).send('Invalid Todo Priority')
  }
  if (category && !isValidCategory(category)) {
    return res.status(400).send('Invalid Todo Category')
  }
  if (dueDate && !isValidDate(dueDate)) {
    return res.status(400).send('Invalid Due Date')
  }

  const updates = []
  if (status) updates.push(`status = '${status}'`)
  if (priority) updates.push(`priority = '${priority}'`)
  if (category) updates.push(`category = '${category}'`)
  if (todo) updates.push(`todo = '${todo}'`)
  if (dueDate)
    updates.push(`due_date = '${format(parseISO(dueDate), 'yyyy-MM-dd')}'`)

  if (updates.length > 0) {
    const updateQuery =
      'UPDATE todo SET ' + updates.join(', ') + ' WHERE id = ?'
    await db.run(updateQuery, [todoId])
  }

  if (status) return res.send('Status Updated')
  if (priority) return res.send('Priority Updated')
  if (category) return res.send('Category Updated')
  if (todo) return res.send('Todo Updated')
  if (dueDate) return res.send('Due Date Updated')

  res.send('Nothing to Update')
})

// API 6: DELETE /todos/:todoId/
app.delete('/todos/:todoId/', async (req, res) => {
  const db = await dbPromise
  const {todoId} = req.params

  await db.run('DELETE FROM todo WHERE id = ?', [todoId])
  res.send('Todo Deleted')
})

// Export the app
module.exports = app
