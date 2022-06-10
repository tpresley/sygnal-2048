'use strict'

import { component, classes, delay } from 'sygnal'


const TILE_TRANSITION_DURATION = 100

export default component({
  name: 'TILE',

  model: {
    // delete the current tile
    // NOTE: with Cycle.js and Sygnal collection components, setting the state of
    //       an individual item to 'undefined' causes it to be automatically removed
    DELETE: (state) => undefined
  },

  intent: ({ STATE }) => {
    // filter the tile state for when the tile is marked for deletion
    const markedForDeletion$   = STATE.stream.filter(state => state.deleted)

    // delete this tile after TILE_TRANSITION_DURATION ms (to allow transition to complete)
    const delete$ = markedForDeletion$.compose(delay(TILE_TRANSITION_DURATION))

    return {
      DELETE: delete$
    }
  },

  view: ({ state }) => {
    const { id, value, row, column, deleted } = state

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
      '--duration':   `${TILE_TRANSITION_DURATION}ms`,
      zIndex: deleted ? 10 : 1
    }

    // put it all together and return virtual DOM
    return (
      <div className={ classNames } id={ `tile-${ id }` } style={ style }>
        { value }
      </div>
    )
  }
})
