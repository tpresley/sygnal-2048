'use strict'

import xs from 'xstream'
import { component, collection, ABORT } from 'sygnal'
import { addTile, shift, hasValidMove } from './lib/utils'
import tile from './tile'

const UP    = 'ArrowUp'
const DOWN  = 'ArrowDown'
const LEFT  = 'ArrowLeft'
const RIGTH = 'ArrowRight'

const NEW_TILE_DELAY = 100

const initialState = {
  tiles: [],
  over: false,
  max: 2,
  locked: false,
}


export default component({
  name: 'BOARD',

  initialState,

  calculated: {
    max:  (state) => state.tiles.filter(tile => tile && !tile.deleted).reduce((acc, tile) => (acc > tile.value) ? acc : tile.value, 0),
    lost: (state) => !state.over && state.tiles.filter(tile => !tile.deleted).length === 16 && !hasValidMove(state.tiles)
  },

  model: {

    RESTART:  (state, data, next) => {
      next('ADD_TILE')
      next('ADD_TILE')
      return { ...initialState }
    },

    MOVE:     (state, data, next) => {
      if (state.locked || state.over) return ABORT

      const tiles = shift(state.tiles, data)
      if (!tiles) return ABORT

      setTimeout(_ => {
        next('ADD_TILE')
      }, NEW_TILE_DELAY)
      return { ...state, tiles, locked: true }
    },

    ADD_TILE: (state, data) => {
      const newTiles = addTile(state.tiles)
      return { ...state, tiles: newTiles, locked: false }
    },

    GAME_OVER: (state, data) => ({ ...state, over: true, won: data }),

  },


  intent: ({ STATE, DOM }) => {
    const allKey$   = DOM.select('document').events('keydown').map(e => e.key)
    const keyFilter = (key) => (pressed) => pressed === key

    const up$    = allKey$.filter(keyFilter(UP)).mapTo('UP')
    const down$  = allKey$.filter(keyFilter(DOWN)).mapTo('DOWN')
    const left$  = allKey$.filter(keyFilter(LEFT)).mapTo('LEFT')
    const right$ = allKey$.filter(keyFilter(RIGTH)).mapTo('RIGHT')
    const move$  = xs.merge(up$, down$, left$, right$)

    const won$       = STATE.stream.filter(state => !state.over && state.max === 2048).mapTo(true)
    const lost$      = STATE.stream.filter(state => state.lost === true).mapTo(false)
    const gameOver$  = xs.merge(won$, lost$)
    const restart$   = DOM.select('.restart, .gameover').events('click')

    const firstTile$ = xs.fromArray([1,2])

    return {
      RESTART:   restart$,
      GAME_OVER: gameOver$,
      MOVE:      move$,
      ADD_TILE:  firstTile$,
    }
  },


  view: ({ state, tiles }) => {
    const { max, over, won } = state

    let message = ''
    if (over) {
      message = won ? 'YOU WON!!' : 'Try Again...'
    }

    return (
      <div className='container'>
        <h1>Sygnal 2048</h1>
        <h2>Current Max: { max }</h2>
        <div className="board-container">
          <div className='slot-board'>
            { Array(16).fill().map(_ => <div className="slot"></div>) }
          </div>
          <div className='tile-board'>
            { tiles }
          </div>
          { over && won &&
            <div className="gameover won" >
              <span className="won-message">YOU WON!!</span>
            </div>
          }
          { over && !won &&
            <div className="gameover lost" >
              <span className="lost-message">GAME OVER</span>
            </div>
          }
        </div>
        <div><input type="button" className="restart" value="Start Over" /></div>
      </div>
    )
  },


  children: {
    tiles: collection(tile, 'tiles')
  }

})
