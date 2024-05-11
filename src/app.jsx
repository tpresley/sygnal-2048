import Board from './board'

// add two 2048 boards so we can compare human, ai, and random play at the same time
export default function APP({ state }) {
  return (
    <div className="app">
      <Board state="board1" />
      <div className="vs"> - VS - </div>
      <Board state="board2" />
    </div>
  )
}

APP.initialState = {
  board1: {},
  board2: {},
}