import {getCliClient} from 'sanity/cli'

// The first Bench Court ruling was entered with placeholder text while testing the
// gavel. The judge supplied the intended wording afterwards; the workflow instance
// keeps the original entry as its history.
const client = getCliClient({apiVersion: '2026-10-01'})
const rule =
  'Both apply: in this lab, leave freshly diluted 1:10 bleach on spills for at least 20 minutes; for spills inside a biosafety cabinet, follow the stricter 30 minutes.'
const res = await client.patch('6PahXDAqdeBo5CX2IW6ecf').set({rule}).commit()
console.log('updated', res._id, '→', res.rule)
