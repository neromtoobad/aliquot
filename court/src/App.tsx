import {type SanityConfig} from '@sanity/sdk'
import {SanityApp} from '@sanity/sdk-react'
import {ThemeProvider} from '@sanity/ui'
import {buildTheme} from '@sanity/ui/theme'
import {Court} from './Court'
import {ErrorBoundary} from './ErrorBoundary'
import './App.css'

export const PROJECT_ID = '4wvtii12'
export const DATASET = 'production'

const theme = buildTheme()

export default function App() {
  const config: SanityConfig[] = [{projectId: PROJECT_ID, dataset: DATASET}]
  return (
    <ErrorBoundary>
      <div id="bc-probe" style={{position: 'fixed', bottom: 4, right: 8, fontSize: 10, color: '#a1977f', zIndex: 9}}>Bench Court v2</div>
      <ThemeProvider theme={theme} scheme="light">
        <SanityApp config={config} fallback={<div className="loading">Opening the court…</div>}>
          <ErrorBoundary>
            <Court />
          </ErrorBoundary>
        </SanityApp>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
