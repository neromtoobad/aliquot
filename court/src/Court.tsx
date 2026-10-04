import {useClient, useCurrentUser, useQuery} from '@sanity/sdk-react'
import {createEngine, type Engine} from '@sanity/workflow-engine'
import {WorkflowDiagram} from '@sanity/workflow-diagram'
import {useWorkflowInstances, useWorkflowSession} from '@sanity/workflow-sdk'
import {Suspense, useMemo, useState} from 'react'
import {DATASET, PROJECT_ID} from './App'

// Bench Court: disputed protocol values on trial.
// The clerk (an agent, court/clerk.mjs) opens a case per disputed parameter and
// files a brief, moving the workflow to `hearing`. Here, a person reads the
// evidence and rules through the same workflow. A ruling (other than a dismissal)
// is written into the ledger as a labRule, which the Aliquot agent then obeys.

const TAG = 'court'

type Claim = {
  _id: string
  parameter: string
  statement: string
  value?: string
  unit?: string
  standing: string
  appliesWhen?: string
  subjectId: string
  subject: string
  source?: {title: string; url?: string; authority?: number; publisher?: string}
}

const VERDICTS = [
  {action: 'sustain', label: 'Sustain', hint: 'The claim on trial stands', tone: 'sustain'},
  {action: 'overrule', label: 'Overrule', hint: 'A rival claim stands', tone: 'overrule'},
  {action: 'both-apply', label: 'Both apply', hint: 'Each under its own condition', tone: 'both'},
  {action: 'dismiss', label: 'Dismiss', hint: 'Not a real conflict', tone: 'dismiss'},
] as const

const STAGE_LABEL: Record<string, string> = {filed: 'Filed', hearing: 'In session', ruled: 'Ruled', dismissed: 'Dismissed'}

function fieldValue<T = unknown>(instance: {fields?: {name: string; value?: unknown}[]} | undefined, name: string): T | undefined {
  return instance?.fields?.find((f) => f.name === name)?.value as T | undefined
}

function caseNo(id: string) {
  return id.split('.').pop()?.slice(0, 6).toUpperCase()
}

function Authority({n}: {n?: number}) {
  if (!n) return null
  return (
    <span className="authority" title={`Source authority ${n} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <i key={i} className={i <= n ? 'on' : ''} />
      ))}
    </span>
  )
}

export function Court() {
  const client = useClient({apiVersion: '2026-04-29'})
  const engine = useMemo(
    () =>
      createEngine({
        client: client.withConfig({dataset: DATASET}),
        workflowResource: {type: 'dataset', id: `${PROJECT_ID}.${DATASET}`},
        tag: TAG,
      }),
    [client],
  )
  const [selected, setSelected] = useState<string>()

  return (
    <div className="court">
      <header className="masthead">
        <div className="seal">⚖</div>
        <div>
          <h1>Bench Court</h1>
          <p>Where disputed protocol values go on trial. The clerk files; the bench rules; the ruling becomes lab law.</p>
        </div>
      </header>
      <div className="room">
        <Docket engine={engine} selected={selected} onSelect={setSelected} />
        <main className="bench">
          {selected ? (
            <Suspense fallback={<div className="loading">Calling the case…</div>}>
              <Case key={selected} engine={engine} instanceId={selected} />
            </Suspense>
          ) : (
            <div className="empty">
              <div className="gavel">🔨</div>
              <p>Choose a case from the docket.</p>
              <small>The clerk (an agent) has already read every source and filed a brief for each one.</small>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

function Docket({engine, selected, onSelect}: {engine: Engine; selected?: string; onSelect: (id: string) => void}) {
  const {instances, loading, error} = useWorkflowInstances({engine, filter: {includeCompleted: true}})
  if (loading) return <aside className="docket"><div className="loading">Reading the docket…</div></aside>
  if (error) return <aside className="docket"><div className="error">Could not read the docket: {String(error)}</div></aside>
  const cases = (instances ?? []).filter((i) => i.definition === 'bench-court')
  const order = ['hearing', 'filed', 'ruled', 'dismissed']
  cases.sort((a, b) => order.indexOf(a.currentStage) - order.indexOf(b.currentStage))
  return (
    <aside className="docket">
      <h2>Docket <span>{cases.length}</span></h2>
      <ul>
        {cases.map((c) => (
          <li key={c._id}>
            <button className={c._id === selected ? 'active' : ''} onClick={() => onSelect(c._id)}>
              <span className={`stage stage-${c.currentStage}`}>{STAGE_LABEL[c.currentStage] ?? c.currentStage}</span>
              <span className="caseno">No. {caseNo(c._id)}</span>
              <strong>{fieldValue<string>(c, 'caseName') ?? 'Untitled case'}</strong>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  )
}

function Case({engine, instanceId}: {engine: Engine; instanceId: string}) {
  const session = useWorkflowSession({engine, instanceId})
  const client = useClient({apiVersion: '2026-04-29'})
  const user = useCurrentUser()
  const [ruling, setRuling] = useState('')
  const [busy, setBusy] = useState<string>()
  const [failure, setFailure] = useState<string>()
  const [entered, setEntered] = useState<string>()

  const instance = session.evaluation?.instance as unknown as
    | {_id: string; currentStage: string; fields?: {name: string; value?: unknown}[]; history?: never[]; definitionSnapshot?: never}
    | undefined
  const subjectRef = fieldValue<{id: string}>(instance, 'subject')
  const accusedId = subjectRef?.id?.split(':').pop() ?? ''

  const {data: evidence} = useQuery<{accused: Claim | null; rivals: Claim[]; law: {_id: string; title: string; rule: string} | null}>({
    query: `{
      "accused": *[_id == $id][0]{_id, parameter, statement, value, unit, standing, appliesWhen, "subjectId": subject._ref,
        "subject": coalesce(subject->name, subject->title), "source": source->{title, url, authority, publisher}},
      "rivals": *[_type == "claim" && _id != $id && subject._ref == *[_id == $id][0].subject._ref
        && lower(parameter) == lower(*[_id == $id][0].parameter)]{_id, parameter, statement, value, unit, standing, appliesWhen,
        "subjectId": subject._ref, "subject": coalesce(subject->name, subject->title), "source": source->{title, url, authority, publisher}},
      "law": *[_type == "labRule" && caseClaim._ref == $id][0]{_id, title, rule}
    }`,
    params: {id: accusedId},
  })

  if (session.invalid) return <div className="error">This case file can’t be read: {session.invalid.reason}</div>
  if (session.error) return <div className="error">Could not load the case: {String(session.error)}</div>
  if (!session.ready || !session.evaluation || !instance) return <div className="loading">Calling the case…</div>

  const evaluation = session.evaluation
  const stage = instance.currentStage
  const caseName = fieldValue<string>(instance, 'caseName')
  const brief = fieldValue<string>(instance, 'brief')
  const verdict = fieldValue<string>(instance, 'verdict')
  const ruled = fieldValue<string>(instance, 'ruling')
  const rule = evaluation.currentStage.activities.find((a) => a.activity.name === 'rule')
  const accused = evidence?.accused
  const rivals = evidence?.rivals ?? []

  async function enterRuling(action: string) {
    if (!ruling.trim()) {
      setFailure('Write the ruling first: which value this lab uses, and when.')
      return
    }
    setBusy(action)
    setFailure(undefined)
    try {
      await session.fireAction({activity: 'rule', action, params: {ruling: ruling.trim()}})
      if (action !== 'dismiss' && accused) {
        // The ruling becomes lab law: a labRule Aliquot reads before any outside source.
        const doc = await client.withConfig({dataset: DATASET}).create({
          _type: 'labRule',
          lab: 'Example teaching lab (demo SOP — replace with your own)',
          title: `${accused.subject}: ${accused.parameter}`,
          rule: ruling.trim(),
          severity: 'must',
          appliesTo: [{_type: 'reference', _ref: accused.subjectId, _key: 'a0'}],
          overrides: rivals.concat(accused).map((c, i) => ({_type: 'reference', _ref: c._id, _key: `o${i}`})),
          origin: 'court',
          caseName,
          caseClaim: {_type: 'reference', _ref: accused._id},
          verdict: action === 'sustain' ? 'sustained' : action === 'overrule' ? 'overruled' : 'both-apply',
          brief,
          workflowInstance: instanceId,
          ruledAt: new Date().toISOString(),
        })
        setEntered(doc._id)
      }
      setRuling('')
    } catch (e) {
      setFailure(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(undefined)
    }
  }

  return (
    <article className="case">
      <div className="case-head">
        <span className="caseno">Case No. {caseNo(instance._id)}</span>
        <h2>{caseName}</h2>
        {accused && (
          <p className="charge">
            <b>{accused.subject}</b> — {accused.parameter}
          </p>
        )}
      </div>

      <div className="diagram">
        <WorkflowDiagram
          definition={evaluation.definition}
          currentStage={stage}
          history={(instance as {history?: never[]}).history}
          evaluation={evaluation}
          explain
          static
          height={150}
          fill
        />
      </div>

      <section>
        <h3>The claim on trial</h3>
        {accused ? <ClaimCard claim={accused} accused /> : <div className="loading">Fetching the exhibit…</div>}
      </section>

      {rivals.length > 0 && (
        <section>
          <h3>Rival claims ({rivals.length})</h3>
          <div className="exhibits">
            {rivals.map((r, i) => (
              <ClaimCard key={r._id} claim={r} label={`Exhibit ${String.fromCharCode(66 + i)}`} />
            ))}
          </div>
        </section>
      )}

      {brief && (
        <section className="brief">
          <h3>Clerk’s brief <small>filed by an agent</small></h3>
          <p>{brief}</p>
        </section>
      )}

      {stage === 'hearing' && rule ? (
        <section className="ruling">
          <h3>The bench rules</h3>
          <textarea
            value={ruling}
            onChange={(e) => setRuling(e.target.value)}
            rows={3}
            placeholder="Which value does this lab use, and under what condition? This text becomes the lab rule."
          />
          <div className="verdicts">
            {VERDICTS.map((v) => {
              const a = rule.actions.find((x) => x.action.name === v.action)
              return (
                <button
                  key={v.action}
                  className={`verdict ${v.tone}`}
                  disabled={!a?.allowed || Boolean(busy)}
                  onClick={() => enterRuling(v.action)}
                  title={v.hint}
                >
                  <b>{busy === v.action ? 'Entering…' : v.label}</b>
                  <small>{v.hint}</small>
                </button>
              )
            })}
          </div>
          {failure && <div className="error">{failure}</div>}
          <small className="who">Ruling as {user?.name ?? 'you'}. The clerk recommends, but only a person can rule.</small>
        </section>
      ) : (
        <section className={`decided ${verdict ?? ''}`}>
          <div className="stamp">{verdict === 'dismissed' ? 'DISMISSED' : verdict ? verdict.replace('-', ' ').toUpperCase() : STAGE_LABEL[stage]}</div>
          {ruled && <p className="ruling-text">“{ruled}”</p>}
          {(entered || evidence?.law) && verdict !== 'dismissed' && (
            <p className="law">
              Entered into the lab SOP as <b>{evidence?.law?.title ?? 'a lab rule'}</b>. Aliquot now applies it before any outside source.
            </p>
          )}
        </section>
      )}
    </article>
  )
}

function ClaimCard({claim, accused, label}: {claim: Claim; accused?: boolean; label?: string}) {
  return (
    <div className={`claim ${accused ? 'accused' : ''}`}>
      <div className="claim-top">
        <span className="exhibit">{accused ? 'Exhibit A · on trial' : label}</span>
        <span className="value">
          {claim.value} {claim.unit}
        </span>
      </div>
      <blockquote>“{claim.statement}”</blockquote>
      {claim.appliesWhen && <p className="when">When: {claim.appliesWhen}</p>}
      <div className="claim-foot">
        {claim.source?.url ? (
          <a href={claim.source.url} target="_blank" rel="noreferrer">
            {claim.source.title}
          </a>
        ) : (
          <span>{claim.source?.title}</span>
        )}
        <Authority n={claim.source?.authority} />
      </div>
    </div>
  )
}
