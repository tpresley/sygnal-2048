import { run } from '@cycle/run'
import { withState } from '@cycle/state'
import { makeDOMDriver } from '@cycle/dom'
import localStorageDriver from './lib/localStorageDriver'
import App from './app'

const main = withState(App, 'STATE')

const drivers = {
  DOM:   makeDOMDriver('#root'),
  STORE: localStorageDriver,
}

run(main, drivers)
