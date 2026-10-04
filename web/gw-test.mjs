import {generateText} from 'ai'
const models = process.argv.slice(2)
for (const m of models) {
  try {
    const r = await generateText({model: m, prompt: 'Reply with the single word: ready'})
    console.log('OK  ', m, r.text.trim().slice(0, 20))
  } catch (e) {
    console.log('FAIL', m, String(e.message).slice(0, 60))
  }
}
