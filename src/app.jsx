'use strict'

import xs from 'xstream'
import { component, collection, ABORT } from 'cyclejs-component'
import tile from './tile'

const UP    = 'ArrowUp'
const DOWN  = 'ArrowDown'
const LEFT  = 'ArrowLeft'
const RIGTH = 'ArrowRight'

const blankTile = {
  id: 0,
  value: 0,
  row: 0,
  column: 0,
}

const initialState = {
  tiles: [],
  over: false,
  won: false,
  max: 0,
  locked: false,
  twos: 0,
  fours: 0,
}



const model = {

  RESTART:  (state, data, next) => {
    next('ADD_TILE')
    next('ADD_TILE')
    return { ...initialState }
  },

  MOVE:     (state, data, next) => {
    if (state.locked || state.over) return ABORT

    const tiles = shift(state.tiles, data)
    if (!tiles) return ABORT

    const max = tiles.filter(tile => tile && !tile.deleted).reduce((acc, tile) => (acc > tile.value) ? acc : tile.value, 0)

    setTimeout(_ => {
      next('ADD_TILE')
      if (max === 2048) next('WON')
    }, 200)
    return { ...state, tiles, max, locked: true }
  },

  ADD_TILE: (state, data, next) => {
    const tiles    = state.tiles
    const newTiles = addTile(tiles)
    if (newTiles.filter(tile => !tile.deleted).length === 16 && !hasValidMove(newTiles)) {
      next('LOST')
    }
    return { ...state, tiles: newTiles, locked: false }
  },

  LOST: (state, data) => ({ ...state, over: true, won: false }),
  WON:  (state, data) => ({ ...state, over: true, won: true  }),

}


function intent({ DOM }) {
  const allKey$   = DOM.select('document').events('keydown').map(e => e.key)
  const keyFilter = (key) => (pressed) => pressed === key

  const up$    = allKey$.filter(keyFilter(UP)).mapTo('UP')
  const down$  = allKey$.filter(keyFilter(DOWN)).mapTo('DOWN')
  const left$  = allKey$.filter(keyFilter(LEFT)).mapTo('LEFT')
  const right$ = allKey$.filter(keyFilter(RIGTH)).mapTo('RIGHT')
  const move$  = xs.merge(up$, down$, left$, right$)

  const restart$   = DOM.select('.restart').events('click')

  const firstTile$ = xs.fromArray(Array(2).fill())

  return {
    RESTART:  restart$,
    MOVE:     move$,
    ADD_TILE: firstTile$,
    LOST:     xs.never(),
    WON:      xs.never(),
  }
}


function view({ state, tiles }) {
  const { max, over, won } = state

  let message = ''
  if (over) {
    message = won ? 'YOU WON!!' : 'Try Again...'
  }

  return (
    <div className='container'>
      <h1>Shameless 2048 Ripoff</h1>
      { message && <h2>{ message }</h2> }
      <h2>Current Max: { max }</h2>
      <div className="board-container">
        <div className='slot-board'>
          { Array(16).fill().map(_ => <div className="slot"></div>) }
        </div>
        <div className='tile-board'>
          { tiles }
        </div>
      </div>
      <div><input type="button" className="restart" value="Start Over" /></div>
    </div>
  )
}


const children = {
  tiles: collection(tile, 'tiles')
}


export default component({ name: 'BOARD', model, intent, view, children, initialState })


let id = 0

function addTile(tiles) {
  const possiblePositions = (new Array(16)).fill().map((_, i) => i)
  const filledPositions   = tiles.filter(tile => !tile.deleted).map(tile => ((tile.row * 4) + tile.column))
  const openPositions     = possiblePositions.filter(pos => !filledPositions.includes(pos))
  if (openPositions.length === 0) return tiles
  const newPositionIndex  = Math.floor(Math.random() * openPositions.length)
  const newPosition       = openPositions[newPositionIndex]
  const column            = newPosition % 4
  const row               = Math.floor(newPosition / 4)
  const value             = Math.ceil(Math.random() * 1000) < 900 ? 2 : 4
  return [ ...tiles, { ...blankTile, id: id++, value, row, column, new: true }]
}


function shift(rawTiles, direction) {
  let outer, inner, from, to, step
  if (direction == 'UP' || direction == 'DOWN') {
    outer = 'column'
    inner = 'row'
  } else {
    outer = 'row'
    inner = 'column'
  }

  if (direction == 'UP' || direction == 'LEFT') {
    from = 0
    to   = 3
    step = 1
  } else {
    from = 3
    to   = 0
    step = -1
  }

  const tiles = rawTiles.filter(tile => !tile.deleted)

  const newTiles = []
  let somethingMoved = false

  for (let oi = 0; oi <= 3; oi++) {
    let previousTile = null
    let pos = from
    for (let ii = from; step == 1 ? ii <= to : ii >= to; ii += step) {
      const tile = tiles.find(tile => tile[outer] === oi && tile[inner] === ii)
      if (tile) {
        const originalPosition = tile[inner]
        tile[inner] = pos
        const newPos = pos
        if (previousTile !== null && !previousTile.merged && tile.value === previousTile.value) {
          const newValue     = tile.value * 2
          tile.value         = newValue
          previousTile.value = newValue
          tile[inner]       -= step
          tile.merged        = true
          somethingMoved     = true
        } else {
          const thisOneMoved = pos !== originalPosition
          somethingMoved = somethingMoved || thisOneMoved
          pos += step
        }
        const newTile = { id: tile.id, value: tile.value, row: tile.row, column: tile.column, merged: tile.merged }
        previousTile = newTile
        newTiles.push(newTile)
      }
    }
  }

  if (somethingMoved) {
    const merged = rawTiles.map(old => newTiles.find(tile => tile.id === old.id) || old)
    merged.forEach(tile => {
      tile.deleted = tile.deleted || tile.merged
      delete tile.merged
    })
    return merged
  }
  return false
}


function hasValidMove(tiles) {
  const copy = tiles.map(tile => ({ ...tile }))
  let up   = shift(copy, 'UP'  )
  let left = shift(copy, 'LEFT')

  if (!up && !left) return false

  return true
}
