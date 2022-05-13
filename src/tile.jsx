'use strict'

import xs from 'xstream'
import delay from 'xstream/extra/delay'
import { component, ABORT } from 'cyclejs-component'

const model = {
  HIDE: (state, data, next) => {
    if (!state.deleted) return ABORT
    setTimeout(_ => next('DELETE'), 1000)
    return { id: state.id, value: 0, row: state.row, column: state.column, deleted: true, hidden: true }
  },
  DELETE: (state) => undefined
}

function intent({ STATE, DOM }) {
  const state$     = STATE.stream.filter(state => state.deleted && !state.hidden)
  const animation$ = DOM.select('.tile').events('transitionend')
  const hide$      = state$.map(_ => xs.merge(xs.of(null).compose(delay(500)), animation$).take(1)).flatten().debug('HIDE')

  return {
    HIDE: hide$
  }
}

function view({ state }) {
  const { id, value, row, column, hidden } = state
  const classes = `tile tile-${ id } ${ !!state.new ? 'new' : '' }`
  const log2val = Math.log2(state.value || 0)
  const color   = Math.floor(((50 * log2val) / 11) + 30)
  const style   = { '--row': `${row}`, '--col': `${column}`, '--tile-color': `${color}%`, display: !!hidden ? 'none' : 'inherit' }

  return (
    <div className={ classes } id={ `tile-${ id }` } style={ style }>
      { value }
    </div>
  )
}


export default component({ name: 'TILE', model, intent, view })
