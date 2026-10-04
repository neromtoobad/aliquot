import type {StructureResolver} from 'sanity/structure'

// Editors work the ledger the way the agent reads it: disagreements first.
export const structure: StructureResolver = (S) =>
  S.list()
    .title('Ledger')
    .items([
      S.listItem()
        .title('Disputed values')
        .child(S.documentList().title('Reputable sources disagree').filter('_type == "claim" && standing == "disputed"')),
      S.listItem()
        .title('Context-dependent values')
        .child(S.documentList().title('Right only under a condition').filter('_type == "claim" && standing == "context"')),
      S.documentTypeListItem('labRule').title('Lab SOP'),
      S.divider(),
      S.documentTypeListItem('protocol').title('Protocols'),
      S.documentTypeListItem('polymerase').title('Polymerases'),
      S.documentTypeListItem('recipe').title('Recipes'),
      S.documentTypeListItem('reagent').title('Reagents'),
      S.documentTypeListItem('claim').title('All claims'),
      S.divider(),
      S.documentTypeListItem('technique').title('Techniques'),
      S.documentTypeListItem('source').title('Sources'),
    ])
