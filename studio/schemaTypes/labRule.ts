import {defineField, defineType} from 'sanity'

// A lab's own SOP. It outranks every outside source for that lab — the bench
// in front of you follows your safety officer, not the internet.
// Rules can be written by hand, or entered by Bench Court when a disputed
// value is ruled on (origin = "court"), with the case kept alongside.
export const labRule = defineType({
  name: 'labRule',
  title: 'Lab rule (house SOP)',
  type: 'document',
  groups: [
    {name: 'rule', title: 'Rule', default: true},
    {name: 'case', title: 'Bench Court case'},
  ],
  fields: [
    defineField({name: 'lab', description: 'Which lab this SOP belongs to.', type: 'string', group: 'rule', validation: (r) => r.required()}),
    defineField({name: 'title', type: 'string', group: 'rule', validation: (r) => r.required()}),
    defineField({name: 'rule', type: 'text', rows: 3, group: 'rule', validation: (r) => r.required()}),
    defineField({
      name: 'appliesTo',
      type: 'array',
      group: 'rule',
      of: [{type: 'reference', to: [{type: 'polymerase'}, {type: 'recipe'}, {type: 'protocol'}, {type: 'reagent'}, {type: 'technique'}]}],
    }),
    defineField({name: 'overrides', description: 'Outside claims this rule takes precedence over.', type: 'array', group: 'rule', of: [{type: 'reference', to: [{type: 'claim'}]}]}),
    defineField({name: 'severity', type: 'string', group: 'rule', options: {list: ['must', 'should', 'note'], layout: 'radio'}, initialValue: 'must'}),
    defineField({
      name: 'origin',
      type: 'string',
      group: 'case',
      options: {list: [{title: 'Written by hand', value: 'manual'}, {title: 'Ruled in Bench Court', value: 'court'}], layout: 'radio'},
      initialValue: 'manual',
    }),
    defineField({name: 'caseName', type: 'string', group: 'case', hidden: ({document}) => document?.origin !== 'court'}),
    defineField({name: 'caseClaim', title: 'Claim on trial', type: 'reference', to: [{type: 'claim'}], group: 'case', hidden: ({document}) => document?.origin !== 'court'}),
    defineField({
      name: 'verdict',
      type: 'string',
      group: 'case',
      options: {list: ['sustained', 'overruled', 'both-apply']},
      hidden: ({document}) => document?.origin !== 'court',
    }),
    defineField({name: 'brief', title: "Clerk's brief", type: 'text', rows: 4, group: 'case', hidden: ({document}) => document?.origin !== 'court'}),
    defineField({name: 'workflowInstance', description: 'The Bench Court workflow instance that produced this rule.', type: 'string', group: 'case', hidden: ({document}) => document?.origin !== 'court'}),
    defineField({name: 'ruledAt', type: 'datetime', group: 'case', hidden: ({document}) => document?.origin !== 'court'}),
  ],
  preview: {
    select: {title: 'title', origin: 'origin', verdict: 'verdict', lab: 'lab'},
    prepare: ({title, origin, verdict, lab}) => ({title, subtitle: origin === 'court' ? `⚖ Bench Court · ${verdict}` : lab}),
  },
})
