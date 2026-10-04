import {defineField, defineType} from 'sanity'

// Cycling parameters as data, straight from each product's own protocol.
// The pcr_program tool reads these fields — it never asks the model to remember them.
export const polymerase = defineType({
  name: 'polymerase',
  title: 'Polymerase',
  type: 'document',
  fields: [
    defineField({name: 'name', type: 'string', validation: (r) => r.required()}),
    defineField({name: 'slug', type: 'slug', options: {source: 'name'}, validation: (r) => r.required()}),
    defineField({name: 'manufacturer', type: 'string'}),
    defineField({name: 'catalog', type: 'string'}),
    defineField({name: 'initialDenaturation', type: 'thermalStep'}),
    defineField({name: 'denaturation', type: 'thermalStep'}),
    defineField({
      name: 'annealing',
      type: 'object',
      fields: [
        defineField({name: 'rule', description: 'As the manufacturer words it.', type: 'string'}),
        defineField({name: 'offsetC', description: 'Added to the lower primer Tm (e.g. −5 for Taq, +3 for Q5).', type: 'number'}),
        defineField({name: 'tempCMin', type: 'number'}),
        defineField({name: 'tempCMax', type: 'number'}),
        defineField({name: 'seconds', type: 'number'}),
        defineField({name: 'secondsMax', type: 'number'}),
      ],
    }),
    defineField({
      name: 'extension',
      type: 'object',
      fields: [
        defineField({name: 'tempC', type: 'number'}),
        defineField({name: 'secondsPerKb', type: 'number'}),
        defineField({name: 'secondsPerKbMax', type: 'number'}),
      ],
    }),
    defineField({name: 'finalExtension', type: 'thermalStep'}),
    defineField({
      name: 'cycles',
      type: 'object',
      fields: [defineField({name: 'min', type: 'number'}), defineField({name: 'max', type: 'number'})],
    }),
    defineField({
      name: 'reaction',
      title: 'Reaction setup',
      type: 'object',
      fields: [
        defineField({name: 'volumeUl', title: 'Reaction volume (µL)', type: 'number'}),
        defineField({
          name: 'components',
          type: 'array',
          of: [
            {
              type: 'object',
              name: 'reactionComponent',
              fields: [
                defineField({name: 'name', type: 'string'}),
                defineField({name: 'volumeUl', title: 'Volume (µL)', type: 'number'}),
                defineField({name: 'finalConc', title: 'Final concentration', type: 'string'}),
                defineField({name: 'toVolume', description: 'Water: fill to the reaction volume.', type: 'boolean'}),
              ],
              preview: {select: {title: 'name', v: 'volumeUl', c: 'finalConc'}, prepare: ({title, v, c}) => ({title, subtitle: `${v ?? 'to volume'} µL · ${c ?? ''}`})},
            },
          ],
        }),
      ],
    }),
    defineField({name: 'notes', type: 'text', rows: 2}),
    defineField({name: 'source', type: 'reference', to: [{type: 'source'}], validation: (r) => r.required()}),
  ],
  preview: {select: {title: 'name', subtitle: 'manufacturer'}},
})
