import {defineField, defineType} from 'sanity'

// Numbers stay numbers. A recipe can only be scaled, and a PCR program only
// computed, because amounts are stored as value + unit rather than prose.
export const quantity = defineType({
  name: 'quantity',
  title: 'Quantity',
  type: 'object',
  fields: [
    defineField({name: 'value', type: 'number', validation: (r) => r.required()}),
    defineField({
      name: 'unit',
      type: 'string',
      options: {list: ['g', 'mg', 'µg', 'L', 'mL', 'µL', 'M', 'mM', 'µM', 'nM', '%', 'X', 'U', 'U/µL', 'ng', '°C', 's', 'min']},
      validation: (r) => r.required(),
    }),
  ],
  preview: {select: {value: 'value', unit: 'unit'}, prepare: ({value, unit}) => ({title: `${value} ${unit}`})},
})

export const thermalStep = defineType({
  name: 'thermalStep',
  title: 'Thermal step',
  type: 'object',
  fields: [
    defineField({name: 'tempC', title: 'Temperature (°C)', type: 'number'}),
    defineField({name: 'seconds', title: 'Time (s)', type: 'number'}),
    defineField({name: 'secondsMax', title: 'Time, upper bound (s)', type: 'number'}),
  ],
})
