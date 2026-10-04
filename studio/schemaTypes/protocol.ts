import {defineField, defineType} from 'sanity'

export const protocol = defineType({
  name: 'protocol',
  title: 'Protocol',
  type: 'document',
  fields: [
    defineField({name: 'title', type: 'string', validation: (r) => r.required()}),
    defineField({name: 'slug', type: 'slug', options: {source: 'title'}, validation: (r) => r.required()}),
    defineField({name: 'technique', type: 'reference', to: [{type: 'technique'}]}),
    defineField({
      name: 'appliesTo',
      description: 'The kit or product this protocol is written for, or "general". A kit manual only binds that kit.',
      type: 'string',
    }),
    defineField({
      name: 'steps',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'step',
          fields: [
            defineField({name: 'order', type: 'number'}),
            defineField({name: 'action', type: 'text', rows: 2, validation: (r) => r.required()}),
            defineField({name: 'tempC', title: 'Temperature (°C)', type: 'number'}),
            defineField({name: 'seconds', title: 'Time (s)', type: 'number'}),
            defineField({
              name: 'parameters',
              type: 'array',
              of: [
                {
                  type: 'object',
                  name: 'parameter',
                  fields: [
                    defineField({name: 'name', type: 'string'}),
                    defineField({name: 'value', type: 'string'}),
                    defineField({name: 'unit', type: 'string'}),
                  ],
                },
              ],
            }),
            defineField({name: 'caution', type: 'string'}),
          ],
          preview: {select: {o: 'order', a: 'action'}, prepare: ({o, a}) => ({title: `${o}. ${a}`})},
        },
      ],
    }),
    defineField({name: 'source', type: 'reference', to: [{type: 'source'}], validation: (r) => r.required()}),
  ],
})
