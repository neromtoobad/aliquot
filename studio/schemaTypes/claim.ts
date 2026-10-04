import {defineField, defineType} from 'sanity'

// The unit of disagreement. When the NEB page says 68 °C and the textbook says
// 72 °C, both are claims about one parameter, each with its source, and the
// ruling says when each applies. The agent reads rulings instead of guessing.
export const claim = defineType({
  name: 'claim',
  title: 'Claim',
  type: 'document',
  fields: [
    defineField({
      name: 'subject',
      description: 'What the claim is about.',
      type: 'reference',
      to: [{type: 'polymerase'}, {type: 'recipe'}, {type: 'protocol'}, {type: 'reagent'}, {type: 'technique'}],
      validation: (r) => r.required(),
    }),
    defineField({name: 'parameter', description: 'e.g. "extension temperature", "heat-shock time", "NaCl per litre".', type: 'string', validation: (r) => r.required()}),
    defineField({name: 'statement', description: 'What the source says, verbatim.', type: 'text', rows: 3, validation: (r) => r.required()}),
    defineField({name: 'value', type: 'string'}),
    defineField({name: 'unit', type: 'string'}),
    defineField({name: 'source', type: 'reference', to: [{type: 'source'}], validation: (r) => r.required()}),
    defineField({
      name: 'standing',
      type: 'string',
      options: {
        list: [
          {title: 'Current — the value to use', value: 'current'},
          {title: 'Context — right only under the stated condition', value: 'context'},
          {title: 'Disputed — reputable sources disagree, unresolved', value: 'disputed'},
          {title: 'Superseded — replaced by a newer revision', value: 'superseded'},
        ],
        layout: 'radio',
      },
      initialValue: 'current',
      validation: (r) => r.required(),
    }),
    defineField({name: 'appliesWhen', description: 'The condition under which this value is right (e.g. "using NEB Taq").', type: 'string'}),
    defineField({name: 'ruling', description: 'Why this value stands, or when it applies. Written once, reused by the agent.', type: 'text', rows: 2}),
  ],
  preview: {
    select: {p: 'parameter', v: 'value', u: 'unit', s: 'standing', subj: 'subject.name', subjT: 'subject.title', src: 'source.title'},
    prepare: ({p, v, u, s, subj, subjT, src}) => ({title: `${subj ?? subjT} · ${p}: ${v ?? ''} ${u ?? ''}`, subtitle: `[${s}] ${src ?? ''}`}),
  },
})
