'use strict'

import xs from 'xstream'
import delay from 'xstream/extra/delay'
import { component, ABORT } from 'sygnal'
import classes from './lib/classses'


const TILE_DELETE_DELAY = 1000

export default component({
  name: 'TILE',

  model: {
    HIDE: (state, data, next) => {
      if (!state.deleted) return ABORT
      setTimeout(_ => next('DELETE'), TILE_DELETE_DELAY)
      return { id: state.id, value: 0, row: state.row, column: state.column, deleted: true, hidden: true }
    },
    DELETE: (state) => undefined
  },

  intent: ({ STATE, DOM }) => {
    const state$     = STATE.stream.filter(state => state.deleted && !state.hidden)
    const animation$ = DOM.select('.tile').events('transitionend')
    const hide$      = state$
      .map(_ => {
        return xs.merge(xs.of(null).compose(delay(500)), animation$).take(1)
      })
      .flatten()

    return {
      HIDE: hide$
    }
  },

  view: ({ state }) => {
    const { id, value, row, column, hidden } = state
    const classNames = classes('tile', `tile-${ id }`, { 'new': !!state.new })
    const log2val = Math.log2(state.value || 0)
    const color   = Math.floor(((50 * log2val) / 11) + 30)
    const style   = {
      '--row': `       ${row}`,
      '--col': `       ${column}`,
      '--tile-color': `${color}%`,
      display: !!hidden ? 'none' : 'inherit'
    }

    return (
      <div className={ classNames } id={ `tile-${ id }` } style={ style }>
        { value }
      </div>
    )
  }
})
