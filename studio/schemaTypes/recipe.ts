import {defineField, defineType} from 'sanity'

export const recipe = defineType({
  name: 'recipe',
  title: 'Recipe (buffer / medium)',
  type: 'document',
  fields: [
    defineField({name: 'name', type: 'string', validation: (r) => r.required()}),
    defineField({name: 'slug', type: 'slug', options: {source: 'name'}, validation: (r) => r.required()}),
    defineField({
      name: 'aliases',
      description: 'What people call it. "LB" is an alias of three different recipes — that is the point.',
      type: 'array',
      of: [{type: 'string'}],
      options: {layout: 'tags'},
    }),
    defineField({name: 'yield', title: 'Makes', type: 'quantity', validation: (r) => r.required()}),
    defineField({
      name: 'components',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'component',
          fields: [
            defineField({name: 'name', type: 'string', validation: (r) => r.required()}),
            defineField({name: 'reagent', type: 'reference', to: [{type: 'reagent'}]}),
            defineField({name: 'amount', type: 'quantity', validation: (r) => r.required()}),
          ],
          preview: {select: {title: 'name', v: 'amount.value', u: 'amount.unit'}, prepare: ({title, v, u}) => ({title, subtitle: `${v} ${u}`})},
        },
      ],
    }),
    defineField({name: 'steps', title: 'Preparation', type: 'text', rows: 4}),
    defineField({name: 'sterilization', type: 'string'}),
    defineField({name: 'notes', type: 'text', rows: 2}),
    defineField({name: 'source', type: 'reference', to: [{type: 'source'}], validation: (r) => r.required()}),
  ],
  preview: {select: {title: 'name', aliases: 'aliases'}, prepare: ({title, aliases}) => ({title, subtitle: (aliases ?? []).join(' · ')})},
})
