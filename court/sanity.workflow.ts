import type {WorkflowDeploymentInput} from '@sanity/workflow-engine'
import {defineWorkflowConfig} from '@sanity/workflow-engine/define'
import {benchCourt} from './workflows/bench-court.ts'

export const production = {
  name: 'production',
  tag: 'court',
  expectedMinReaderModel: 10,
  workflowResource: {type: 'dataset', id: '4wvtii12.production'},
  definitions: [benchCourt],
} satisfies WorkflowDeploymentInput

export default defineWorkflowConfig({deployments: [production]})
