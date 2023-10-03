const { Pool } = require('pg')

class DB {
  async getTasksDB() {
    if (!this.tasks_pool) {
      this.tasks_pool = new Pool({
        connectionString: process.env.TASKS_DATABASE_URL,
        max: 10,
        ssl:
          process.env.NODE_ENV === 'production'
            ? {
                rejectUnauthorized: false,
              }
            : false,
      })
      // the pool will emit an error on behalf of any idle clients
      // it contains if a backend error or network partition happens
      this.tasks_pool.on('error', (err) => {
        // eslint-disable-next-line no-console
        console.error('Unexpected error on idle client', err)
      })
    }

    return this.tasks_pool
  }

  async init() {
    await this.getTasksDB()
  }

  version() {
    return '0.0.0'
  }
}

const dbInstance = new DB()
dbInstance.init()

module.exports = dbInstance
