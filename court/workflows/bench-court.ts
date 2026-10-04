import {
  defineAction,
  defineActivity,
  defineField,
  defineStage,
  defineTransition,
  defineWorkflow,
} from '@sanity/workflow-engine/define'

// A disputed protocol value goes on trial.
//   filed    → the clerk (an agent) reads both sides and files a brief
//   hearing  → the bench (a person) rules: sustain, overrule, both apply, or dismiss
//   ruled    → the ruling is written into the ledger as a lab rule Aliquot obeys
// The agent and the person move the same instance through the same transitions.

const ruling = defineField({
  type: 'text',
  name: 'ruling',
  title: 'Ruling',
  description: 'In plain words: which value this lab uses, and when.',
  editable: true,
})

const rulingParam = {type: 'string' as const, name: 'ruling', title: 'Ruling', required: true}

function verdictAction(name: string, title: string, verdict: string) {
  return defineAction({
    name,
    title,
    status: 'done',
    params: [rulingParam],
    ops: [
      {type: 'field.set', target: {field: 'verdict'}, value: {type: 'literal', value: verdict}},
      {type: 'field.set', target: {field: 'ruling'}, value: {type: 'param', param: 'ruling'}},
      {type: 'field.set', target: {field: 'judge'}, value: {type: 'actor'}},
      {type: 'field.set', target: {field: 'ruledAt'}, value: {type: 'now'}},
    ],
  })
}

export const benchCourt = defineWorkflow({
  name: 'bench-court',
  title: 'Bench Court',
  description:
    'A disputed protocol value goes on trial: an agent files the brief, a person rules, and the ruling becomes lab law.',
  initialStage: 'filed',
  fields: [
    defineField({
      type: 'subject',
      name: 'subject',
      title: 'The claim on trial',
      types: ['claim'],
      initialValue: {type: 'input'},
      required: true,
    }),
    defineField({
      type: 'string',
      name: 'caseName',
      title: 'Case name',
      description: 'e.g. "NEB 5-alpha v. Addgene (heat-shock duration)"',
      initialValue: {type: 'input'},
    }),
    defineField({type: 'text', name: 'brief', title: "Clerk's brief"}),
    defineField({type: 'actor', name: 'clerk', title: 'Filed by'}),
    defineField({
      type: 'string',
      name: 'verdict',
      title: 'Verdict',
      options: {
        list: [
          {title: 'Sustained — the claim stands', value: 'sustained'},
          {title: 'Overruled — the rival claim stands', value: 'overruled'},
          {title: 'Both apply, each under its own condition', value: 'both-apply'},
          {title: 'Dismissed — not a real conflict', value: 'dismissed'},
        ],
      },
    }),
    ruling,
    defineField({type: 'actor', name: 'judge', title: 'Ruled by'}),
    defineField({type: 'datetime', name: 'ruledAt', title: 'Ruled at'}),
  ],
  stages: [
    defineStage({
      name: 'filed',
      title: 'Filed',
      description: 'The clerk reads every claim about this parameter and writes the brief.',
      activities: [
        defineActivity({
          name: 'file-brief',
          title: 'File the brief',
          actions: [
            defineAction({
              name: 'submit-brief',
              title: 'Submit brief',
              status: 'done',
              params: [{type: 'string', name: 'brief', title: 'Brief', required: true}],
              ops: [
                {type: 'field.set', target: {field: 'brief'}, value: {type: 'param', param: 'brief'}},
                {type: 'field.set', target: {field: 'clerk'}, value: {type: 'actor'}},
              ],
            }),
          ],
        }),
      ],
      transitions: [defineTransition({name: 'to-hearing', title: 'Call the case', to: 'hearing', when: '$allActivitiesDone'})],
    }),
    defineStage({
      name: 'hearing',
      title: 'Hearing',
      description: 'The bench weighs the evidence and rules.',
      activities: [
        defineActivity({
          name: 'rule',
          title: 'Rule on the case',
          actions: [
            verdictAction('sustain', 'Sustain', 'sustained'),
            verdictAction('overrule', 'Overrule', 'overruled'),
            verdictAction('both-apply', 'Both apply', 'both-apply'),
            verdictAction('dismiss', 'Dismiss', 'dismissed'),
          ],
        }),
      ],
      transitions: [
        defineTransition({name: 'to-dismissed', title: 'Case dismissed', to: 'dismissed', when: "$fields.verdict == 'dismissed'"}),
        defineTransition({
          name: 'to-ruled',
          title: 'Ruling entered',
          to: 'ruled',
          when: "defined($fields.verdict) && $fields.verdict != 'dismissed'",
        }),
      ],
    }),
    defineStage({name: 'ruled', title: 'Ruled', description: 'The ruling is lab law.'}),
    defineStage({name: 'dismissed', title: 'Dismissed', description: 'Not a real conflict; nothing changes.'}),
  ],
})
