import {defineField, defineType} from 'sanity'

export const technique = defineType({
  name: 'technique',
  title: 'Technique',
  type: 'document',
  fields: [
    defineField({name: 'name', type: 'string', validation: (r) => r.required()}),
    defineField({name: 'slug', type: 'slug', options: {source: 'name'}, validation: (r) => r.required()}),
    defineField({name: 'summary', type: 'text', rows: 3}),
  ],
})
