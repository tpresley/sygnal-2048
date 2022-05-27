'use strict'

import delay from 'xstream/extra/delay'
import { component, classes, xs, ABORT } from 'sygnal'


const TILE_DELETE_DELAY = 1000

export default component({
  name: 'TILE',

  model: {
    // respond to tiles flagged for deletion
    HIDE: (state, data, next) => {
      // abort if the current tile was not flagged for deletion
      if (!state.deleted) return ABORT

      // delay a bit then actually delete the tile
      setTimeout(_ => next('DELETE'), TILE_DELETE_DELAY)

      // update the tile state
      return { id: state.id, value: 0, row: state.row, column: state.column, deleted: true, hidden: true }
    },

    // delete the current tile
    // NOTE: with Cycle.js and Sygnal collection components, setting the state of
    //       an individual item to 'undefined' causes it to be automatically removed
    DELETE: (state) => undefined
  },

  intent: ({ STATE, DOM }) => {
    // filter the tile state for when the tile is marked for deletion, but not yet hidden
    const deleted$   = STATE.stream.filter(state => state.deleted && !state.hidden)

    // listen for CSS animations to complete on the tile
    const animation$ = DOM.select('.tile').events('transitionend')

    // normally you could just use the animation$ stream above, but the CSS 'transitionend' event
    // is not 100% reliable, so the following adds a 'fallback' that fires after 500ms no matter what
    //
    // 1) take events when the tile is marked for deletion
    // 2) create a new stream that fires after 500ms
    // 3) merge the new delayed stream with the animation end events above
    // 4) limit events from the mereged stream to 1, so we only get one event no matter what
    // 5) we are returning a stream from map instead of a value... the .flatten() method fixes this
    //    this is very similar to the .flat() method for arrays which converts [1,2,[3,4,[5,6],7]] -> [1,2,3,4,5,6,7]
    //
    // The resulting stream will normally fire when the CSS transition on the current tile completes
    // but if the transition event fails to fire, then the stream will fire after 500ms
    const hide$ = deleted$
      .map(_ => {
        const delayed$ = xs.of(null).compose(delay(500))
        return xs.merge(delayed$, animation$).take(1)
      })
      .flatten()

    return {
      HIDE: hide$
    }
  },

  view: ({ state }) => {
    const { id, value, row, column, hidden } = state

    // determine the classes to apply to the tile
    const classNames = classes('tile', `tile-${ id }`, { 'new': !!state.new })

    // calculate the tile color based on the current tile value
    const log2val = Math.log2(state.value || 0)
    const color   = Math.floor(((50 * log2val) / 11) + 30)

    // use CSS custom properties to set the location and color of the tile
    const style   = {
      '--row': `       ${row}`,
      '--col': `       ${column}`,
      '--tile-color': `${color}%`,
      display: !!hidden ? 'none' : 'inherit'
    }

    // put it all together and return virtual DOM
    return (
      <div className={ classNames } id={ `tile-${ id }` } style={ style }>
        { value }
      </div>
    )
  }
})
