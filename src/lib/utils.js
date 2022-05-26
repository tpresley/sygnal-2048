'use strict'

let id = 0

export function addTile(tiles) {
  const possiblePositions = (new Array(16)).fill().map((_, i) => i)
  const filledPositions   = tiles.filter(tile => !tile.deleted).map(tile => ((tile.row * 4) + tile.column))
  const openPositions     = possiblePositions.filter(pos => !filledPositions.includes(pos))
  if (openPositions.length === 0) return tiles
  const newPositionIndex  = Math.floor(Math.random() * openPositions.length)
  const newPosition       = openPositions[newPositionIndex]
  const column            = newPosition % 4
  const row               = Math.floor(newPosition / 4)
  const value             = Math.ceil(Math.random() * 1000) < 900 ? 2 : 4
  return [ ...tiles, { id: id++, value, row, column, new: true }]
}


export function shift(rawTiles, direction) {
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


export function hasValidMove(tiles) {
  const copy = tiles.map(tile => ({ ...tile }))
  let up   = shift(copy, 'UP'  )
  let left = shift(copy, 'LEFT')

  if (!up && !left) return false

  return true
}
