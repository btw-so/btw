var express = require('express')
const { create } = require('lodash')
const { createSubUrlWithPath, getCommonDeets } = require('../utils/utils')
const { getAllNotes, getNoteBySlug, getUserBySlug } = require('../logic/notes')

var router = express.Router()

router.get('/', async (req, res, next) => {
  const user = await getUserBySlug({
    slug: res.locals.domainSlug,
    customDomain: res.locals.customDomain,
  })

  if (!user) {
    res.status(404).render('notfound', { user: true })
    return
  }

  const notes = JSON.parse(
    JSON.stringify(
      await getAllNotes({
        slug: res.locals.domainSlug,
        customDomain: res.locals.customDomain,
      }),
    ),
  )

  if (notes) {
    notes.map((note) => {
      note.url = createSubUrlWithPath(res, `/${note.slug}`)

      // from note.html get the first non-empty <p> element's content via regex
      const firstParagraphRegex = /<p>(.*?)<\/p>/
      const match = note.html.match(firstParagraphRegex)
      if (match) {
        try {
          let content = match[1].split('<br>')
          content = content.map((x) => {
            // for each x, strip off any html tags. we just need plain text
            var cleanedupText = x.replace(/(<([^>]+)>)/gi, '')
            return {
              lines: Math.ceil(cleanedupText.length / 60),
              content: cleanedupText,
            }
          })

          var linesSoFar = []
          var lineCount = 0

          for (let i = 0; i < content.length; i++) {
            if (lineCount + content[i].lines > 3) {
              // truncate the content to 81 times how much ever linecount is left to hit 3
              const linesLeft = 3 - lineCount
              const charsLeft = linesLeft * 60
              const truncatedContent = content[i].content.substring(
                0,
                charsLeft,
              )
              linesSoFar.push(`${truncatedContent}...`)
              break
            } else {
              linesSoFar.push(content[i].content)
              lineCount += content[i].lines
            }
          }

          note.excerpt = `<p>${linesSoFar.join('<br>')}</p>`
        } catch (e) {
          console.log(e, match)
        }
      }

      let readableDate = ''

      // if convert note.published_at to time so far
      // if time is < 60 minutes, then write x mins ago
      // if time is < 24 hours, then write x hours ago
      // if time is < 30 days, then write x days ago
      // else write MMM DD, YYYY

      const publishedAt = new Date(note.published_at)
      const now = new Date()

      const diff = now - publishedAt

      const minutes = Math.floor(diff / 1000 / 60)
      const hours = Math.floor(diff / 1000 / 60 / 60)
      const days = Math.floor(diff / 1000 / 60 / 60 / 24)

      if (minutes < 60) {
        readableDate = `${minutes} minutes ago`
      } else if (hours < 24) {
        readableDate = `${hours} hours ago`
      } else if (days < 30) {
        readableDate = `${days} days ago`
      } else {
        readableDate = `${publishedAt.toLocaleString('default', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })}`
      }

      note.readableDate = readableDate
    })
  }

  // convert notes into yearly buckets
  const notesByYear = {}
  notes.forEach((note) => {
    const year = new Date(note.published_at).getFullYear()
    if (!notesByYear[year]) {
      notesByYear[year] = []
    }
    notesByYear[year].push(note)
  })

  res.render('index', {
    notes: Object.keys(notesByYear)
      .sort((a, b) => Number(b) - Number(a))
      .map((year) => {
        return {
          yr: year,
          notes: notesByYear[year],
        }
      }),
    mainPage: true,
    ...getCommonDeets(req, res, '/', user),
  })
})

router.get('/about', async (req, res, next) => {
  const user = await getUserBySlug({
    slug: res.locals.domainSlug,
    customDomain: res.locals.customDomain,
  })

  if (!user) {
    res.status(404).render('notfound', { user: true })
    return
  }

  const notes = await getAllNotes({
    slug: res.locals.domainSlug,
    customDomain: res.locals.customDomain,
  })

  if (notes) {
    notes.map((note) => {
      note.url = createSubUrlWithPath(res, `/${note.slug}`)
    })
  }

  res.render('about', {
    aboutPage: true,
    notes,
    bio: user.bio,
    pic: user.pic,
    ...getCommonDeets(req, res, '/about', user, {
      title: 'About',
      meta_title: 'About',
      meta_description: 'About',
    }),
  })
})

function extractFirstImageSrc(html) {
  const imgRegex = /<img[^>]+src="([^">]+)"/
  const match = html.match(imgRegex)
  if (match) {
    return match[1]
  }
  return null
}

router.get('/:slug', async (req, res, next) => {
  const note = await getNoteBySlug({
    slug: res.locals.domainSlug,
    customDomain: res.locals.customDomain,
    noteSlug: req.params.slug,
  })

  if (!note) {
    res.status(404).render('notfound', { post: true })
    return
  }

  note.url = createSubUrlWithPath(res, `/${note.slug}`)

  const user = await getUserBySlug({
    slug: res.locals.domainSlug,
    customDomain: res.locals.customDomain,
  })

  if (!user) {
    res.status(404).render('notfound', { user: true })
    return
  }

  // check if note.html has any <img> element (need not have closing tag. just simple <img src="">). if it does, then extract the first image as the meta image
  const meta_image = extractFirstImageSrc(note.html)

  // check if note.html has first <p> element. if it does, then extract the first paragraph as the meta description
  const pRegex = /<p[^>]*>(.*?)<\/p>/g
  const pMatch = pRegex.exec(note.html)
  const meta_description = pMatch ? pMatch[1] : null

  res.render('post', {
    ...getCommonDeets(req, res, `/${note.slug}`, user, {
      title: note.title,
      meta_title: note.title,
      meta_image,
      meta_description,
    }),
    note,
    published_at: new Date(note.published_at).getTime(),
  })
})

module.exports = router
