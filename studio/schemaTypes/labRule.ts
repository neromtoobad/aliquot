import {defineField, defineType} from 'sanity'

// A lab's own SOP. It outranks every outside source for that lab — the bench
// in front of you follows your safety officer, not the internet.
export const labRule = defineType({
  name: 'labRule',
  title: 'Lab rule (house SOP)',
  type: 'document',
  fields: [
    defineField({name: 'lab', description: 'Which lab this SOP belongs to.', type: 'string', validation: (r) => r.required()}),
    defineField({name: 'title', type: 'string', validation: (r) => r.required()}),
    defineField({name: 'rule', type: 'text', rows: 3, validation: (r) => r.required()}),
    defineField({
      name: 'appliesTo',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'polymerase'}, {type: 'recipe'}, {type: 'protocol'}, {type: 'reagent'}, {type: 'technique'}]}],
    }),
    defineField({name: 'overrides', description: 'Outside claims this rule takes precedence over.', type: 'array', of: [{type: 'reference', to: [{type: 'claim'}]}]}),
    defineField({name: 'severity', type: 'string', options: {list: ['must', 'should', 'note'], layout: 'radio'}, initialValue: 'must'}),
  ],
})
