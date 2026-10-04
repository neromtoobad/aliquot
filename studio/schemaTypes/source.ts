import {defineField, defineType} from 'sanity'

// Where a number came from. Authority lets the agent explain *why* one value
// beats another, instead of picking whichever sentence matched.
export const SOURCE_KINDS = [
  {title: 'Lab SOP (this lab)', value: 'labSOP'},
  {title: 'Manufacturer manual / product protocol', value: 'manufacturerManual'},
  {title: 'Regulatory / public-health guidance', value: 'regulatoryGuidance'},
  {title: 'Published protocol (Addgene, CSH, ASM, protocols.io)', value: 'publishedProtocol'},
  {title: 'Institutional SOP (university EHS, biosafety office)', value: 'institutionalSOP'},
  {title: 'Textbook / course notes', value: 'textbook'},
  {title: 'Forum / Q&A', value: 'forum'},
]

export const source = defineType({
  name: 'source',
  title: 'Source',
  type: 'document',
  fields: [
    defineField({name: 'title', type: 'string', validation: (r) => r.required()}),
    defineField({name: 'url', type: 'url'}),
    defineField({name: 'kind', type: 'string', options: {list: SOURCE_KINDS}, validation: (r) => r.required()}),
    defineField({
      name: 'authority',
      description:
        '1 forum … 5 the manufacturer\'s own manual for that product, regulatory guidance, or your lab\'s SOP. Breaks ties between claims.',
      type: 'number',
      validation: (r) => r.required().min(1).max(5).integer(),
    }),
    defineField({name: 'publisher', type: 'string'}),
    defineField({name: 'version', description: 'Manual revision, edition or date, if the source shows one.', type: 'string'}),
    defineField({name: 'retrievedAt', type: 'datetime'}),
    defineField({name: 'excerpt', description: 'The passage that matters, verbatim.', type: 'text', rows: 4}),
  ],
  preview: {
    select: {title: 'title', kind: 'kind', authority: 'authority'},
    prepare: ({title, kind, authority}) => ({title, subtitle: `${kind} · authority ${authority}`}),
  },
})
