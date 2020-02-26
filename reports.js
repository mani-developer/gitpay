const models = require('./models')
const moment = require('moment')
const i18n = require('i18n')
const DeadlineMail = require('./modules/mail/deadline')
const TaskMail = require('./modules/mail/task')

i18n.configure({
  directory: process.env.NODE_ENV !== 'production' ? `${__dirname}/locales` : `${__dirname}/locales/result`,
  locales: process.env.NODE_ENV !== 'production' ? ['en'] : ['en', 'br'],
  defaultLocale: 'en',
  updateFiles: false
})

i18n.init()

const Report = {
  montlyBounties: async () => {
    const tasks = await models.Task.findAll({ where: {
      value: {
        $gt: 0
      }
    },
    include: [ models.User ]
    })
    // eslint-disable-next-line no-console
    // console.log('tasks from cron job weekly bounties', tasks)
    if (tasks[0]) {
      const taskSort = tasks.sort((ta, tb) => {
        return Math.abs(new Date(ta.created_at) - new Date(tb.created_at))
      })
      const taskSortTwo = taskSort.map((t) => {
        return [t.createdAt, t.createdAt.toLocaleString('default', { month: 'long' }), t.url]
      })
      // eslint-disable-next-line no-console
      console.log('tasks', taskSortTwo)
    }
    return new Error('no issues found')
  },
  latestTasks: async () => {
    const tasks = await models.Task.findAll({
      where: {
        assigned: {
          $eq: null
        },
        status: {
          $eq: 'open'
        }
      },
      limit: 5,
      order: [['id', 'DESC']],
      include: [ models.User ]
    })
    // eslint-disable-next-line no-console
    console.log('tasks from cron job latest tasks', tasks)
    if (tasks[0]) {
      TaskMail.weeklyLatest({ tasks })
    }
    return tasks
  },
  rememberDeadline: async () => {
    const tasks = await models.Task.findAll({ where: {
      status: 'in_progress',
      deadline: {
        $lt: moment(new Date()).format(),
        $gt: moment(new Date()).subtract(2, 'days').format()
      }
    },
    include: [ models.User ]
    })
    // eslint-disable-next-line no-console
    console.log('tasks from cron job to remember deadline', tasks)
    if (tasks[0]) {
      tasks.map(async t => {
        if (t.assigned) {
          if (t.dataValues && t.assigned) {
            const userAssigned = await models.Assign.findAll({ where: { id: t.assigned }, include: [models.User] })
            if (userAssigned[0].dataValues) {
              DeadlineMail.deadlineEndOwner(t.User.dataValues, t.dataValues, t.User.name || t.User.username)
              DeadlineMail.deadlineEndAssigned(userAssigned[0].dataValues.User, t.dataValues, userAssigned[0].dataValues.User.dataValues.name)
            }
          }
        }
      })
    }
    return tasks
  }
}

Report.montlyBounties()

module.exports = { Report }
