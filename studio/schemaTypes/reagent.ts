import {defineField, defineType} from 'sanity'

export const reagent = defineType({
  name: 'reagent',
  title: 'Reagent',
  type: 'document',
  fields: [
    defineField({name: 'name', type: 'string', validation: (r) => r.required()}),
    defineField({name: 'slug', type: 'slug', options: {source: 'name'}, validation: (r) => r.required()}),
    defineField({name: 'aliases', type: 'array', of: [{type: 'string'}], options: {layout: 'tags'}}),
    defineField({name: 'cas', title: 'CAS number', type: 'string'}),
    defineField({name: 'signalWord', type: 'string', options: {list: ['Danger', 'Warning', 'None']}}),
    defineField({name: 'hazards', title: 'GHS hazard statements', type: 'array', of: [{type: 'string'}]}),
    defineField({name: 'storage', type: 'string'}),
    defineField({
      name: 'incompatibilities',
      description: 'Never with: … (acids, autoclaving, ammonia…)',
      type: 'array',
      of: [{type: 'string'}],
    }),
    defineField({name: 'disposal', type: 'text', rows: 2}),
    defineField({name: 'source', type: 'reference', to: [{type: 'source'}]}),
  ],
})
