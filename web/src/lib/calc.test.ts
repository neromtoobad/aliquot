import assert from 'node:assert/strict'
import {test} from 'node:test'
import {annealingTemp, dilution, extensionSeconds, pcrProgram, scaleRecipe, type PolymeraseDoc} from './calc.ts'

const taq: PolymeraseDoc = {
  name: 'Taq DNA Polymerase',
  manufacturer: 'NEB',
  initialDenaturation: {tempC: 95, seconds: 30},
  denaturation: {tempC: 95, seconds: 15, secondsMax: 30},
  annealing: {rule: 'Tm −5 °C', offsetC: -5, tempCMin: 45, tempCMax: 68, seconds: 15, secondsMax: 60},
  extension: {tempC: 68, secondsPerKb: 60},
  finalExtension: {tempC: 68, seconds: 300},
  cycles: {min: 25, max: 35},
  reaction: {
    volumeUl: 50,
    components: [
      {name: '10X buffer', volumeUl: 5, finalConc: '1X'},
      {name: '10 mM dNTPs', volumeUl: 1, finalConc: '200 µM'},
      {name: 'Taq', volumeUl: 0.25, finalConc: '1.25 U'},
      {name: 'Nuclease-free water', toVolume: true},
    ],
  },
}

test('extension time scales with product length and never drops below 10 s', () => {
  assert.equal(extensionSeconds(1200, 60), 72)
  assert.equal(extensionSeconds(100, 60), 10)
  assert.equal(extensionSeconds(3000, 30), 90)
})

test('annealing uses the lower primer Tm plus the manufacturer offset, clamped to range', () => {
  assert.equal(annealingTemp(taq, [58, 61]).tempC, 53)
  assert.equal(annealingTemp(taq, [48]).tempC, 45) // 43 → raised to min 45
  assert.equal(annealingTemp(taq).tempC, undefined)
})

test('master mix multiplies by reactions plus overage and fills water to volume', () => {
  const r = pcrProgram(taq, {ampliconBp: 1200, primerTmC: [58, 61], reactions: 12, overagePct: 10})
  assert.equal(r.masterMix.multiplier, 13.2)
  assert.equal(r.masterMix.rows[0].total, '66 µL')
  const water = r.masterMix.rows.find((x) => x.component.startsWith('Nuclease'))!
  assert.equal(water.perReaction, '43.75 µL')
  assert.equal(water.total, '577.5 µL')
  assert.equal(r.program.find((s) => s.step === 'Extension')!.time, '1 min 12 s')
})

test('variable components (template) stay out of the mix and water becomes fill-to-volume', () => {
  const withTemplate: PolymeraseDoc = {...taq, reaction: {volumeUl: 50, components: [...taq.reaction!.components!, {name: 'Template DNA'}]}}
  const r = pcrProgram(withTemplate, {ampliconBp: 500, reactions: 4})
  const tpl = r.masterMix.rows.find((x) => x.component === 'Template DNA')!
  assert.equal(tpl.total, 'add to each tube')
  const water = r.masterMix.rows.find((x) => x.component.startsWith('Nuclease'))!
  assert.equal(water.perReaction, 'to 50 µL')
  assert.equal(water.inMix, false)
})

test('recipes scale by volume ratio', () => {
  const lb = {name: 'LB Miller', yield: {value: 1, unit: 'L'}, components: [{name: 'NaCl', amount: {value: 10, unit: 'g'}}]}
  const r = scaleRecipe(lb, {value: 500, unit: 'mL'})
  assert.ok(!('error' in r))
  if (!('error' in r)) assert.equal(r.components[0].scaled, '5 g')
})

test('dilutions convert units and refuse impossible ones', () => {
  const d = dilution({value: 50, unit: 'X'}, {value: 1, unit: 'X'}, {value: 1, unit: 'L'})
  assert.equal('takeStock' in d && d.takeStock, '0.02 L')
  const m = dilution({value: 1, unit: 'M'}, {value: 100, unit: 'mM'}, {value: 10, unit: 'mL'})
  assert.equal('takeStock' in m && m.takeStock, '1 mL')
  assert.ok('error' in dilution({value: 1, unit: 'M'}, {value: 1, unit: '%'}, {value: 1, unit: 'mL'}))
  assert.ok('error' in dilution({value: 1, unit: 'mM'}, {value: 1, unit: 'M'}, {value: 1, unit: 'mL'}))
})
